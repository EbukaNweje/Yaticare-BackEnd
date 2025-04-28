const User = require("../models/User");
const transporter = require("../utilities/email");
const createError = require("../utilities/error");


exports.userDeposit = async (req, res, next) => {
    try {
        const { userId, amount } = req.body; // Assume you're getting this data
        
        const user = await User.findById(userId);

        if (!user) {
            return next(createError(404, "User not found"));
        }

        // Save user's deposit first
        // ... (your deposit saving logic here)

        // After deposit, check if user has a referrer
        if (user.referralCode) {
            const referrer = await User.findOne({ "inviteCode.code": user.referralCode });
            
            if (referrer) {
                const commission = (1.5 / 100) * amount; // 1.5% of deposit
                referrer.accountBalance += commission;

                await referrer.save();

                // Send Email to referrer
                const mailOptions = {
                    from: process.env.USEREMAIL,
                    to: referrer.email,
                    subject: "You Earned a Referral Commission!",
                    html: `
                        <h2>Congratulations ${referrer.userName}!</h2>
                        <p>You just earned <b>$${commission.toFixed(2)}</b> because your referral made a deposit!</p>
                        <p>Keep sharing your referral link to earn more!</p>
                    `
                };

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.error("Email sending failed: ", error.message);
                    } else {
                        console.log("Referral email sent successfully");
                    }
                });
            }
        }

        res.status(200).json({ message: "Deposit successful!" });

    } catch (error) {
        next(error);
    }
};
