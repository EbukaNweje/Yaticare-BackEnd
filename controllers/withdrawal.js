const Withdrawal = require("../models/withdrawal");

// 📌 1. Create a withdrawal request
const createWithdrawal = async (req, res) => {
  try {
    const {
      amount,
      method,
      walletAddress,
      bankName,
      accountNumber,
      accountName,
    } = req.body;

    if (!amount || !method) {
      return res.status(400).json({ error: "Amount and method are required" });
    }

    const withdrawal = new Withdrawal({
      user: req.user._id,
      amount,
      method,
      walletAddress,
      bankName,
      accountNumber,
      accountName,
    });

    await withdrawal.save();

    res.status(201).json({
      message: "Withdrawal request created successfully",
      withdrawal,
    });
  } catch (err) {
    console.error("Error creating withdrawal:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// 📌 2. Get all withdrawals (Admin only)
const getAllWithdrawals = async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find().populate("user", "name email");
    res.json(withdrawals);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// 📌 3. Get withdrawals for logged-in user
const getUserWithdrawals = async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({ user: req.user._id }).sort({
      createdAt: -1,
    });
    res.json(withdrawals);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// 📌 4. Update withdrawal status (Admin: approve/reject)
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

// 📌 5. Delete withdrawal (Admin only)
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
