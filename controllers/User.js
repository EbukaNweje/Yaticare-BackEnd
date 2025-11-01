const User = require("../models/User");
const createError = require("../utilities/error");
// const paystack = require('paystack')(process.env.PAYSTACK_SECRET_KEY);

exports.getOneUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id)
      .populate("userTransaction.deposit")
      .populate("userTransaction.withdrawal")
      .populate("userTransaction.bonusHistory")
      .populate("userTransaction.subscriptionsHistory")
      .populate("userTransaction.dailyInterestHistory")
      .populate("inviteCode.userInvited")
      .populate("userSubscription");
    if (!user) {
      return next(createError(400, "User not found"));
    }
    res.status(200).json({ message: "User found successfully", data: user });
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

exports.totalReferredActiveSubscribers = async (req, res) => {
  try {
    const { userId } = req.params; // Assuming the authenticated user's ID is available in req.user
    const user = await User.findById(userId);

    if (!user || !user.referralLink) {
      return res.status(400).json({ message: "User referral link not found" });
    }

    const referralLink = user.referralLink;

    // Find users who signed up using the referral link
    const referredUsers = await User.find({ referralLink }).select("_id");

    // Extract user IDs
    const userIds = referredUsers.map((user) => user._id);

    // Find active subscriptions for these users
    const activeSubscriptions = await Subscription.aggregate([
      { $match: { status: "active", user: { $in: userIds } } },
      { $group: { _id: "$user" } }, // Group by user ID to ensure uniqueness
    ]);

    res.status(200).json({
      message: "Total referred active subscribers counted successfully",
      totalReferredActiveSubscribers: activeSubscriptions.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// exports.totalReferredActiveSubscribers = async (req, res) => {
//   try {
//     const { referralLink } = req.query; // Assuming referralLink is passed as a query parameter

//     // Find users who signed up using the referral link
//     const referredUsers = await User.find({ referralLink }).select("_id");

//     // Extract user IDs
//     const userIds = referredUsers.map((user) => user._id);

//     // Find active subscriptions for these users
//     const activeSubscriptions = await Subscription.aggregate([
//       { $match: { status: "active", user: { $in: userIds } } },
//       { $group: { _id: "$user" } }, // Group by user ID to ensure uniqueness
//     ]);

//     res.status(200).json({
//       message: "Total referred active subscribers counted successfully",
//       totalReferredActiveSubscribers: activeSubscriptions.length,
//     });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };
