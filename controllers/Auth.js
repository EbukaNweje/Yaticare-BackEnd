const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const transporter = require("../utilities/email");
const createError = require("../utilities/error");
const otp = require("otp-generator");
const getDate = new Date().getFullYear();

exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(createError(400, errors.array()[0].msg));
    }

    const { userName, email, password, phoneNumber, referralCode } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
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

        const subject = "You've Got A New Referral";
        const emailText = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document</title>
        <style>
            body {
                margin: 0;
                padding: 0;
                font-family: Arial, Helvetica, sans-serif;
                background-color: whitesmoke;
            }
            .container {
                width: 100%;
                background-color: whitesmoke;
                padding: 0;
                margin: 0;
            }
            .header, .footer {
                width: 100%;
                background-color: #333;
                color: #fff;
                text-align: center;
                padding: 10px;
            }
            .content {
                padding: 20px;
            }
        </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome To YatiCare</h1>
                </div>
                <div class="content">
                    <p>Hello ${referrer.userName},</p>
                    <p>A new user joined YATiCare using your referral link. Thank you for growing our community!</p>
                </div>
                <div class="content">
                    <p>Regards,</p>
                    <p><b>YATiCare Team.</b></p>
                </div>
                <div class="footer">
                    <p>&copy; ${getDate} Your Website. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        `;

        const mailOptions = {
          from: process.env.USEREMAIL,
          to: referrer.email,
          subject,
          html: emailText,
        };

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            return next(createError(400, error.message));
          }
          console.log("Email sent: " + info.response);
        });
        await referrer.save();
      }
    }

    await newUser.save();

    // Generate Referral Link
    const referralLink = `http://localhost:5173/#/auth/sign-up?referralCode=${newUser.inviteCode.code}`;

    const subject = "Welcome To YatiCare";
    const emailText = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document</title>
        <style>
            body {
                margin: 0;
                padding: 0;
                font-family: Arial, Helvetica, sans-serif;
                background-color: whitesmoke;
            }
            .container {
                width: 100%;
                background-color: whitesmoke;
                padding: 0;
                margin: 0;
            }
            .header, .footer {
                width: 100%;
                background-color: #333;
                color: #fff;
                text-align: center;
                padding: 10px;
            }
            .content {
                padding: 20px;
            }
        </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome To YatiCare</h1>
                </div>
                <div class="content">
                    <p>Hello ${newUser.userName},</p>
                    <p>Your YATiCare account was created successfully. Start exploring community-driven financial growth today!</p>
                </div>
                <div class="content">
                    <p>Regards,</p>
                    <p><b>YATiCare Team.</b></p>
                </div>
                <div class="footer">
                    <p>&copy; ${getDate} YaTiCare. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        `;

    const mailOptions = {
      from: process.env.USEREMAIL,
      to: email,
      subject,
      html: emailText,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return next(createError(400, error.message));
      }
      console.log("Email sent: " + info.response);
    });

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

    const token = jwt.sign({ id: user._id }, process.env.JWT);

    // Generate Referral Link
    const referralLink = `https://ya-ti-pauy.vercel.app/#/auth/Sign-up?referralCode=${user.inviteCode.code}`;

    await user.save();

    const subject = "Recent Login Activity";
    const emailText = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document</title>
        <style>
            body {
                margin: 0;
                padding: 0;
                font-family: Arial, Helvetica, sans-serif;
                background-color: whitesmoke;
            }
            .container {
                width: 100%;
                background-color: whitesmoke;
                padding: 0;
                margin: 0;
            }
            .header, .footer {
                width: 100%;
                background-color: #333;
                color: #fff;
                text-align: center;
                padding: 10px;
            }
            .content {
                padding: 20px;
            }
        </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome To YatiCare</h1>
                </div>
                <div class="content">
                    <p>Hello ${user.userName},</p>
                    <p>You’ve logged into your YATiCare account. If this wasn’t you, secure your account immediately.</p>
                </div>
                <div class="content">
                    <p>Regards,</p>
                    <p><b>YATiCare Team.</b></p>
                </div>
                <div class="footer">
                    <p>&copy; ${getDate} YaTiCare. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        `;

    const mailOptions = {
      from: process.env.USEREMAIL,
      to: email,
      subject,
      html: emailText,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return next(createError(400, error.message));
      }
      console.log("Email sent: " + info.response);
    });

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

    const subject = "Reset Password Notification";
    const emailText = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document</title>
        <style>
            body {
                margin: 0;
                padding: 0;
                font-family: Arial, Helvetica, sans-serif;
                background-color: whitesmoke;
            }
            .container {
                width: 100%;
                background-color: whitesmoke;
                padding: 0;
                margin: 0;
            }
            .header, .footer {
                width: 100%;
                background-color: #333;
                color: #fff;
                text-align: center;
                padding: 10px;
            }
            .content {
                padding: 20px;
            }
        </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Reset Password Notification</h1>
                </div>
                <div class="content">
                    <p>Hello ${user.fullName},</p>
                    <p>Click the link below to reset your password:</p>
                    <a href="http://localhost:3000/reset-password/${user._id}">Reset Password</a>
                </div>
                <div class="footer">
                    <p>&copy; 2023 Your Website. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        `;

    const mailOptions = {
      from: process.env.USEREMAIL,
      to: email,
      subject,
      html: emailText,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return next(createError(400, error.message));
      }
      return res
        .status(200)
        .json({ message: "Password reset email sent successfully" });
    });
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
    res.status(200).json({ message: "Password reset successfully" });
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
    res.status(200).json({ message: "Pin changed successfully", data: user });
  } catch (error) {
    next(error);
  }
};
