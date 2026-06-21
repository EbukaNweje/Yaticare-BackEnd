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

// const Subscription = require("../models/Subscription");
// const User = require("../models/User");
// const DailyInterest = require("../models/DailyInterest");
// const AuditLog = require("../models/AuditLog");
// const { sendEmail } = require("../utilities/brevo");
// const { contributionCycleStartsEmail } = require("../middleware/emailTemplate");

// // helpers
// function addDays(date, days) {
//   const d = new Date(date);
//   d.setDate(d.getDate() + days);
//   return d;
// }

// function isSameDay(dateA, dateB) {
//   return (
//     dateA.getFullYear() === dateB.getFullYear() &&
//     dateA.getMonth() === dateB.getMonth() &&
//     dateA.getDate() === dateB.getDate()
//   );
// }

// module.exports = async (req, res) => {
//   console.log("\n=== DAILY INTEREST TASK (Vercel API Trigger) START ===");
//   console.log("Server Time:", new Date().toLocaleString());

//   try {
//     const activeSubscriptions = await Subscription.find({ status: "active" });

//     for (const subscription of activeSubscriptions) {
//       const user = await User.findById(subscription.user);
//       if (!user) continue;

//       const now = new Date();

//       // Expiration check
//       if (now >= subscription.endDate) {
//         subscription.status = "expired";
//         await subscription.save();
//         await AuditLog.create({
//           type: "EXPIRE",
//           user: user._id,
//           subscription: subscription._id,
//           message: "Subscription expired.",
//         });
//         continue;
//       }

//       // If paused, skip
//       if (subscription.isPaused) continue;

//       // DAYS 1–6
//       if (subscription.daysPaid < 6) {
//         const lastBonus = subscription.lastBonusAt
//           ? new Date(subscription.lastBonusAt)
//           : new Date(subscription.startDate);

//         const nextBonusDate = addDays(lastBonus, 1);

//         if (isSameDay(nextBonusDate, now)) {
//           const dailyBonus = subscription.amount * 0.2;

//           const interest = new DailyInterest({
//             user: user._id,
//             subscription: subscription._id,
//             amount: dailyBonus,
//             date: now.toLocaleString(),
//           });
//           await interest.save();

//           user.accountBalance = (user.accountBalance || 0) + dailyBonus;
//           user.userTransactionTotal = user.userTransactionTotal || {};
//           user.userTransactionTotal.dailyInterestHistoryTotal =
//             (user.userTransactionTotal.dailyInterestHistoryTotal || 0) +
//             dailyBonus;
//           user.userTransaction = user.userTransaction || {};
//           user.userTransaction.dailyInterestHistory =
//             user.userTransaction.dailyInterestHistory || [];
//           user.userTransaction.dailyInterestHistory.push(interest._id);
//           await user.save();

//           subscription.daysPaid += 1;
//           subscription.lastBonusAt = now;
//           await subscription.save();

//           await AuditLog.create({
//             type: "INTEREST",
//             user: user._id,
//             subscription: subscription._id,
//             message: `Paid daily interest ${dailyBonus}. daysPaid=${subscription.daysPaid}`,
//           });

//           // If day 6 completed → require recycle
//           if (subscription.daysPaid === 6) {
//             subscription.mustRecycle = true;
//             await subscription.save();

//             // Send recycle reminder
//             if (!subscription.isSubscriptionRecycle) {
//               subscription.isSubscriptionRecycle = true;
//               await subscription.save();

//               sendEmail({
//                 email: user.email,
//                 subject:
//                   "Action required: Recycle to receive final day interest",
//                 html: contributionCycleStartsEmail(user, subscription),
//               });

//               await AuditLog.create({
//                 type: "REMINDER",
//                 user: user._id,
//                 subscription: subscription._id,
//                 message: "Sent recycle reminder (day6).",
//               });
//             }
//           }
//         }
//       }

//       // DAY 7 handling
//       else {
//         const lastBonus = new Date(subscription.lastBonusAt);
//         const nextBonusDate = addDays(lastBonus, 1);

//         if (isSameDay(nextBonusDate, now)) {
//           if (subscription.mustRecycle) {
//             // Pause account (user missed recycle)
//             subscription.isPaused = true;
//             await subscription.save();

//             await AuditLog.create({
//               type: "PAUSE",
//               user: user._id,
//               subscription: subscription._id,
//               message: "Paused - user failed to recycle before day7.",
//             });
//           } else {
//             // User recycled → pay final day interest
//             const dailyBonus = subscription.amount * 0.2;

//             const interest = new DailyInterest({
//               user: user._id,
//               subscription: subscription._id,
//               amount: dailyBonus,
//               date: now.toLocaleString(),
//             });
//             await interest.save();

//             user.accountBalance = (user.accountBalance || 0) + dailyBonus;
//             user.userTransactionTotal.dailyInterestHistoryTotal =
//               (user.userTransactionTotal.dailyInterestHistoryTotal || 0) +
//               dailyBonus;
//             user.userTransaction.dailyInterestHistory.push(interest._id);
//             await user.save();

//             subscription.daysPaid += 1;
//             subscription.lastBonusAt = now;
//             await subscription.save();

//             await AuditLog.create({
//               type: "INTEREST",
//               user: user._id,
//               subscription: subscription._id,
//               message: `Paid day ${subscription.daysPaid} interest ${dailyBonus} (post-recycle).`,
//             });
//           }
//         }
//       }
//     }

//     console.log("=== DAILY INTEREST TASK END ===\n");
//     return res
//       .status(200)
//       .json({ success: true, message: "Cron logic executed" });
//   } catch (err) {
//     console.log("Error running cron logic:", err.message);
//     return res.status(500).json({ error: err.message });
//   }
// };
