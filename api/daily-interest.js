// // api/daily-interest.js
// import Subscription from "../models/Subscription";
// import User from "../models/User";
// import DailyInterest from "../models/DailyInterest";
// import AuditLog from "../models/AuditLog";
// import { sendEmail } from "../utilities/brevo";
// import { contributionCycleStartsEmail } from "../middleware/emailTemplate";

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

// export default async function handler(req, res) {
//   // Secure endpoint with secret
//   const authHeader = req.headers.authorization;
//   if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
//     return res.status(401).json({ message: "Unauthorized" });
//   }

//   console.log("\n=== DAILY INTEREST CRON START ===");
//   console.log("Server Time:", new Date().toLocaleString());
//   console.log("Timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);

//   try {
//     const activeSubscriptions = await Subscription.find({ status: "active" });

//     for (const subscription of activeSubscriptions) {
//       const user = await User.findById(subscription.user);
//       if (!user) continue;

//       const now = new Date();

//       // Expire subscription if endDate passed
//       if (now >= subscription.endDate) {
//         subscription.status = "expired";
//         await subscription.save();
//         await AuditLog.create({
//           type: "EXPIRE",
//           user: user._id,
//           subscription: subscription._id,
//           message: "Subscription expired.",
//         });
//         console.log("Expired:", subscription._id);
//         continue;
//       }

//       // Skip paused subscriptions
//       if (subscription.isPaused) continue;

//       // Pay interest logic (days 1–6)
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

//           // Day 6 recycle reminder
//           if (
//             subscription.daysPaid === 6 &&
//             !subscription.isSubscriptionRecycle
//           ) {
//             subscription.mustRecycle = true;
//             subscription.isSubscriptionRecycle = true;
//             await subscription.save();

//             sendEmail({
//               email: user.email,
//               subject: "Action required: Recycle to receive final day interest",
//               html: contributionCycleStartsEmail(user, subscription),
//             });

//             await AuditLog.create({
//               type: "REMINDER",
//               user: user._id,
//               subscription: subscription._id,
//               message: "Sent recycle reminder (day6).",
//             });
//           }
//         }
//       }

//       // Handle day 7 if not recycled
//       else if (subscription.daysPaid >= 6 && subscription.mustRecycle) {
//         subscription.isPaused = true;
//         await subscription.save();

//         await AuditLog.create({
//           type: "PAUSE",
//           user: user._id,
//           subscription: subscription._id,
//           message: "Paused - user failed to recycle before day7.",
//         });
//       }
//     }

//     console.log("=== DAILY INTEREST CRON END ===\n");
//     return res.status(200).json({ message: "Daily interest processed." });
//   } catch (err) {
//     console.error("Cron handler error:", err);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// }
