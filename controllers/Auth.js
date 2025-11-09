const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const transporter = require("../utilities/email");
const createError = require("../utilities/error");
const otp = require("otp-generator");
const {
  referrial,
  registerEmail,
  loginEmail,
  forgetPasswordEmail,
  passwordChangeEmail,
  changePasswordEmail,
  pinCreatedEmail,
  pinChangedEmail,
} = require("../middleware/emailTemplate");
const { sendEmail } = require("../utilities/brevo");
const getDate = new Date().getFullYear();

exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(createError(400, errors.array()[0].msg));
    }

    const { userName, email, password, phoneNumber, referralCode } = req.body;

    const existingUserName = await User.findOne({ userName });
    if (existingUserName) {
      return res
        .status(400)
        .json({ message: "User with this username already exists" });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User with this email already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const newUser = new User({
      userName,
      email,
      password: hash,
      phoneNumber,
    });

    // Generate Invite Code
    const codeNum = otp.generate(4, {
      digits: true,
      upperCaseAlphabets: true,
      lowerCaseAlphabets: true,
      specialChars: false,
    });
    const inviteName = newUser.userName.replace(/\s+/g, "").toLowerCase();
    const InviteCode = `${inviteName}${codeNum}`;
    newUser.inviteCode.code = InviteCode;

    // Handle Referral
    if (referralCode) {
      const referrer = await User.findOne({ "inviteCode.code": referralCode });
      if (referrer) {
        // const bonusAmount = 15;
        // referrer.accountBalance += bonusAmount;
        referrer.inviteCode.userInvited.push(newUser._id);
        referrer.referralCount += 1;

        await referrer.save();

        const emailDetails = {
          email: referrer.email,
          subject: "You've Got A New Referral",
          html: referrial(referrer),
        };

        sendEmail(emailDetails);
      }
    }

    await newUser.save();

    // Generate Referral Link
    const referralLink = `https://ya-ti-pauy.vercel.app/#/auth/Sign-up?referralCode=${newUser.inviteCode.code}`;

    const emailDetailsRegister = {
      email: newUser.email,
      subject: "Welcome To YatiCare",
      html: registerEmail(newUser),
    };
    sendEmail(emailDetailsRegister);
    res.status(201).json({
      message: "User registered successfully",
      data: {
        user: newUser,
        referralLink, // <-- Send it here
      },
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (user.status === "blocked") {
      return res
        .status(403)
        .json({ message: "Your account has been suspended" });
    }

    user.isLogin = "active";

    const token = jwt.sign({ id: user._id }, process.env.JWT);

    // Generate Referral Link
    const referralLink = `https://ya-ti-pauy.vercel.app/#/auth/Sign-up?referralCode=${user.inviteCode.code}`;

    await user.save();
    const emailDetails = {
      email: user.email,
      subject: "Recent Login Activity",
      html: loginEmail(user),
    };
    sendEmail(emailDetails);

    res.status(200).json({
      message: "User logged in successfully",
      data: {
        user,
        referralLink, // <-- Send referral link here
      },
      token,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.logout = async (req, res, next) => {
  const id = req.params.id;
  try {
    const user = await User.findById(id);
    if (!user) {
      return next(createError(400, "User not found"));
    }
    user.isLogin = false;
    await user.save();
    res
      .status(200)
      .json({ message: "User logged out successfully", data: user });
  } catch (error) {
    next(error);
  }
};

exports.forgetPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return next(createError(400, "User not found"));
    }

    const resetLink = "https://ya-ti-pauy.vercel.app/#/auth/Resetpassword";

    const emailDetails = {
      email: user.email,
      subject: "Password Reset Request",
      html: forgetPasswordEmail(user, resetLink),
    };

    sendEmail(emailDetails);

    return res
      .status(200)
      .json({ message: "Password reset email sent successfully" });
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    const user = await User.findById(id);
    if (!user) {
      return next(createError(400, "User not found"));
    }
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    user.password = hash;
    await user.save();

    const emailDetails = {
      email: user.email,
      subject: "Password Change Success",
      html: passwordChangeEmail(user),
    };

    sendEmail(emailDetails);
    res.status(200).json({ message: "Password Change Success" });
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { oldPassword, newPassword } = req.body;

    // 1. Input validation
    if (!oldPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Old and new passwords are required" });
    }

    // if (newPassword.length < 6) {
    //     return res.status(400).json({ message: "New password must be at least 6 characters long" });
    // }

    // 2. Find the user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 3. Compare old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Old password is incorrect" });
    }

    // 4. Hash and update new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    user.password = hashedPassword;
    await user.save();

    const emailDetails = {
      email: user.email,
      subject: "Password Change Confirmation",
      html: changePasswordEmail(user),
    };

    sendEmail(emailDetails);

    // 5. Respond success
    return res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.creeatepin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pin } = req.body;
    const user = await User.findById(id);
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }
    if (pin.length < 4) {
      return res
        .status(400)
        .json({ message: "Pin must be at least 4 characters long" });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(pin, salt);
    user.pin = hash;
    await user.save();
    const emailDetails = {
      email: user.email,
      subject: "PIN Created Successfully",
      html: pinCreatedEmail(user),
    };
    sendEmail(emailDetails);
    res.status(200).json({ message: "Pin created successfully", data: user });
  } catch (error) {
    next(error);
  }
};

exports.changepin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { oldPin, newPin } = req.body;
    const user = await User.findById(id);
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }
    const isMatch = await bcrypt.compare(oldPin, user.pin);
    if (!isMatch) {
      return res.status(400).json({ message: "Old pin is incorrect" });
    }
    if (newPin.length < 4) {
      return res
        .status(400)
        .json({ message: "Pin must be at least 4 characters long" });
    }
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPin, salt);
    user.pin = hash;
    await user.save();
    const emailDetails = {
      email: user.email,
      subject: "PIN Change Confirmation",
      html: pinChangedEmail(user),
    };

    sendEmail(emailDetails);
    res.status(200).json({ message: "Pin changed successfully", data: user });
  } catch (error) {
    next(error);
  }
};
