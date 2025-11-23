const { contributionCycleStartsEmail } = require("../middleware/emailTemplate");
const DailyInterest = require("../models/DailyInterest");
const Subscription = require("../models/Subscription");
const User = require("../models/User");
const { sendEmail } = require("./brevo");
const cron = require("node-cron");
const moment = require("moment");

cron.schedule("0 8 * * *", async () => {
  console.log("\n=== DAILY INTEREST CRON START ===");
  console.log("Server Time:", new Date().toLocaleString());
  console.log("Timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);

  const activeSubscriptions = await Subscription.find({ status: "active" });

  for (const subscription of activeSubscriptions) {
    try {
      const user = await User.findById(subscription.user);
      if (!user) continue;

      const now = moment(); // cleaner
      const startDate = moment(subscription.subscriptionDate);
      const lastBonus = subscription.lastBonusAt
        ? moment(subscription.lastBonusAt)
        : startDate;

      // Next interest time
      const nextBonusTime = lastBonus.clone().add(1, "day");

      const endDate = moment(subscription.endDate);

      // Last day logic (calendar-day match)
      const isLastDay = now.isSame(endDate, "day");

      // Debug logs
      console.log("User:", user.email);
      console.log("Last Bonus:", lastBonus.format());
      console.log("Next Bonus:", nextBonusTime.format());
      console.log("End Date:", endDate.format());
      console.log("isLastDay:", isLastDay);

      // Reminder email
      if (isLastDay && !subscription.isSubscriptionRecycle) {
        subscription.isSubscriptionRecycle = true;
        await subscription.save();

        sendEmail({
          email: user.email,
          subject: "Contribution Cycle Starting Soon",
          html: contributionCycleStartsEmail(user, subscription),
        });

        console.log("Reminder email sent to:", user.email);
      }

      // Daily interest logic
      const shouldPayInterest = !isLastDay && nextBonusTime.isSame(now, "day");

      if (shouldPayInterest) {
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

        subscription.lastBonusAt = now.toDate();
        await subscription.save();

        console.log("💰 Daily interest paid:", dailyBonus);
      }

      // Expire subscription
      if (now.isSameOrAfter(endDate)) {
        subscription.status = "expired";
        await subscription.save();
        console.log("❌ Subscription expired:", subscription._id);
      }
    } catch (error) {
      console.log("Cron job error:", error.message);
    }
  }

  console.log("=== DAILY INTEREST CRON END ===\n");
});

// const { contributionCycleStartsEmail } = require("../middleware/emailTemplate");
// const DailyInterest = require("../models/DailyInterest");
// const Subscription = require("../models/Subscription");
// const User = require("../models/User");
// const { sendEmail } = require("./brevo");
// const cron = require("node-cron");
// const moment = require("moment");

// cron.schedule("0 8 * * *", async () => {
//   const activeSubscriptions = await Subscription.find({
//     status: "active",
//   });

//   for (const subscription of activeSubscriptions) {
//     try {
//       const user = await User.findById(subscription.user);
//       if (!user) continue;

//       const now = new Date();
//       const subscriptionStartTime = moment(
//         subscription.subscriptionDate
//       ).toDate();

//       const lastBonusTime = subscription.lastBonusAt || subscriptionStartTime;

//       const nextBonusTime = new Date(lastBonusTime);
//       nextBonusTime.setDate(nextBonusTime.getDate() + 1);

//       const endDate = new Date(subscription.endDate);
//       const timeUntilEnd = endDate.getTime() - now.getTime();
//       const isLastDay = timeUntilEnd <= 24 * 60 * 60 * 1000 && timeUntilEnd > 0;

//       // Reminder email
//       if (isLastDay && !subscription.isSubscriptionRecycle) {
//         subscription.isSubscriptionRecycle = true;
//         await subscription.save();
//         sendEmail({
//           email: user.email,
//           subject: "Contribution Cycle Starting Soon",
//           html: contributionCycleStartsEmail(user, subscription),
//         });
//       }

//       const isSameDay = moment(nextBonusTime).isSame(now, "day");

//       // Daily bonus
//       if (!isLastDay && isSameDay) {
//         const dailyBonus = subscription.amount * 0.2;
//         user.accountBalance += dailyBonus;
//         user.userTransactionTotal.dailyInterestHistoryTotal += dailyBonus;

//         const interest = new DailyInterest({
//           user: user._id,
//           subscription: subscription._id,
//           amount: dailyBonus,
//           date: now.toLocaleString(),
//         });

//         await interest.save();
//         user.userTransaction.dailyInterestHistory.push(interest._id);
//         await user.save();

//         subscription.lastBonusAt = now;
//         await subscription.save();
//       }

//       // Expire subscription
//       if (now >= subscription.endDate) {
//         subscription.status = "expired";
//         await subscription.save();
//       }
//     } catch (error) {
//       console.log("Cron job error", error?.message);
//     }
//   }
// });
