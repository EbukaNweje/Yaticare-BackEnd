const User = require("../models/User");
const Subscription = require("../models/Subscription");
const cron = require("node-cron");
const Bonus = require("../models/Bonus");
const DailyInterest = require("../models/DailyInterest");
const mongoose = require("mongoose");
const {
  subscriptionCreatedEmail,
  referralCommissionEmail,
  contributionCycleStartsEmail,
  subscriptionRecycledEmail,
} = require("../middleware/emailTemplate");
const { sendEmail } = require("../utilities/brevo");

exports.createSubscription = async (req, res) => {
  try {
    const { userId, plan, amount, durationInDays, subscriptionDate } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.accountBalance < amount)
      return res.status(400).json({ message: "Insufficient balance" });

    user.accountBalance -= amount;

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationInDays);

    const newSubscription = new Subscription({
      user: userId,
      plan,
      amount,
      endDate,
      status: "active",
      subscriptionDate,
    });

    // Debugging logs to verify user and referrer
    // console.log("Creating subscription for user:", user);

    // Check if the user creating the subscription has any existing subscriptions
    const userSubscriptions = await Subscription.find({ user: userId });
    const isFirstSubscription = userSubscriptions.length === 0;

    if (!isFirstSubscription) {
      const lastSub = await Subscription.findOne({ user: userId }).sort({
        subscriptionDate: -1,
      });

      if (lastSub && amount < lastSub.amount) {
        return res.status(400).json({
          message: `You cannot subscribe with an amount less than your last subscription of $${lastSub.amount}`,
        });
      }
    }
    // 🎁 Referral Bonus Logic
    const referrer = await User.findOne({
      "inviteCode.userInvited": user._id,
    });
    // console.log("Referrer:", referrer);

    if (referrer) {
      // Set bonus rate based on the user's subscription history
      const bonusRate = isFirstSubscription ? 0.15 : 0.005;
      const bonusAmount = amount * bonusRate;

      referrer.accountBalance += bonusAmount;
      referrer.inviteCode.bonusAmount =
        (referrer.inviteCode.bonusAmount || 0) + bonusAmount;
      // const date = new Date().toLocaleString();

      const bonus = new Bonus({
        user: referrer._id,
        amount: bonusAmount,
        reason: isFirstSubscription
          ? "First Time Referral Bonus"
          : "Recurring Referral Bonus",
        date: subscriptionDate,
      });

      await bonus.save();
      referrer.userTransactionTotal.bonusHistoryTotal += bonusAmount;
      referrer.userTransaction.bonusHistory.push(bonus._id);
      await referrer.save();
      const emailDetails = {
        email: referrer.email,
        subject: "Referral Commission Earned",
        html: referralCommissionEmail(user, bonusAmount),
      };
      sendEmail(emailDetails);
    }

    // Save the subscription and user
    await newSubscription.save();
    user.isSubscribed = true;
    user.userSubscription.push(newSubscription._id);
    user.userTransaction.subscriptionsHistory.push(newSubscription._id);
    await user.save();

    const emailDetails = {
      email: user.email,
      subject: "Subscription Created Successfully",
      html: subscriptionCreatedEmail(user, newSubscription),
    };
    sendEmail(emailDetails);

    res.status(201).json({
      message: "Subscription created successfully",
      subscription: newSubscription,
      newBalance: user.accountBalance,
    });
  } catch (error) {
    console.error("Error creating subscription:", error);
    res.status(500).json({ message: error.message });
  }
};
cron.schedule("0 0 * * *", async () => {
  try {
    const activeSubscriptions = await Subscription.find({ status: "active" });

    for (const subscription of activeSubscriptions) {
      const user = await User.findById(subscription.user);
      if (!user) continue;

      const now = new Date();

      // Parse subscriptionDate safely
      const subscriptionStartTime = moment(
        subscription.subscriptionDate,
        "M/D/YYYY, h:mm:ss A"
      ).toDate();
      const lastBonusTime = subscription.lastBonusAt || subscriptionStartTime;
      const hoursSinceLastBonus = (now - new Date(lastBonusTime)) / 3600000;

      // Calculate one day before end
      const oneDayBeforeEnd = new Date(subscription.endDate);
      oneDayBeforeEnd.setDate(oneDayBeforeEnd.getDate() - 1);
      const isLastDay = now.toDateString() === oneDayBeforeEnd.toDateString();

      // ✅ Send reminder email one day before expiration
      if (isLastDay && !subscription.isSubscriptionRecycle) {
        const emailDetails = {
          email: user.email,
          subject: "Subscription Created Successfully",
          html: contributionCycleStartsEmail(user, subscription),
        };
        sendEmail(emailDetails);

        subscription.isSubscriptionRecycle = true;
        await subscription.save();
      }

      // ✅ Add daily bonus if not on last day
      if (!isLastDay && hoursSinceLastBonus >= 24) {
        const dailyBonus = subscription.amount * 0.2;
        user.accountBalance += dailyBonus;
        user.userTransactionTotal.dailyInterestHistoryTotal += dailyBonus;

        const interest = new DailyInterest({
          user: user._id,
          subscription: subscription._id,
          amount: dailyBonus,
          date: now.toLocaleString(),
        });

        await interest.save();
        user.userTransaction.dailyInterestHistory.push(interest._id);
        await user.save();

        subscription.lastBonusAt = now;
        await subscription.save();
      }

      // ✅ Expire subscription if end date reached
      if (now >= subscription.endDate) {
        subscription.status = "expired";
        await subscription.save();
      }
    }

    console.log("✅ Daily subscription cron job completed.");
  } catch (error) {
    console.error("❌ Cron job error:", error.message);
  }
});

