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

module.exports = async (req, res) => {
  console.log("\n=== DAILY INTEREST TASK (Vercel API Trigger) START ===");
  console.log("Server Time:", new Date().toLocaleString());

  try {
    const activeSubscriptions = await Subscription.find({ status: "active" });

    for (const subscription of activeSubscriptions) {
      const user = await User.findById(subscription.user);
      if (!user) continue;

      const now = new Date();

      // Expiration check
      if (now >= subscription.endDate) {
        subscription.status = "expired";
        await subscription.save();
        await AuditLog.create({
          type: "EXPIRE",
          user: user._id,
          subscription: subscription._id,
          message: "Subscription expired.",
        });
        continue;
      }

      // If paused, skip
      if (subscription.isPaused) continue;

      // DAYS 1–6
      if (subscription.daysPaid < 6) {
        const lastBonus = subscription.lastBonusAt
          ? new Date(subscription.lastBonusAt)
          : new Date(subscription.startDate);

        const nextBonusDate = addDays(lastBonus, 1);

        if (isSameDay(nextBonusDate, now)) {
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
            message: `Paid daily interest ${dailyBonus}. daysPaid=${subscription.daysPaid}`,
          });

          // If day 6 completed → require recycle
          if (subscription.daysPaid === 6) {
            subscription.mustRecycle = true;
            await subscription.save();

            // Send recycle reminder
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
            }
          }
        }
      }

      // DAY 7 handling
      else {
        const lastBonus = new Date(subscription.lastBonusAt);
        const nextBonusDate = addDays(lastBonus, 1);

        if (isSameDay(nextBonusDate, now)) {
          if (subscription.mustRecycle) {
            // Pause account (user missed recycle)
            subscription.isPaused = true;
            await subscription.save();

            await AuditLog.create({
              type: "PAUSE",
              user: user._id,
              subscription: subscription._id,
              message: "Paused - user failed to recycle before day7.",
            });
          } else {
            // User recycled → pay final day interest
            const dailyBonus = subscription.amount * 0.2;

            const interest = new DailyInterest({
              user: user._id,
              subscription: subscription._id,
              amount: dailyBonus,
              date: now.toLocaleString(),
            });
            await interest.save();

            user.accountBalance = (user.accountBalance || 0) + dailyBonus;
            user.userTransactionTotal.dailyInterestHistoryTotal =
              (user.userTransactionTotal.dailyInterestHistoryTotal || 0) +
              dailyBonus;
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
          }
        }
      }
    }

    console.log("=== DAILY INTEREST TASK END ===\n");
    return res
      .status(200)
      .json({ success: true, message: "Cron logic executed" });
  } catch (err) {
    console.log("Error running cron logic:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
