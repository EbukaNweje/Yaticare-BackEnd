const User = require("../models/User");
const Subscription = require("../models/Subscription");
const cron = require("node-cron");
const Bonus = require("../models/Bonus");
const DailyInterest = require("../models/DailyInterest");

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

    await newSubscription.save();

    user.userSubscription.push(newSubscription._id);
    user.userTransaction.subscriptionsHistory.push(newSubscription._id);

    // 🎁 Referral Bonus Logic
    const referrer = await User.findOne({
      "inviteCode.userInvited": user._id,
    });

    if (referrer) {
      const bonusAmount = amount * 0.05;
      referrer.accountBalance += bonusAmount;

      const bonus = new Bonus({
        user: referrer._id,
        amount: bonusAmount,
        reason: "Referral Bonus",
      });

      await bonus.save();
      referrer.userTransaction.bonusHistory.push(bonus._id);
      await referrer.save();
    }

    await user.save();

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

      if (user) {
        const dailyBonus = subscription.amount * 0.2;
        user.accountBalance += dailyBonus;

        const interest = new DailyInterest({
          user: user._id,
          subscription: subscription._id,
          amount: dailyBonus,
        });

        await interest.save();
        user.userTransaction.dailyInterestHistory.push(interest._id);
        await user.save();
      }

      const currentDate = new Date();
      const oneDayBeforeEnd = new Date(subscription.endDate);
      oneDayBeforeEnd.setDate(oneDayBeforeEnd.getDate() - 1);

      if (
        currentDate.toDateString() === oneDayBeforeEnd.toDateString() &&
        subscription.status === "active"
      ) {
        console.log(
          `Notify user ${subscription.user} to recycle their subscription.`
        );
      }

      if (currentDate >= subscription.endDate) {
        subscription.status = "expired";
        await subscription.save();
      }
    }
  } catch (error) {
    console.error("Error in daily subscription task:", error.message);
  }
});

exports.recycleSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.body;

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) return res.status(404).json({ message: "Not found" });

    const currentDate = new Date();
    const oneDayBeforeEnd = new Date(subscription.endDate);
    oneDayBeforeEnd.setDate(oneDayBeforeEnd.getDate() - 1);

    if (
      subscription.status !== "expired" &&
      currentDate.toDateString() !== oneDayBeforeEnd.toDateString()
    ) {
      return res.status(400).json({
        message: "Can only recycle on second-to-last day or after expiration",
      });
    }

    const durationInDays = Math.ceil(
      (subscription.endDate - subscription.startDate) / (1000 * 60 * 60 * 24)
    );

    const newEndDate = new Date();
    newEndDate.setDate(newEndDate.getDate() + durationInDays);

    subscription.startDate = new Date();
    subscription.endDate = newEndDate;
    subscription.status = "active";

    await subscription.save();

    // 💸 0.5% Commission to Referrer
    const user = await User.findById(subscription.user);
    const referrer = await User.findOne({
      "inviteCode.userInvited": user._id,
    });

    if (referrer) {
      const commission = subscription.amount * 0.005;
      referrer.accountBalance += commission;
      await referrer.save();
    }

    res.status(200).json({
      message: "Subscription recycled successfully",
      subscription,
    });
  } catch (error) {
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
    const subscriptions = await Subscription.find({ user: userId }).populate(
      "plan"
    );
    console.log(subscriptions);

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
