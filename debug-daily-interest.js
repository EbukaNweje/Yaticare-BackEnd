// Debug script to check daily interest logic
// Run this with: node debug-daily-interest.js

const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config({ path: "./config/index.env" });

const Subscription = require("./models/Subscription");
const User = require("./models/User");

async function debugDailyInterest() {
  try {
    // Connect to database
    await mongoose.connect(process.env.DATABASE, {
      serverSelectionTimeoutMS: 30000,
    });
    console.log("✅ Database connected");

    const activeSubscriptions = await Subscription.find({ status: "active" });
    console.log(
      `\n📊 Found ${activeSubscriptions.length} active subscriptions\n`
    );

    if (activeSubscriptions.length === 0) {
      console.log("❌ No active subscriptions found!");
      console.log("Check if:");
      console.log("1. Users have created subscriptions");
      console.log("2. Subscription status is set to 'active'");
      console.log("3. Database connection is working");
      return;
    }

    for (const subscription of activeSubscriptions) {
      const user = await User.findById(subscription.user);
      if (!user) {
        console.log(`❌ User not found for subscription ${subscription._id}`);
        continue;
      }

      console.log(`\n--- ${user.email} (${subscription._id}) ---`);
      console.log(`Amount: ${subscription.amount}`);
      console.log(`Days Paid: ${subscription.daysPaid}`);
      console.log(`Status: ${subscription.status}`);
      console.log(`Is Paused: ${subscription.isPaused}`);
      console.log(`Must Recycle: ${subscription.mustRecycle}`);
      console.log(`Start Date: ${subscription.startDate}`);
      console.log(`End Date: ${subscription.endDate}`);
      console.log(`Last Bonus At: ${subscription.lastBonusAt}`);

      const now = new Date();
      console.log(`Current Time: ${now.toISOString()}`);

      // Check if expired
      if (now >= subscription.endDate) {
        console.log("🔴 EXPIRED - should be marked as expired");
        continue;
      }

      // Check if paused
      if (subscription.isPaused) {
        console.log("⏸️  PAUSED - no interest will be paid");
        continue;
      }

      // Check payment logic
      if (subscription.daysPaid < 6) {
        const lastBonus = subscription.lastBonusAt
          ? new Date(subscription.lastBonusAt)
          : new Date(subscription.startDate);

        const nextBonusDate = subscription.lastBonusAt
          ? addDays(lastBonus, 1)
          : new Date(subscription.startDate);

        console.log(`Last Bonus: ${lastBonus.toISOString()}`);
        console.log(`Next Bonus Due: ${nextBonusDate.toISOString()}`);

        // Check if payment is due
        const target = new Date(nextBonusDate);
        const current = new Date(now);
        target.setHours(0, 0, 0, 0);
        current.setHours(0, 0, 0, 0);

        if (current >= target) {
          const dailyBonus = subscription.amount * 0.2;
          console.log(
            `🟢 SHOULD PAY day ${
              subscription.daysPaid + 1
            } interest: ${dailyBonus}`
          );
        } else {
          console.log("🟡 NOT DUE YET for payment");
          const hoursUntilDue = (target - current) / (1000 * 60 * 60);
          console.log(`Hours until due: ${hoursUntilDue.toFixed(1)}`);
        }
      } else {
        console.log("🔵 DAYS PAID >= 6 - check recycle logic");
        if (subscription.mustRecycle) {
          console.log("🔴 MUST RECYCLE - user needs to recycle to continue");
        }
      }
    }
  } catch (error) {
    console.error("❌ Debug error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Database disconnected");
  }
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Run the debug
debugDailyInterest();
