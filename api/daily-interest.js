const runDailyInterest = require("../utilities/cron");

module.exports = async (req, res) => {
  try {
    await runDailyInterest(); // runs your cron logic
    res.status(200).json({ success: true, message: "Daily interest executed" });
  } catch (err) {
    console.error("Cron API error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};
