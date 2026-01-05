// Script to fix subscription dates that are in the future
// Run this with: node fix-subscription-dates.js

const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config({ path: "./config/index.env" });

const Subscription = require("./models/Subscription");

async function fixSubscriptionDates() {
  try {
    // Connect to database
    await mongoose.connect(process.env.DATABASE, {
      serverSelectionTimeoutMS: 30000,
    });
    console.log("✅ Database connected");

    const now = new Date();
    console.log(`Current time: ${now.toISOString()}`);

    // Find subscriptions with future start dates
    const futureSubscriptions = await Subscription.find({
      status: "active",
      startDate: { $gt: now },
    });

    console.log(
      `\n📊 Found ${futureSubscriptions.length} subscriptions with future start dates`
    );

    if (futureSubscriptions.length === 0) {
      console.log("No subscriptions need fixing");
      return;
    }

    for (const subscription of futureSubscriptions) {
      console.log(`\n--- Fixing subscription ${subscription._id} ---`);
      console.log(`Old start date: ${subscription.startDate}`);
      console.log(`Old end date: ${subscription.endDate}`);

      // Set start date to now
      const newStartDate = new Date();
      const newEndDate = new Date();
      newEndDate.setDate(newEndDate.getDate() + 7); // 7 days from now

      subscription.startDate = newStartDate;
      subscription.endDate = newEndDate;
      subscription.lastBonusAt = null; // Reset so first payment can happen today

      await subscription.save();

      console.log(`✅ Updated start date: ${subscription.startDate}`);
      console.log(`✅ Updated end date: ${subscription.endDate}`);
    }

    console.log(`\n✅ Fixed ${futureSubscriptions.length} subscriptions`);
  } catch (error) {
    console.error("❌ Fix error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Database disconnected");
  }
}

// Run the fix
fixSubscriptionDates();
