const axios = require("axios");
const depositModel = require("../models/Deposit");
const historyModel = require("../models/History");
const User = require("../models/User");
const transporter = require("../utilities/email");
const createError = require("../utilities/error");
const { DateTime } = require("luxon");

exports.userDeposit = async (req, res, next) => {
  try {
    const { userId, amount, PaymentType, depositDate } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return next(createError(404, "User not found"));
    }

    const newAmount = Number(amount);

    if (newAmount === NaN || newAmount !== newAmount) {
      return res.status(400).json({
        message: `You can only deposit ${newAmount}`,
      });
    }

    if (PaymentType != "USDT" && PaymentType != "BANK") {
      return res.status(404).json({
        message: "PaymentType not available",
      });
    }

    if (PaymentType == "BANK") {
      return res.status(404).json({
        message: `${PaymentType} commig soon!`,
      });
    }

    // Perform the currency conversion
    let response;
    let roundedNumber;

    if (PaymentType == "USDT") {
      response = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=ngn`
      );
      const conversionRates = response.data.tether.ngn;
      // console.log("this is usdt:", conversionRates);
      const myTotal = Number(conversionRates);
      const btcAmount = newAmount / myTotal;
      roundedNumber = btcAmount.toFixed(9);
    }

    const Depo = await depositModel.find();
    // console.log("first", userTimeZone);
    // const formattedDate = DateTime.now()
    //   .setZone(userTimeZone || "UTC")
    //   .toFormat("ccc LLL dd yyyy HH:mm:ss");

    // Save the deposit details
    const deposit = new depositModel({
      user: user._id,
      amount: `${newAmount}`,
      amountusdt: `${roundedNumber}`,
      PaymentType: PaymentType,
      total: roundedNumber,
      status: "pending",
      transactionType: Depo.transactionType,
      depositDate: depositDate,
    });
    await deposit.save();

    deposit.user = userId;

    user.userTransaction.deposit.push(deposit._id);
    await user.save();

    const History = new historyModel({
      userId: user._id,
      transactionType: deposit.transactionType,
      amount: `${roundedNumber}`,
    });
    await History.save();

    // Save user's deposit first
    // ... (your deposit saving logic here)

    // After deposit, check if user has a referrer
    if (user.referralCode) {
      const referrer = await user.findOne({
        "inviteCode.code": user.referralCode,
      });

      if (referrer) {
        const commission = (1.5 / 100) * roundedNumber; // 1.5% of deposit
        referrer.accountBalance += commission;

        await referrer.save();

        if (deposit) {
          const mailOptions = {
            from: process.env.USEREMAIL,
            to: referrer.email,
            subject: "Deposit Request Initiated",
            html: `
                        <h2>Hello ${referrer.userName}!</h2>
                        <p> you just deposited ${roundedNumber} to your balance in ${PaymentType}</p>
                        <p>Regards, <br>YATiCare  Team.</p>
                    `,
          };

          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.error("Email sending failed: ", error.message);
            } else {
              console.log("Referral email sent successfully");
            }
          });
        }

        // Send Email to referrer
        const mailOptions = {
          from: process.env.USEREMAIL,
          to: referrer.email,
          subject: "Deposit Request Initiated",
          html: `
                        <h2>Hello ${referrer.userName}!</h2>
                        <p>We’ve received your deposit request. Funds will reflect after processing (0-2 hours).</p>
                        <p>Regards, <br>YATiCare  Team.</p>
                    `,
        };
        const mailOptions2 = {
          from: process.env.USEREMAIL,
          to: referrer.email,
          subject: "You Earned a Referral Commission!",
          html: `
                        <h2>Congratulations ${referrer.userName}!</h2>
                        <p>You just earned <b>${commission.toFixed(
                          2
                        )}</b> because your referral made a deposit!</p>
                        <p>Keep sharing your referral link to earn more!</p>
                    `,
        };

        transporter.sendMail(mailOptions, mailOptions2, (error, info) => {
          if (error) {
            console.error("Email sending failed: ", error.message);
          } else {
            console.log("Referral email sent successfully");
          }
        });

        if (deposit.status === "pending") {
          return res.status(200).json({
            message: `Deposit made and pending`,
          });
        }
        if (deposit.status === "confirmed") {
          User.accountBalance += roundedNumber;
        }
      }
    }

    res.status(200).json({ message: "Deposit successful!" });
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
    // Handle errors
    console.error("Error fetching deposits:", error);
    res.status(500).json({ error: "Internal server error" });
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
