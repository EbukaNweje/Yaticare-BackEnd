const User = require("../models/User");
const Subscription = require("../models/Subscription");
const Bonus = require("../models/Bonus");
const DailyInterest = require("../models/DailyInterest");
const historyModel = require("../models/History");
const mongoose = require("mongoose");
const {
  subscriptionCreatedEmail,
  referralCommissionEmail,
  contributionCycleStartsEmail,
  subscriptionRecycledEmail,
  recurringReferralBonusEmail,
  firstTimeReferralBonusEmail,
  planUpgradedEmail,
} = require("../middleware/emailTemplate");
const { sendEmail } = require("../utilities/brevo");
const AuditLog = require("../models/AuditLog");
const Plan = require("../models/plansModel");

function addDays(date, days) {
  if (!(date instanceof Date) || isNaN(date.getTime())) date = new Date();
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// helper: check same calendar day
function isSameDay(dateA, dateB) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

exports.createSubscription = async (req, res) => {
  try {
    const { userId, plan, amount, durationInDays, subscriptionDate, planName } =
      req.body;
    if (!userId || !plan || !planName || !amount || !durationInDays)
      return res.status(400).json({ message: "Missing required fields" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const selectedPlan = await Plan.findOne({ planName: planName });
    if (!selectedPlan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    if (user.accountBalance < amount)
      return res.status(400).json({ message: "Insufficient balance" });
    // ✅ Get user's most recent subscription

    // ❌ Max subscription limit
    const MAX_SUBSCRIPTION_AMOUNT = 10000;

    if (amount > MAX_SUBSCRIPTION_AMOUNT) {
      return res.status(400).json({
        message: `Maximum subscription amount is $${MAX_SUBSCRIPTION_AMOUNT}`,
      });
    }

    // Plan-specific max limit
    if (amount > selectedPlan.maximumDeposit) {
      return res.status(400).json({
        message: `Amount exceeds the maximum allowed for ${planName}. Max is $${selectedPlan.maximumDeposit}`,
      });
    }

    if (amount < selectedPlan.minimumDeposit) {
      return res.status(400).json({
        message: `Minimum deposit for ${planName} plan is $${selectedPlan.minimumDeposit}`,
      });
    }

    const lastSubscription = await Subscription.findOne({ user: userId })
      .sort({ createdAt: -1 })
      .lean();

    if (lastSubscription && amount < lastSubscription.amount) {
      return res.status(400).json({
        message: `You cannot create a new plan with an amount less than your previous plan of $${lastSubscription.amount}`,
      });
    }

    // Always start subscriptions immediately, ignore any future dates from frontend
    const startDate = new Date();

    // Log if a future date was attempted
    if (subscriptionDate) {
      const parsedSubscriptionDate = new Date(subscriptionDate);
      if (parsedSubscriptionDate > startDate) {
        console.log(
          `Warning: Future subscription date ${subscriptionDate} ignored, using current date instead`,
        );
      }
    }
    const endDate = addDays(startDate, durationInDays);

    // Deduct subscription amount
    user.accountBalance -= amount;

    // Create subscription
    const newSubscription = new Subscription({
      user: userId,
      plan,
      amount,
      startDate,
      endDate,
      subscriptionDate: startDate,
      showDate: subscriptionDate,
      lastBonusAt: null,
      daysPaid: 0,
      durationInDays,
      status: "active",
    });

    // Referral bonus
    const referrer = await User.findOne({ "inviteCode.userInvited": user._id });
    const lastSub = await Subscription.findOne({ user: userId }).sort({
      createdAt: -1,
    });
    const isFirstSubscription = !lastSub;
    if (referrer) {
      const bonusRate = isFirstSubscription ? 0.15 : 0.005;
      const bonusAmount = amount * bonusRate;

      referrer.accountBalance += bonusAmount;
      referrer.inviteCode.bonusAmount =
        (referrer.inviteCode.bonusAmount || 0) + bonusAmount;

      const bonus = new Bonus({
        user: referrer._id,
        amount: bonusAmount,
        reason: isFirstSubscription
          ? "First Time Referral Bonus"
          : "Recurring Referral Bonus",
        date: new Date().toLocaleString(),
      });
      await bonus.save();
      referrer.userTransactionTotal.bonusHistoryTotal =
        (referrer.userTransactionTotal.bonusHistoryTotal || 0) + bonusAmount;
      referrer.userTransaction.bonusHistory =
        referrer.userTransaction.bonusHistory || [];
      referrer.userTransaction.bonusHistory.push(bonus._id);
      await referrer.save();

      sendEmail({
        email: referrer.email,
        subject: isFirstSubscription
          ? "First-Time Referral Bonus Earned"
          : "Recurring Referral Bonus Earned",
        html: referralCommissionEmail(referrer, bonusAmount),
      });
    }

    // Save subscription and user
    await newSubscription.save();
    user.isSubscribed = true;
    user.userSubscription = user.userSubscription || [];
    user.userSubscription.push(newSubscription._id);
    user.userTransaction = user.userTransaction || {};
    user.userTransaction.subscriptionsHistory =
      user.userTransaction.subscriptionsHistory || [];
    user.userTransaction.subscriptionsHistory.push(newSubscription._id);
    await user.save();

    // Send confirmation email
    sendEmail({
      email: user.email,
      subject: "Subscription Created Successfully",
      html: subscriptionCreatedEmail(user, newSubscription),
    });

    await AuditLog.create({
      type: "CREATE_SUBSCRIPTION",
      user: user._id,
      subscription: newSubscription._id,
      message: `Subscription created for ${amount} for ${durationInDays} days.`,
    });

    res.status(201).json({
      message: "Subscription created",
      subscription: newSubscription,
      newBalance: user.accountBalance,
    });
  } catch (err) {
    console.error("Error creating subscription:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.recycleSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    if (!subscriptionId)
      return res.status(400).json({ message: "subscriptionId required" });

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription)
      return res.status(404).json({ message: "Subscription not found" });

    const user = await User.findById(subscription.user);
    if (!user) return res.status(404).json({ message: "User not found" });

    const now = new Date();

    /** --------------------------------
     *  Recycle eligibility
     --------------------------------- */
    const secondToLastDay = addDays(subscription.endDate, -1);
    const canRecycle =
      isSameDay(secondToLastDay, now) || now >= subscription.endDate;

    if (!canRecycle) {
      return res.status(400).json({
        message:
          "You can only recycle on the second-to-last day or after expiration",
      });
    }

    /** --------------------------------
     *  Prevent double recycle
     --------------------------------- */
    if (!subscription.isSubscriptionRecycle) {
      return res.status(400).json({
        message: "This subscription has already been recycled",
      });
    }

    /** --------------------------------
     *  Balance check
     --------------------------------- */
    if (user.accountBalance < subscription.amount) {
      return res.status(400).json({
        message: "Insufficient balance to recycle subscription",
      });
    }

    /** --------------------------------
     *  Deduct subscription amount
     --------------------------------- */
    user.accountBalance -= subscription.amount;

    /** --------------------------------
     *  Transaction history (debit)
     --------------------------------- */
    const history = new historyModel({
      userId: user._id,
      transactionType: "Subscription recycled",
      amount: subscription.amount,
    });
    await history.save();

    user.userTransactionTotal.totalSpent =
      (user.userTransactionTotal.totalSpent || 0) + subscription.amount;

    /** --------------------------------
     *  Restart THIS subscription
     --------------------------------- */
    const duration = subscription.durationInDays || 7;
    const newStart = now;
    const newEnd = addDays(newStart, duration);

    subscription.startDate = newStart;
    subscription.endDate = newEnd;
    subscription.subscriptionDate = newStart;
    subscription.showDate = newStart.toLocaleString();

    subscription.daysPaid = 0;
    subscription.lastBonusAt = null;
    subscription.status = "active";
    subscription.isPaused = false;
    subscription.mustRecycle = false;

    // ONLY this flag changes
    subscription.isSubscriptionRecycle = false;

    await subscription.save();
    await user.save();

    /** --------------------------------
     *  Referral commission (0.5%)
     --------------------------------- */
    const referrer = await User.findOne({
      "inviteCode.userInvited": user._id,
    });

    if (referrer) {
      const commission = subscription.amount * 0.005;

      referrer.accountBalance += commission;
      referrer.inviteCode.bonusAmount =
        (referrer.inviteCode.bonusAmount || 0) + commission;

      const bonus = new Bonus({
        user: referrer._id,
        amount: commission,
        reason: "Recycle Bonus",
        date: now.toLocaleString(),
      });
      await bonus.save();

      referrer.userTransaction.bonusHistory =
        referrer.userTransaction.bonusHistory || [];
      referrer.userTransaction.bonusHistory.push(bonus._id);

      referrer.userTransactionTotal.bonusHistoryTotal =
        (referrer.userTransactionTotal.bonusHistoryTotal || 0) + commission;

      await referrer.save();
    }

    /** --------------------------------
     *  Notifications
     --------------------------------- */
    sendEmail({
      email: user.email,
      subject: "Subscription Recycled & Restarted",
      html: subscriptionRecycledEmail(user, subscription),
    });

    return res.status(200).json({
      message: "Subscription recycled and restarted successfully",
      subscription,
      balance: user.accountBalance,
    });
  } catch (err) {
    console.error("Recycle error:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.getUserSubscriptions = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    // Fetch subscriptions and populate plan details if needed
    // console.log("Fetching subscriptions for user:", userId);
    const subscriptions = await Subscription.find({ user: userId }).populate(
      "plan",
    );
    // console.log("Subscriptions fetched:", subscriptions);

    if (!subscriptions.length) {
      return res
        .status(404)
        .json({ message: "No subscriptions found for this user" });
    }

    res.status(200).json({
      message: "User subscriptions retrieved successfully",
      count: subscriptions.length,
      subscriptions,
    });
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getAllSubscriptions = async (req, res) => {
  try {
    const allSubscription = await Subscription.find();

    res.status(200).json({
      message: "All Subscriptions",
      data: allSubscription,
    });
  } catch (err) {
    res.status(500).json({ message: err });
  }
};

exports.upgradePlan = async (req, res) => {
  try {
    const { subscriptionId, newPlanId, newAmount } = req.body;

    // Validate required fields
    if (!subscriptionId || !newPlanId || !newAmount) {
      return res.status(400).json({
        message:
          "Missing required fields: subscriptionId, newPlanId, newAmount",
      });
    }

    // Find current subscription
    const currentSubscription =
      await Subscription.findById(subscriptionId).populate("plan");
    if (!currentSubscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    // Find user
    const user = await User.findById(currentSubscription.user);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find new plan
    const newPlan = await Plan.findById(newPlanId);
    if (!newPlan) {
      return res.status(404).json({ message: "New plan not found" });
    }

    // Validate new amount is greater than current amount
    if (newAmount <= currentSubscription.amount) {
      return res.status(400).json({
        message: `Upgrade amount ($${newAmount}) must be greater than current subscription amount ($${currentSubscription.amount})`,
      });
    }

    // Validate new amount against plan limits
    if (newAmount > newPlan.maximumDeposit) {
      return res.status(400).json({
        message: `Amount exceeds the maximum allowed for ${newPlan.planName}. Max is $${newPlan.maximumDeposit}`,
      });
    }

    if (newAmount < newPlan.minimumDeposit) {
      return res.status(400).json({
        message: `Amount is below the minimum required for ${newPlan.planName}. Min is $${newPlan.minimumDeposit}`,
      });
    }

    // Calculate the difference (additional amount needed)
    const upgradeDifference = newAmount - currentSubscription.amount;

    // Check if user has sufficient balance for the upgrade
    if (user.accountBalance < upgradeDifference) {
      return res.status(400).json({
        message: `Insufficient balance to upgrade. You need $${upgradeDifference} but only have $${user.accountBalance}`,
      });
    }

    // Deduct the upgrade difference from user's balance
    user.accountBalance -= upgradeDifference;

    // Update subscription with new plan details
    const oldAmount = currentSubscription.amount;
    currentSubscription.plan = newPlanId;
    currentSubscription.amount = newAmount;
    currentSubscription.status = "active";

    // Reset subscription timeline if upgrading to a different duration plan
    if (
      newPlan.durationDays &&
      newPlan.durationDays !== currentSubscription.durationInDays
    ) {
      const now = new Date();
      currentSubscription.startDate = now;
      currentSubscription.endDate = addDays(now, newPlan.durationDays);
      currentSubscription.durationInDays = newPlan.durationDays;
      currentSubscription.daysPaid = 0;
      currentSubscription.lastBonusAt = null;
      currentSubscription.mustRecycle = false;
      currentSubscription.isPaused = false;
      currentSubscription.isSubscriptionRecycle = true;
    }

    // Save updated subscription
    await currentSubscription.save();
    await user.save();

    // Log upgrade in audit log
    await AuditLog.create({
      type: "UPGRADE_PLAN",
      user: user._id,
      subscription: currentSubscription._id,
      message: `Plan upgraded from $${oldAmount} to $${newAmount} on plan ${newPlan.planName}. Difference charged: $${upgradeDifference}`,
    });

    // Send upgrade confirmation email
    sendEmail({
      email: user.email,
      subject: "Plan Upgraded Successfully",
      html: planUpgradedEmail(
        user,
        oldAmount,
        newAmount,
        upgradeDifference,
        newPlan.planName,
      ),
    });

    res.status(200).json({
      message: "Plan upgraded successfully",
      subscription: currentSubscription,
      upgradedAmount: upgradeDifference,
      newBalance: user.accountBalance,
      oldAmount,
      newAmount,
    });
  } catch (err) {
    console.error("Error upgrading plan:", err);
    res.status(500).json({ message: err.message });
  }
};
