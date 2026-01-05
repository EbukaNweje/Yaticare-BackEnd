const Subscription = require("../models/Subscription");
const User = require("../models/User");
const DailyInterest = require("../models/DailyInterest");
const AuditLog = require("../models/AuditLog");

// Test endpoint to manually run daily interest logic
exports.testDailyInterest = async (req, res) => {
  try {
    console.log("\n=== MANUAL DAILY INTEREST TEST ===");
    console.log("Server Time:", new Date().toLocaleString());
    console.log("UTC Time:", new Date().toISOString());
    console.log("Timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);

    const activeSubscriptions = await Subscription.find({ status: "active" });
    console.log(`Found ${activeSubscriptions.length} active subscriptions`);

    if (activeSubscriptions.length === 0) {
      return res.json({
        message: "No active subscriptions found",
        subscriptions: [],
      });
    }

    const results = [];

    for (const subscription of activeSubscriptions) {
      try {
        const user = await User.findById(subscription.user);
        if (!user) {
          results.push({
            subscriptionId: subscription._id,
            error: "User not found",
          });
          continue;
        }

        const now = new Date();
        const subscriptionInfo = {
          subscriptionId: subscription._id,
          userEmail: user.email,
          daysPaid: subscription.daysPaid,
          amount: subscription.amount,
          status: subscription.status,
          isPaused: subscription.isPaused,
          mustRecycle: subscription.mustRecycle,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          lastBonusAt: subscription.lastBonusAt,
          currentTime: now.toISOString(),
        };

        // Check if subscription is expired
        if (now >= subscription.endDate) {
          subscriptionInfo.action = "Should be expired";
          results.push(subscriptionInfo);
          continue;
        }

        // Check if paused
        if (subscription.isPaused) {
          subscriptionInfo.action = "Paused - no interest";
          results.push(subscriptionInfo);
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

          subscriptionInfo.lastBonus = lastBonus.toISOString();
          subscriptionInfo.nextBonusDate = nextBonusDate.toISOString();

          // Check if payment is due
          const target = new Date(nextBonusDate);
          const current = new Date(now);
          target.setHours(0, 0, 0, 0);
          current.setHours(0, 0, 0, 0);

          if (current >= target) {
            subscriptionInfo.action = `Should pay day ${
              subscription.daysPaid + 1
            } interest`;
            subscriptionInfo.dailyBonus = subscription.amount * 0.2;
          } else {
            subscriptionInfo.action = "Not due for payment yet";
          }
        } else {
          subscriptionInfo.action = "Days paid >= 6, check recycle logic";
        }

        results.push(subscriptionInfo);
      } catch (err) {
        results.push({
          subscriptionId: subscription._id,
          error: err.message,
        });
      }
    }

    res.json({
      message: "Daily interest test completed",
      totalSubscriptions: activeSubscriptions.length,
      results: results,
    });
  } catch (error) {
    console.error("Test error:", error);
    res.status(500).json({
      error: "Test failed",
      message: error.message,
    });
  }
};

// Helper function
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
