const User = require("../models/User");
const Subscription = require("../models/Subscription");
const Bonus = require("../models/Bonus");
const DailyInterest = require("../models/DailyInterest");
const mongoose = require("mongoose");
const {
  subscriptionCreatedEmail,
  referralCommissionEmail,
  contributionCycleStartsEmail,
  subscriptionRecycledEmail,
  recurringReferralBonusEmail,
  firstTimeReferralBonusEmail,
} = require("../middleware/emailTemplate");
const { sendEmail } = require("../utilities/brevo");
const AuditLog = require("../models/AuditLog");

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
    const { userId, plan, amount, durationInDays, subscriptionDate } = req.body;
    if (!userId || !plan || !amount || !durationInDays)
      return res.status(400).json({ message: "Missing required fields" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.accountBalance < amount)
      return res.status(400).json({ message: "Insufficient balance" });
    // ✅ Check last subscription amount
    const lastuserSub = await Subscription.findOne({ user: userId }).sort({
      createdAt: -1,
    });
    if (lastuserSub && amount < lastuserSub.amount) {
      return res.status(400).json({
        message: `You cannot subscribe with an amount less than your last subscription of $${lastuserSub.amount}`,
      });
    }

    const parsedSubscriptionDate = subscriptionDate
      ? new Date(subscriptionDate)
      : new Date();
    const startDate = isNaN(parsedSubscriptionDate.getTime())
      ? new Date()
      : parsedSubscriptionDate;
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
    const { subscriptionId } = req.body;
    if (!subscriptionId)
      return res.status(400).json({ message: "subscriptionId required" });

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription)
      return res.status(404).json({ message: "Subscription not found" });

    const user = await User.findById(subscription.user);
    if (!user) return res.status(404).json({ message: "User not found" });

    const now = new Date();
    const secondToLast = addDays(subscription.endDate, -1);
    const isSecondToLastDay = isSameDay(secondToLast, now);
    const isExpired =
      subscription.status === "expired" || now >= subscription.endDate;

    if (!isSecondToLastDay && !isExpired)
      return res.status(400).json({
        message:
          "You can only recycle on the second-to-last day or after expiration.",
      });

    // Pay missed day7 interest if needed
    if (subscription.daysPaid >= 6 && subscription.isPaused) {
      const dailyBonus = subscription.amount * 0.2;
      user.accountBalance += dailyBonus;
      user.userTransactionTotal.dailyInterestHistoryTotal =
        (user.userTransactionTotal.dailyInterestHistoryTotal || 0) + dailyBonus;

      const interest = new DailyInterest({
        user: user._id,
        subscription: subscription._id,
        amount: dailyBonus,
        date: now.toLocaleString(),
      });
      await interest.save();
      user.userTransaction.dailyInterestHistory =
        user.userTransaction.dailyInterestHistory || [];
      user.userTransaction.dailyInterestHistory.push(interest._id);

      subscription.daysPaid += 1;
      subscription.isPaused = false;
      subscription.mustRecycle = false;
      subscription.lastBonusAt = now;

      await user.save();
    }

    // Restart subscription cycle
    const duration = subscription.durationInDays || 7;
    const newStart = new Date();
    const newEnd = addDays(newStart, duration);

    subscription.startDate = newStart;
    subscription.endDate = newEnd;
    subscription.subscriptionDate = newStart;
    subscription.showDate = newStart.toLocaleString();
    subscription.daysPaid = 0;
    subscription.lastBonusAt = null;
    subscription.status = "active";
    subscription.mustRecycle = false;
    subscription.isPaused = false;
    subscription.isSubscriptionRecycle = true;

    await subscription.save();

    // Referral commission for recycle (0.5%)
    const referrer = await User.findOne({ "inviteCode.userInvited": user._id });
    if (referrer) {
      const commission = subscription.amount * 0.005;
      referrer.accountBalance += commission;
      referrer.inviteCode.bonusAmount =
        (referrer.inviteCode.bonusAmount || 0) + commission;

      const bonus = new Bonus({
        user: referrer._id,
        amount: commission,
        reason: "Recycle Bonus",
        date: new Date().toLocaleString(),
      });
      await bonus.save();
      referrer.userTransaction.bonusHistory =
        referrer.userTransaction.bonusHistory || [];
      referrer.userTransaction.bonusHistory.push(bonus._id);
      referrer.userTransactionTotal.bonusHistoryTotal =
        (referrer.userTransactionTotal.bonusHistoryTotal || 0) + commission;
      await referrer.save();

      sendEmail({
        email: referrer.email,
        subject: "Referral Commission Earned",
        html: referralCommissionEmail(referrer, commission),
      });
    }

    sendEmail({
      email: user.email,
      subject: "Subscription Recycled Successfully",
      html: subscriptionRecycledEmail(user, subscription),
    });

    res
      .status(200)
      .json({ message: "Subscription recycled successfully", subscription });
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
      "plan"
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
