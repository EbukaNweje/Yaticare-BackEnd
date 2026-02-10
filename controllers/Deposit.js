const axios = require("axios");
const depositModel = require("../models/Deposit");
const historyModel = require("../models/History");
const User = require("../models/User");
const transporter = require("../utilities/email");
const createError = require("../utilities/error");
const { DateTime } = require("luxon");
const { sendEmail } = require("../utilities/brevo");
const {
  RequestDEmail,
  depositCompletedEmail,
} = require("../middleware/emailTemplate");
const cloudinary = require("../utilities/cloudinary");
const priceCache = require("../utilities/priceCache");

exports.userDeposit = async (req, res, next) => {
  try {
    const {
      userId,
      amount,
      PaymentType,
      depositDate,
      depositWallet,
      depositWalletCoinType,
    } = req.body;

    const user = await User.findById(userId);
    if (!user) return next(createError(404, "User not found"));

    const newAmount = Number(amount);
    if (isNaN(newAmount)) {
      return res.status(400).json({ message: "Amount must be a number" });
    }

    if (!req.files || !req.files.proofFile) {
      return res.status(400).json({ message: "Proof file is required" });
    }

    if (PaymentType !== "USDT") {
      return res.status(404).json({ message: `${PaymentType} coming soon!` });
    }

    // Get conversion rate with caching and rate limiting
    const conversionRate = await priceCache.getUSDTToNGNRate();
    const btcAmount = newAmount / conversionRate;
    const roundedNumber = btcAmount.toFixed(9);

    // Upload proof
    const image = req.files.proofFile.tempFilePath;
    const uploadResponse = await cloudinary.uploader.upload(image);

    console.log("uploadResponse", uploadResponse);

    // Save deposit
    const deposit = new depositModel({
      user: user._id,
      amount: newAmount,
      amountusdt: roundedNumber,
      PaymentType,
      total: roundedNumber,
      status: "pending",
      transactionType: "deposit",
      depositDate,
      depositWallet,
      depositWalletCoinType,
      depositDateChecked: new Date(),
      proofFile: uploadResponse.secure_url,
    });
    await deposit.save();

    // Update user transactions
    user.userTransaction.deposit = user.userTransaction.deposit || [];
    user.userTransaction.deposit.push(deposit._id);
    await user.save();

    // Save history
    const history = new historyModel({
      userId: user._id,
      transactionType: deposit.transactionType,
      desc: `Deposited $${newAmount} via ${PaymentType}`,
      amount: roundedNumber,
    });
    await history.save();

    const emailDetails = {
      email: user.email,
      subject: "Deposit Request Initiated",
      html: RequestDEmail(user),
    };
    await sendEmail(emailDetails);

    res.status(200).json({ message: "Deposit successful!", emailDetails });
  } catch (error) {
    next(error);
  }
};

exports.getAllDeposits = async (req, res) => {
  try {
    // Find all deposit records and populate the user field to get user information
    const deposits = await depositModel.find().populate("user");

    if (!deposits || deposits.length === 0) {
      return res.status(404).json({
        message: "No deposit records found",
      });
    }

    // Return the retrieved deposit records with user information
    res.status(200).json({ data: deposits });
  } catch (error) {
    console.error("Error fetching deposits:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
