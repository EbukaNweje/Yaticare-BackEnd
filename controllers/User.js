const User = require("../models/User");
const createError = require("../utilities/error");
// const paystack = require('paystack')(process.env.PAYSTACK_SECRET_KEY);

exports.getOneUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id)
      .populate("userTransaction.deposit")
      .populate("userTransaction.withdrawal")
      .populate("inviteCode.userInvited");
    if (!user) {
      return next(createError(400, "User not found"));
    }
    res.status(200).json({ message: "User found successfully", data: user });
  } catch (error) {
    next(error);
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
};

exports.saveBankInfo = async (req, res) => {
  try {
    const id = req.params.id;
    const { WalletName, WalletAddress } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { WalletInfo: { WalletName, WalletAddress } },
      { new: true } // this returns the updated document
    );

    if (!updatedUser) {
      return res.status(400).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Wallet info saved successfully",
      data: updatedUser,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Change Phone Number Controller
exports.changePhoneNumber = async (req, res, next) => {
  try {
    const { id } = req.params; // user ID from URL
    const { phoneNumber } = req.body; // new phone number from request body

    if (!phoneNumber) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.phoneNumber = phoneNumber;
    await user.save();

    res.status(200).json({
      message: "Phone number updated successfully",
      data: { phoneNumber: user.phoneNumber },
    });
  } catch (error) {
    next(error);
  }
};

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
