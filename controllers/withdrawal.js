const bcrypt = require("bcryptjs");
const Withdrawal = require("../models/withdrawal");
const User = require("../models/User");
const historyModel = require("../models/History");
const Subscription = require("../models/Subscription"); // Import Subscription model
const { withdrawalRequestEmail } = require("../middleware/emailTemplate");
const { sendEmail } = require("../utilities/brevo");

// 📌 Create Withdrawal
const createWithdrawal = async (req, res) => {
  try {
    const {
      userId,
      amount,
      method,
      walletAddress,
      withdrawalDate,
      accountName,
      pin,
    } = req.body;

    if (!userId || !amount || !method || !pin) {
      return res
        .status(400)
        .json({ error: "User ID, amount, method, and PIN are required" });
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Compare pin
    const isMatch = await bcrypt.compare(pin, user.pin);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid PIN" });
    }

    // Check if the user has any subscriptions
    const userSubscriptions = await Subscription.find({ user: userId });
    if (userSubscriptions.length === 0) {
      return res.status(400).json({
        error: "You must have an active subscription to withdraw.",
      });
    }

    if (amount > user.accountBalance)
      return res.status(404).json({ error: "Insufficient balance" });
    if (amount < 10)
      return res
        .status(404)
        .json({ error: "Minimum withdrawal amount is $10.00" });

    if (!user.pin) {
      return res.status(400).json({ error: "Transaction PIN not set" });
    }

    // Deduct 15% fee from the withdrawal amount
    const fee = amount * 0.15;
    const amountAfterFee = amount - fee;

    if (amount > user.accountBalance) {
      return res.status(404).json({ error: "Insufficient balance" });
    }

    user.accountBalance -= amount; // Deduct the original amount from the account balance
    await user.save();

    // Create withdrawal
    const withdrawals = new Withdrawal({
      user: user._id,
      amount: amountAfterFee,
      amountCharges: amount,
      method,
      walletAddress,
      accountName,
      status: "pending",
      withdrawalDate: withdrawalDate,
      withdrawalDateChecked: new Date(),
    });

    // Push withdrawal into user.userTransaction.withdraw
    user.userTransaction.withdrawal.push(withdrawals._id);
    await user.save();

    // Save history record
    const history = new historyModel({
      userId: user._id,
      transactionType: "withdrawal",
      amount,
      to: walletAddress || accountName || method,
      desc: `Withdrew $${amountAfterFee} via ${method} (Fee: $${fee})`,
    });

    await history.save();

    await withdrawals.save();

    const emailDetails = {
      email: user.email,
      subject: "Withdrawal Request Initiated",
      html: withdrawalRequestEmail(user),
    };

    sendEmail(emailDetails);

    return res.status(201).json({
      message: "Withdrawal request submitted successfully",
      withdrawals,
    });
  } catch (err) {
    console.error("Error creating withdrawal:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// 📌 Get all withdrawals (Admin)
const getAllWithdrawals = async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find().populate(
      "user",
      "userName email",
    );
    res.json(withdrawals);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// 📌 Get withdrawals for a user
const getUserWithdrawals = async (req, res) => {
  try {
    const { userId } = req.params;
    const withdrawals = await Withdrawal.find({ user: userId }).sort({
      createdAt: -1,
    });
    res.json(withdrawals);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// 📌 Update withdrawal status (Admin)
const updateWithdrawalStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const withdrawal = await Withdrawal.findById(id);
    if (!withdrawal) {
      return res.status(404).json({ error: "Withdrawal not found" });
    }

    withdrawal.status = status;
    if (status === "approved" || status === "rejected") {
      withdrawal.processedAt = new Date();
    }

    await withdrawal.save();

    res.json({
      message: `Withdrawal ${status} successfully`,
      withdrawal,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// 📌 Delete withdrawal (Admin)
const deleteWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const withdrawal = await Withdrawal.findByIdAndDelete(id);

    if (!withdrawal) {
      return res.status(404).json({ error: "Withdrawal not found" });
    }

    res.json({ message: "Withdrawal deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  createWithdrawal,
  getAllWithdrawals,
  getUserWithdrawals,
  updateWithdrawalStatus,
  deleteWithdrawal,
};
