const { contributionCycleStartsEmail } = require("../middleware/emailTemplate");
const DailyInterest = require("../models/DailyInterest");
const Subscription = require("../models/Subscription");
const User = require("../models/User");
const { sendEmail } = require("./brevo");
const cron = require("node-cron");
const moment = require("moment");

cron.schedule("0 8 * * *", async () => {
  const activeSubscriptions = await Subscription.find({
    status: "active",
  });

  for (const subscription of activeSubscriptions) {
    try {
      const user = await User.findById(subscription.user);
      if (!user) continue;

      const now = new Date();
      const subscriptionStartTime = moment(
        subscription.subscriptionDate
      ).toDate();

      const lastBonusTime = subscription.lastBonusAt || subscriptionStartTime;

      const nextBonusTime = new Date(lastBonusTime);
      nextBonusTime.setDate(nextBonusTime.getDate() + 1);

      const endDate = new Date(subscription.endDate);
      const timeUntilEnd = endDate.getTime() - now.getTime();
      const isLastDay = timeUntilEnd <= 24 * 60 * 60 * 1000 && timeUntilEnd > 0;

      // Reminder email
      if (isLastDay && !subscription.isSubscriptionRecycle) {
        subscription.isSubscriptionRecycle = true;
        await subscription.save();
        sendEmail({
          email: user.email,
          subject: "Contribution Cycle Starting Soon",
          html: contributionCycleStartsEmail(user, subscription),
        });
      }

      const isSameDay = moment(nextBonusTime).isSame(now, "day");

      // Daily bonus
      if (!isLastDay && isSameDay) {
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

      // Expire subscription
      if (now >= subscription.endDate) {
        subscription.status = "expired";
        await subscription.save();
      }
    } catch (error) {
      console.log("Cron job error", error?.message);
    }
  }
});
