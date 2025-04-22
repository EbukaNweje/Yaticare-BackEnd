const User = require("../models/User");
// const paystack = require('paystack')(process.env.PAYSTACK_SECRET_KEY);


exports.getOneUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user) {
            return next(createError(400, "User not found"));
        }
        res.status(200).json({ message: "User found successfully", data: user });
    } catch (error) {
        next(error);
    }
}

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
}

exports.updateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { fullName, email, password, phoneNumber } = req.body;
        const user = await User.findById(id);
        if (!user) {
            return next(createError(400, "User not found"));
        }
        user.fullName = fullName;
        user.email = email;
        user.password = password;
        user.phoneNumber = phoneNumber;
        await user.save();
        res.status(200).json({ message: "User updated successfully", data: user });
    } catch (error) {
        next(error);
    }
}



// exports.deposit = async (req, res, next) => {
//     try {
//         const { id } = req.params;
//         const { amount } = req.body;
//         const user = await User.findById(id);
//         if (!user) {
//             return next(createError(400, "User not found"));
//         }

//         // Create a new payment on Paystack
//         const payment = await paystack.transaction.initialize({
//             amount: amount * 100, // Convert to kobo
//             email: user.email,
//             callback_url: 'https://example.com/callback', // URL to redirect to after payment
//         });

//         // Redirect the user to the payment page
//         res.redirect(payment.data.authorization_url);
//     } catch (error) {
//         next(error);
//     }
// }

// exports.callback = async (req, res, next) => {
//     try {
//         const reference = req.query.reference;
//         const payment = await paystack.transaction.verify(reference);

//         if (payment.data.status === 'success') {
//             // Update the user's balance
//             const user = await User.findById(payment.data.metadata.user_id);
//             user.balance += payment.data.amount / 100; // Convert from kobo
//             await user.save();

//             res.status(200).json({ message: "Deposit successful", data: user });
//         } else {
//             res.status(400).json({ message: "Payment failed" });
//         }
//     } catch (error) {
//         next(error);
//     }
// }


// exports.deposit = async (req, res, next) => {
//     try {
//         const { id } = req.params;
//         const { amount } = req.body;
//         const user = await User.findById(id);
//         if (!user) {
//             return next(createError(400, "User not found"));
//         }
//         user.balance += amount;
//         await user.save();
//         res.status(200).json({ message: "Deposit successful", data: user });
//     } catch (error) {
//         next(error);
//     }
// }

