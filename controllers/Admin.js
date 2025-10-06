const User = require("../models/User");
const Admin = require("../models/Admin");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

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
    const token = jwt.sign({ id: admin._id }, process.env.JWT, {
      expiresIn: "1d",
    });
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
    const deposit = await depositModel.findById(depositId).populate("User");
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
    user.accountBalance = (user.accountBalance || 0) + Number(deposit.total);
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

    if (withdrawal.status === "approved") {
      return res.status(400).json({ message: "Withdrawal already approved" });
    }

    // Update withdrawal status
    withdrawal.status = "approved";
    await withdrawal.save();

    // Deduct the user's account balance
    const user = await User.findById(withdrawal.user._id);
    if (user.accountBalance < withdrawal.amount) {
      return res
        .status(400)
        .json({ message: "Insufficient balance for this withdrawal" });
    }
    user.accountBalance -= Number(withdrawal.amount);
    await user.save();

    // Log to history
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
