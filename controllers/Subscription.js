const Subscription = require("../models/Subscription");
const User = require("../models/User");
const cron = require("node-cron");

exports.createSubscription = async (req, res) => {
  try {
    const { userId, plan, amount, durationInDays } = req.body;

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationInDays);

    const newSubscription = new Subscription({
      user: userId,
      plan,
      amount,
      endDate,
    });

    await newSubscription.save();

    res.status(201).json({
      message: "Subscription created successfully",
      subscription: newSubscription,
    });
  } catch (error) {
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