exports.recycleSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.body;

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription)
      return res.status(404).json({ message: "Subscription not found" });

    const currentDate = new Date();
    const oneDayBeforeEnd = new Date(subscription.endDate);
    oneDayBeforeEnd.setDate(oneDayBeforeEnd.getDate() - 1);

    const isSecondToLastDay =
      currentDate.toDateString() === oneDayBeforeEnd.toDateString();
    const isExpired = subscription.status === "expired";

    if (!isExpired && !isSecondToLastDay) {
      return res.status(400).json({
        message:
          "You can only recycle on the second-to-last day or after expiration.",
      });
    }

    // Calculate original duration
    const durationInDays = Math.ceil(
      (new Date(subscription.endDate) - new Date(subscription.startDate)) /
        (1000 * 60 * 60 * 24)
    );

    // Reset subscription period
    const newStartDate = new Date();
    const newEndDate = new Date();
    newEndDate.setDate(newStartDate.getDate() + durationInDays);

    subscription.startDate = newStartDate;
    subscription.endDate = newEndDate;
    subscription.status = "active";
    subscription.isSubscriptionRecycle = true;
    subscription.lastBonusAt = null; // Reset bonus tracking

    await subscription.save();

    // 💸 0.5% Commission to Referrer
    const user = await User.findById(subscription.user);
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
      referrer.userTransaction.bonusHistory.push(bonus._id);
      referrer.userTransactionTotal.bonusHistoryTotal += commission;
      await referrer.save();

      const emailDetails = {
        email: user.email,
        subject: "Referral Commission Earned",
        html: referralCommissionEmail(user, commission),
      };

      sendEmail(emailDetails);
    }

    const emailDetails = {
      email: user.email,
      subject: "Subscription Recycled Successfully",
      html: subscriptionRecycledEmail(user, subscription),
    };

    sendEmail(emailDetails);

    res.status(200).json({
      message: "Subscription recycled successfully",
      subscription,
    });
  } catch (error) {
    console.error("Recycle error:", error);
    res.status(500).json({ message: error.message });
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

// exports.getOneSubscription = async (req, res) => {
//   try {
//     const { subscriptionId } = req.params;

//     // Validate subscriptionId format
//     if (!mongoose.Types.ObjectId.isValid(subscriptionId)) {
//       return res
//         .status(400)
//         .json({ message: "Invalid subscription ID format" });
//     }

//     // Fetch the subscription and populate plan details
//     const subscription = await Subscription.findById(subscriptionId).populate(
//       "plan"
//     );

//     if (!subscription) {
//       return res.status(404).json({ message: "Subscription not found" });
//     }

//     res.status(200).json({
//       message: "Subscription retrieved successfully",
//       subscription,
//     });
//   } catch (error) {
//     console.error("Error fetching subscription:", error);
//     res.status(500).json({ message: error });
//   }
// };

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
