const User = require("../models/User");
const Admin = require("../models/Admin");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const depositModel = require("../models/Deposit");
const historyModel = require("../models/History");
const Withdrawal = require("../models/withdrawal");
const transporter = require("../utilities/email");
const Subscription = require("../models/Subscription");

exports.createAdmin = async (req, res, next) => {
  try {
    const { email, password, fullName } = req.body;
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists" });
    }
    // Hash password and create admin
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = new Admin({ email, fullName, password: hashedPassword });
    await admin.save();
    res
      .status(201)
      .json({ message: "Admin created successfully", data: admin });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const token = jwt.sign(
      { id: admin._id, super: admin.super },
      process.env.JWT,
      {
        expiresIn: "1d",
      }
    );
    res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("-password -pin");
    res
      .status(200)
      .json({ message: "Users retrieved successfully", data: users });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.approveDeposit = async (req, res, next) => {
  try {
    const { depositId } = req.params;

    // Find the deposit
    const deposit = await depositModel.findById(depositId).populate("user");
    if (!deposit) {
      return res.status(404).json({ message: "Deposit not found" });
    }

    if (deposit.status === "confirmed") {
      return res.status(400).json({ message: "Deposit already confirmed" });
    }

    // Update deposit status
    deposit.status = "confirmed";
    await deposit.save();

    // Credit the user's account balance
    const user = await User.findById(deposit.user._id);
    user.accountBalance = (user.accountBalance || 0) + Number(deposit.amount);
    user.userTransactionTotal.depositHistoryTotal += Number(deposit.amount);
    await user.save();

    // Log to history
    const history = new historyModel({
      userId: user._id,
      transactionType: "Deposit Approved",
      amount: deposit.total,
    });
    await history.save();

    // Send confirmation email
    const mailOptions = {
      from: process.env.USEREMAIL,
      to: user.email,
      subject: "Deposit Confirmed ✅",
      html: `
        <h2>Hello ${user.userName}!</h2>
        <p>Your deposit of <b>${deposit.amount}</b> (${deposit.PaymentType}) has been confirmed.</p>
        <p>Your new balance is <b>${user.accountBalance}</b>.</p>
        <p>Regards, <br>YATiCare Team.</p>
      `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Email sending failed: ", error.message);
      } else {
        console.log("Deposit approval email sent successfully");
      }
    });

    res.status(200).json({
      message: "Deposit approved successfully",
      deposit,
    });
  } catch (error) {
    console.error("Error approving deposit:", error.message);
    next(error);
  }
};

