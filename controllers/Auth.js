const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const transporter = require("../utilities/email");
const createError  = require("../utilities/error");
const otp = require("otp-generator");


exports.register = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(createError(400, errors.array()[0].msg));
        }
        const { userName, email, password, phoneNumber, referralCode } = req.body;
        const user = await User.findOne({ email });
        if (user) {
            return next(createError(400, "User already exists"));
        }
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        const newUser = new User({
            userName,
            email,
            password: hash,
            phoneNumber,
            referralCode
        });

        // const codeNum = Math.floor(Math.random() * (123 - 1000) + 1000)
        const InviteCode = `${newUser.fullName.toLowerCase()}/${otp.generate(4, { digits: true, upperCaseAlphabets: true, lowerCaseAlphabets: true, specialChars: false })}`; 
        newUser.inviteCode = InviteCode
        await newUser.save();

        res.status(201).json({ message: "User registered successfully", data: newUser});
        
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return next(createError(400, "User not found"));
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return next(createError(400, "Invalid credentials"));
        }
        const token = jwt.sign({ id: user._id}, process.env.JWT);
        user.token = token
        await user.save()

        res.status(200).json({ message: "User logged in successfully", data: user });
    } catch (error) {
        next(error);
    }
};


exports.logout = async (req, res, next) => {
    const id = req.params.id
    try {
        const user = await User.findById(id);
        if (!user) {
            return next(createError(400, "User not found"));
        }
        user.isLogin = false
        await user.save()
        res.status(200).json({ message: "User logged out successfully", data: user });
    } catch (error) {
        next(error);
    }
}

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
            html: emailText
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return next(createError(400, error.message));
            }
            return res.status(200).json({ message: "Password reset email sent successfully" });
        });
    } catch (error) {
        next(error);
    }
}

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
}

