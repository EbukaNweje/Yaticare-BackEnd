const bcrypt = require("bcryptjs");
const Withdrawal = require("../models/withdrawal");
const User = require("../models/User");
const historyModel = require("../models/History");

// 📌 Create Withdrawal
const createWithdrawal = async (req, res) => {
  try {
    const { userId, amount, method, walletAddress, accountName, pin } =
      req.body;

    if (!userId || !amount || !method || !pin) {
      return res
        .status(400)
        .json({ error: "User ID, amount, method, and PIN are required" });
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (amount > user.accountBalance)
      return res.status(404).json({ error: "Insufficient balance" });

    if (!user.pin) {
      return res.status(400).json({ error: "Transaction PIN not set" });
    }

    // Compare pin
    const isMatch = await bcrypt.compare(pin, user.pin);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid PIN" });
    }

    // Create withdrawal
    const withdrawal = new Withdrawal({
      user: user._id,
      amount,
      method,
      walletAddress,
      accountName,
      status: "pending",
    });

    await withdrawal.save();

    // Push withdrawal into user.userTransaction.withdraw
    user.userTransaction.withdrawal.push(withdrawal._id);
    await user.save();

    // Save history record
    const history = new historyModel({
      userId: user._id,
      transactionType: "withdrawal",
      amount,
      to: walletAddress || accountName || method,
    });

    await history.save();

    return res.status(201).json({
      message: "Withdrawal request submitted successfully",
      withdrawal,
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
      "userName email"
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
