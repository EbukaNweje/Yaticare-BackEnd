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

const cron = require("node-cron");
const Subscription = require("../models/Subscription");
const User = require("../models/User");
const DailyInterest = require("../models/DailyInterest");
const AuditLog = require("../models/AuditLog");
const { sendEmail } = require("../utilities/brevo");
const { contributionCycleStartsEmail } = require("../middleware/emailTemplate");

// helpers
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isSameDay(dateA, dateB) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

// Run every day at 08:00 server time
cron.schedule("0/5 * * * *", async () => {
  console.log("\n=== DAILY INTEREST CRON START ===");
  console.log("Server Time:", new Date().toLocaleString());
  console.log("Timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);

  const activeSubscriptions = await Subscription.find({ status: "active" });

  for (const subscription of activeSubscriptions) {
    try {
      const user = await User.findById(subscription.user);
      if (!user) continue;

      const now = new Date();

      // Expire subscription if endDate passed
      if (now >= subscription.endDate) {
        subscription.status = "expired";
        await subscription.save();
        await AuditLog.create({
          type: "EXPIRE",
          user: user._id,
          subscription: subscription._id,
          message: "Subscription expired.",
        });
        console.log("Expired:", subscription._id);
        continue;
      }

      // If subscription is paused (user failed to recycle), do nothing except continue
      if (subscription.isPaused) {
        console.log("Paused (no interest):", subscription._id, user.email);
        continue;
      }

      // Pay interest for days 1..6
      // daysPaid is count of already-paid days (0..6); if less than 6 -> pay next day
      if (subscription.daysPaid < 6) {
        // Check whether we should pay today:
        // if lastBonusAt is null -> we can pay day 1 on or after startDate (match calendar day)
        // if lastBonusAt exists -> make sure a new day has arrived since lastBonusAt
        const lastBonus = subscription.lastBonusAt
          ? new Date(subscription.lastBonusAt)
          : new Date(subscription.startDate);
        const nextBonusDate = addDays(lastBonus, 1);

        // Only pay if today is the calendar day of nextBonusDate (so it's been at least one day)
        if (isSameDay(nextBonusDate, now)) {
          const dailyBonus = subscription.amount * 0.2;

          // create interest record + update user
          const interest = new DailyInterest({
            user: user._id,
            subscription: subscription._id,
            amount: dailyBonus,
            date: now.toLocaleString(),
          });
          await interest.save();

          user.accountBalance = (user.accountBalance || 0) + dailyBonus;
          user.userTransactionTotal = user.userTransactionTotal || {};
          user.userTransactionTotal.dailyInterestHistoryTotal =
            (user.userTransactionTotal.dailyInterestHistoryTotal || 0) +
            dailyBonus;
          user.userTransaction = user.userTransaction || {};
          user.userTransaction.dailyInterestHistory =
            user.userTransaction.dailyInterestHistory || [];
          user.userTransaction.dailyInterestHistory.push(interest._id);
          await user.save();

          // update subscription
          subscription.daysPaid += 1;
          subscription.lastBonusAt = now;
          await subscription.save();

          await AuditLog.create({
            type: "INTEREST",
            user: user._id,
            subscription: subscription._id,
            message: `Paid daily interest ${dailyBonus}. daysPaid=${subscription.daysPaid}`,
          });
          console.log(
            `Paid day ${subscription.daysPaid} interest to ${user.email}: ${dailyBonus}`
          );

          // If daysPaid reached 6 after payment, mark mustRecycle so user must recycle to get day7
          if (subscription.daysPaid === 6) {
            subscription.mustRecycle = true;
            await subscription.save();

            // Send reminder email (user must recycle on day 6 to receive day 7)
            if (!subscription.isSubscriptionRecycle) {
              subscription.isSubscriptionRecycle = true;
              await subscription.save();

              sendEmail({
                email: user.email,
                subject:
                  "Action required: Recycle to receive final day interest",
                html: contributionCycleStartsEmail(user, subscription),
              });

              await AuditLog.create({
                type: "REMINDER",
                user: user._id,
                subscription: subscription._id,
                message: "Sent recycle reminder (day6).",
              });
              console.log("Reminder sent to:", user.email);
            }
          }
        } else {
          // Not yet time to pay next bonus for this subscription
          // Optionally log
          // console.log("Not due yet:", subscription._id);
        }
      } else {
        // daysPaid >= 6 -> either it was recycled (and cycle restarted) or day7 must be handled
        // If user hasn't recycled, and it's the calendar day after day6 (i.e., day7), we should pause interest
        // Determine if today is the 7th day (i.e., nextBonusDate after lastBonus)
        const lastBonus = subscription.lastBonusAt
          ? new Date(subscription.lastBonusAt)
          : new Date(subscription.startDate);
        const nextBonusDate = addDays(lastBonus, 1);
        if (isSameDay(nextBonusDate, now)) {
          // It's the Day 7. If user didn't recycle (mustRecycle true), pause and do not pay
          if (subscription.mustRecycle) {
            subscription.isPaused = true;
            await subscription.save();

            await AuditLog.create({
              type: "PAUSE",
              user: user._id,
              subscription: subscription._id,
              message: "Paused - user failed to recycle before day7.",
            });
            console.log(
              `Paused subscription (missed recycle): ${subscription._id} for ${user.email}`
            );
          } else {
            // Edge case: mustRecycle false but daysPaid >=6 (maybe recycled already). If not paused, allow payment
            const dailyBonus = subscription.amount * 0.2;
            const interest = new DailyInterest({
              user: user._id,
              subscription: subscription._id,
              amount: dailyBonus,
              date: now.toLocaleString(),
            });
            await interest.save();

            user.accountBalance = (user.accountBalance || 0) + dailyBonus;
            user.userTransactionTotal = user.userTransactionTotal || {};
            user.userTransactionTotal.dailyInterestHistoryTotal =
              (user.userTransactionTotal.dailyInterestHistoryTotal || 0) +
              dailyBonus;
            user.userTransaction = user.userTransaction || {};
            user.userTransaction.dailyInterestHistory =
              user.userTransaction.dailyInterestHistory || [];
            user.userTransaction.dailyInterestHistory.push(interest._id);
            await user.save();

            subscription.daysPaid += 1;
            subscription.lastBonusAt = now;
            await subscription.save();

            await AuditLog.create({
              type: "INTEREST",
              user: user._id,
              subscription: subscription._id,
              message: `Paid day ${subscription.daysPaid} interest ${dailyBonus} (post-recycle).`,
            });
            console.log(
              `Paid final day interest to ${user.email}: ${dailyBonus}`
            );
          }
        }
      }
    } catch (err) {
      console.log("Cron job error:", err.message);
    }
  }

  console.log("=== DAILY INTEREST CRON END ===\n");
});
