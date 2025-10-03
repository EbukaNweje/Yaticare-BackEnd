const User = require("../models/User");
const Subscription = require("../models/Subscription");
const cron = require("node-cron");

exports.createSubscription = async (req, res) => {
  try {
    const { userId, plan, amount, durationInDays } = req.body;

    // 1. Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2. Check balance
    if (user.accountBalance < amount) {
      throw res.status(400).json({ message: "Insufficient balance" });
    }

    // 3. Deduct balance
    user.accountBalance -= amount;
    await user.save();

    // 4. Calculate subscription end date
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationInDays);

    // 5. Create subscription with status = active
    const newSubscription = new Subscription({
      user: userId,
      plan,
      amount,
      endDate,
      status: "active", // ✅ force active
    });

    await newSubscription.save();

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

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    const currentDate = new Date();
    const oneDayBeforeEnd = new Date(subscription.endDate);
    oneDayBeforeEnd.setDate(oneDayBeforeEnd.getDate() - 1);

    if (
      subscription.status !== "expired" &&
      currentDate.toDateString() !== oneDayBeforeEnd.toDateString()
    ) {
      return res.status(400).json({
        message:
          "Subscription can only be recycled on the second-to-last day or after expiration",
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

    const subscriptions = await Subscription.find({ user: userId });

    if (!subscriptions || subscriptions.length === 0) {
      return res
        .status(404)
        .json({ message: "No subscriptions found for this user" });
    }

    res.status(200).json({
      message: "User subscriptions retrieved successfully",
      subscriptions,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