exports.getAllDeposits = async (req, res, next) => {
  try {
    const deposits = await depositModel
      .find()
      .populate("user", "userName email")
      .sort({ createdAt: -1 });
    res
      .status(200)
      .json({ message: "Deposits retrieved successfully", data: deposits });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllWithdrawals = async (req, res, next) => {
  try {
    const withdrawals = await Withdrawal.find()
      .populate("user", "userName email")
      .sort({ createdAt: -1 });
    res.status(200).json({
      message: "Withdrawals retrieved successfully",
      data: withdrawals,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.approveWithdrawal = async (req, res, next) => {
  try {
    const { withdrawalId } = req.params;

    // Find the withdrawal
    const withdrawal = await Withdrawal.findById(withdrawalId).populate("user");
    if (!withdrawal) {
      return res.status(404).json({ message: "Withdrawal not found" });
    }

    // Update withdrawal status
    if (withdrawal.status === "approved") {
      return res.status(400).json({ message: "Withdrawal already approved" });
    }
    withdrawal.status = "approved";
    await withdrawal.save();

    // Deduct the user's account balance
    // if (user.accountBalance < withdrawal.amount) {
    //   return res
    //     .status(400)
    //     .json({ message: "Insufficient balance for this withdrawal" });
    // }

    // Log to history
    const user = await User.findById(withdrawal.user._id);
    user.userTransactionTotal.withdrawalTotal += withdrawal.amountCharges;
    await user.save();
    const history = new historyModel({
      userId: user._id,
      transactionType: "Withdrawal Approved",
      amount: withdrawal.amount,
    });
    await history.save();

    // Send confirmation email
    const mailOptions = {
      from: process.env.USEREMAIL,
      to: user.email,
      subject: "Withdrawal Approved ✅",
      html: `
        <h2>Hello ${user.userName}!</h2>
        <p>Your withdrawal of <b>${withdrawal.amount}</b> has been approved.</p>
        <p>Your new balance is <b>${user.accountBalance}</b>.</p>
        <p>Regards, <br>YATiCare Team.</p>
      `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Email sending failed: ", error.message);
      } else {
        console.log("Withdrawal approval email sent successfully");
      }
    });

    res.status(200).json({
      message: "Withdrawal approved successfully",
      withdrawal,
    });
  } catch (error) {
    console.error("Error approving withdrawal:", error.message);
    next(error);
  }
};

exports.deleteDeposit = async (req, res, next) => {
  try {
    const { depositId } = req.params;
    const deposit = await depositModel.findByIdAndDelete(depositId);
    if (!deposit) {
      return res.status(404).json({ message: "Deposit not found" });
    }
    res.status(200).json({ message: "Deposit deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return next(createError(400, "User not found"));
    }
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    next(error);
  }
};

exports.deleteWithdrawal = async (req, res, next) => {
  try {
    const { withdrawalId } = req.params;
    const withdrawal = await Withdrawal.findByIdAndDelete(withdrawalId);
    if (!withdrawal) {
      return res.status(404).json({ message: "Withdrawal not found" });
    }
    res.status(200).json({ message: "Withdrawal deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateUserEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    // Check if the email already exists in the database
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email is already in use" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { email },
      { new: true } // this returns the updated document
    );

    if (!updatedUser) {
      return res.status(400).json({ message: "User not found" });
    }

    res
      .status(200)
      .json({ message: "User email updated successfully", data: updatedUser });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.changeUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { password: hashedPassword },
      { new: true } // this returns the updated document
    );

    if (!updatedUser) {
      return res.status(400).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User password updated successfully",
      data: updatedUser,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.changeUserPin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPin } = req.body;

    const hashedPin = await bcrypt.hash(newPin, 10);

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { pin: hashedPin },
      { new: true } // this returns the updated document
    );

    if (!updatedUser) {
      return res.status(400).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User PIN updated successfully",
      data: updatedUser,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.blockUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.status = "blocked";
    await user.save();

    res.status(200).json({ message: "User blocked successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// exports.DeletedUserCount = async (req, res) => {
//   try {
//     const deletedUserCount = await User.countDocuments({ isDeleted: true });

//     res.status(200).json({
//       message: "Deleted user count retrieved successfully",
//       deletedUserCount,
//     });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

exports.unblockUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.status = "active";
    await user.save();

    res.status(200).json({ message: "User unblocked successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.totalDalyDeposit = async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0); // Today at 00:00:00

    const end = new Date();
    end.setHours(23, 59, 59, 999); // Today at 23:59:59

    const dailyDeposits = await depositModel.find({
      depositDateChecked: { $gte: start, $lte: end },
    });

    const totalAmount = dailyDeposits.reduce(
      (sum, deposit) => sum + deposit.amount,
      0
    );

    res.status(200).json({
      message: "Total daily deposits calculated successfully",
      date: start.toDateString(),
      totalAmount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.totalDailyWithdrawals = async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0); // Today at 00:00:00

    const end = new Date();
    end.setHours(23, 59, 59, 999); // Today at 23:59:59

    const dailyWithdrawals = await Withdrawal.find({
      withdrawalDateChecked: { $gte: start, $lte: end },
    });

    const totalAmount = dailyWithdrawals.reduce(
      (sum, withdrawal) => sum + withdrawal.amount,
      0
    );

    res.status(200).json({
      message: "Total daily withdrawals calculated successfully",
      date: start.toDateString(),
      totalAmount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.totalPendingDeposits = async (req, res) => {
  try {
    // Count the number of deposits with status "pending"
    const pendingCount = await depositModel.countDocuments({
      status: "pending",
    });

    res.status(200).json({
      message: "Total pending deposits counted successfully",
      pendingCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.totalPendingWithdrawals = async (req, res) => {
  try {
    // Count the number of withdrawals with status "pending"
    const pendingCount = await Withdrawal.countDocuments({
      status: "pending",
    });

    res.status(200).json({
      message: "Total pending withdrawals counted successfully",
      pendingCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.totalBlockedAndActiveUsers = async (req, res) => {
  try {
    // Count the number of blocked users
    const blockedCount = await User.countDocuments({ status: "blocked" });

    // Count the number of active users
    const activeCount = await User.countDocuments({ status: "active" });

    res.status(200).json({
      message: "Total blocked and active users counted successfully",
      blockedCount,
      activeCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.totalActiveSubscribers = async (req, res) => {
  try {
    // Find users who have at least one active subscription
    const activeSubscribers = await Subscription.aggregate([
      { $match: { status: "active" } },
      { $group: { _id: "$user" } }, // Group by user ID to ensure uniqueness
    ]);

    res.status(200).json({
      message: "Total active subscribers counted successfully",
      activeSubscribersCount: activeSubscribers.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
