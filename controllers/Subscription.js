const User = require("../models/User");
const Subscription = require("../models/Subscription");
const Bonus = require("../models/Bonus");
const DailyInterest = require("../models/DailyInterest");
const mongoose = require("mongoose");
const {
  subscriptionCreatedEmail,
  referralCommissionEmail,
  contributionCycleStartsEmail,
  subscriptionRecycledEmail,
  recurringReferralBonusEmail,
  firstTimeReferralBonusEmail,
} = require("../middleware/emailTemplate");
const { sendEmail } = require("../utilities/brevo");
const moment = require("moment");

// exports.createSubscription = async (req, res) => {
//   try {
//     const { userId, plan, amount, durationInDays, subscriptionDate } = req.body;

//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ message: "User not found" });

//     if (user.accountBalance < amount)
//       return res.status(400).json({ message: "Insufficient balance" });

//     user.accountBalance -= amount;

//     const endDate = new Date();
//     endDate.setDate(endDate.getDate() + durationInDays);

//     let parsedSubscriptionDate = new Date(subscriptionDate);
//     if (isNaN(parsedSubscriptionDate.getTime())) {
//       parsedSubscriptionDate = new Date(); // fallback to now if invalid
//     }

//     const newSubscription = new Subscription({
//       user: userId,
//       plan,
//       amount,
//       endDate,
//       status: "active",
//       subscriptionDate: parsedSubscriptionDate,
//       lastBonusAt: parsedSubscriptionDate,
//       showDate: subscriptionDate,
//     });

//     // Debugging logs to verify user and referrer
//     // console.log("Creating subscription for user:", user);

//     // Check if the user creating the subscription has any existing subscriptions
//     const userSubscriptions = await Subscription.find({ user: userId });
//     const isFirstSubscription = userSubscriptions.length === 0;

//     if (!isFirstSubscription) {
//       const lastSub = await Subscription.findOne({ user: userId }).sort({
//         subscriptionDate: -1,
//       });

//       if (lastSub && amount < lastSub.amount) {
//         return res.status(400).json({
//           message: `You cannot subscribe with an amount less than your last subscription of $${lastSub.amount}`,
//         });
//       }
//     }
//     // 🎁 Referral Bonus Logic
//     const referrer = await User.findOne({
//       "inviteCode.userInvited": user._id,
//     });
//     // console.log("Referrer:", referrer);

//     if (referrer) {
//       // Set bonus rate based on the user's subscription history
//       const bonusRate = isFirstSubscription ? 0.15 : 0.005;
//       const bonusAmount = amount * bonusRate;

//       referrer.accountBalance += bonusAmount;
//       referrer.inviteCode.bonusAmount =
//         (referrer.inviteCode.bonusAmount || 0) + bonusAmount;
//       // const date = new Date().toLocaleString();

//       const bonus = new Bonus({
//         user: referrer._id,
//         amount: bonusAmount,
//         reason: isFirstSubscription
//           ? "First Time Referral Bonus"
//           : "Recurring Referral Bonus",
//         date: subscriptionDate,
//       });

//       await bonus.save();
//       referrer.userTransactionTotal.bonusHistoryTotal += bonusAmount;
//       referrer.userTransaction.bonusHistory.push(bonus._id);
//       await referrer.save();
//       const emailDetails = {
//         email: referrer.email,
//         subject: isFirstSubscription
//           ? "First-Time Referral Bonus Earned"
//           : "Recurring Referral Bonus Earned",
//         html: isFirstSubscription
//           ? referralCommissionEmail(referrer, bonusAmount)
//           : recurringReferralBonusEmail(referrer, bonusAmount),
//       };
//       sendEmail(emailDetails);
//     }

//     // Save the subscription and user
//     await newSubscription.save();
//     user.isSubscribed = true;
//     user.userSubscription.push(newSubscription._id);
//     user.userTransaction.subscriptionsHistory.push(newSubscription._id);
//     await user.save();

//     const dateObj = new Date(subscriptionDate);
//     const hours = dateObj.getHours(); // 6
//     const minutes = dateObj.getMinutes();
//     // console.log("my datwe", dateObj, hours, minutes);

//     // ✅ Schedule cron job to run every 5 minutes

//     cron.schedule(
//       `${minutes} ${hours} * * *`, // every day at the subscription time
//       async () => {
//         try {
//           const activeSubscriptions = await Subscription.find({
//             status: "active",
//           });
//           for (const subscription of activeSubscriptions) {
//             const user = await User.findById(subscription.user);
//             if (!user) continue;

//             const now = new Date();

//             // Parse subscription start time
//             const subscriptionStartTime = moment(
//               subscription.subscriptionDate,
//               "M/D/YYYY, h:mm:ss A"
//             ).toDate();

//             const lastBonusTime =
//               subscription.lastBonusAt || subscriptionStartTime;

//             // Calculate next eligible bonus time (exactly 24 hours after lastBonusAt)
//             const nextBonusTime = new Date(lastBonusTime);
//             nextBonusTime.setDate(nextBonusTime.getDate() + 1);

//             // Calculate if today is the last day (less than 24 hours left)
//             const endDate = new Date(subscription.endDate);
//             const timeUntilEnd = endDate - now;
//             const isLastDay = timeUntilEnd <= 24 * 60 * 60 * 1000;

//             // ✅ Send reminder email one day before expiration
//             if (isLastDay && !subscription.isSubscriptionRecycle) {
//               const emailDetails = {
//                 email: user.email,
//                 subject: "Contribution Cycle Starting Soon",
//                 html: contributionCycleStartsEmail(user, subscription),
//               };
//               await sendEmail(emailDetails);

//               subscription.isSubscriptionRecycle = true;
//               await subscription.save();
//             }

//             // ✅ Add daily bonus exactly 24 hours after lastBonusAt, but not on last day
//             if (!isLastDay && now >= nextBonusTime) {
//               const dailyBonus = subscription.amount * 0.2;
//               user.accountBalance += dailyBonus;
//               user.userTransactionTotal.dailyInterestHistoryTotal += dailyBonus;

//               const interest = new DailyInterest({
//                 user: user._id,
//                 subscription: subscription._id,
//                 amount: dailyBonus,
//                 date: now.toLocaleString(),
//               });

//               await interest.save();
//               user.userTransaction.dailyInterestHistory.push(interest._id);
//               await user.save();

//               subscription.lastBonusAt = now;
//               await subscription.save();
//             }

//             // ✅ Expire subscription if end date reached
//             if (now >= subscription.endDate) {
//               subscription.status = "expired";
//               await subscription.save();
//             }
//           }

//           // console.log("✅ Daily subscription cron job completed.");
//         } catch (error) {
//           console.error("❌ Cron job error:", error.message);
//         }
//       },
//       {
//         scheduled: true,
//       }
//     );

//     const emailDetails = {
//       email: user.email,
//       subject: "Subscription Created Successfully",
//       html: subscriptionCreatedEmail(user, newSubscription),
//     };
//     sendEmail(emailDetails);

//     res.status(201).json({
//       message: "Subscription created successfully",
//       subscription: newSubscription,
//       newBalance: user.accountBalance,
//     });
//   } catch (error) {
//     console.error("Error creating subscription:", error);
//     res.status(500).json({ message: error.message });
//   }
// };

exports.createSubscription = async (req, res) => {
  try {
    const { userId, plan, amount, durationInDays, subscriptionDate } = req.body;

    // ✅ Validate user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.accountBalance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // ✅ Deduct subscription amount
    user.accountBalance -= amount;

    // ✅ Calculate end date
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationInDays);

    // ✅ Parse subscription date
    let parsedSubscriptionDate = new Date(subscriptionDate);
    if (isNaN(parsedSubscriptionDate.getTime())) {
      parsedSubscriptionDate = new Date(); // fallback to now
    }

    // ✅ Create subscription
    const newSubscription = new Subscription({
      user: userId,
      plan,
      amount,
      endDate,
      status: "active",
      subscriptionDate: parsedSubscriptionDate,
      lastBonusAt: parsedSubscriptionDate,
      showDate: subscriptionDate,
    });

    // ✅ Check subscription history
    const userSubscriptions = await Subscription.find({ user: userId });
    const isFirstSubscription = userSubscriptions.length === 0;

    if (!isFirstSubscription) {
      const lastSub = await Subscription.findOne({ user: userId }).sort({
        subscriptionDate: -1,
      });
      if (lastSub && amount < lastSub.amount) {
        return res.status(400).json({
          message: `You cannot subscribe with an amount less than your last subscription of $${lastSub.amount}`,
        });
      }
    }

    // ✅ Referral Bonus
    const referrer = await User.findOne({ "inviteCode.userInvited": user._id });
    if (referrer) {
      const bonusRate = isFirstSubscription ? 0.15 : 0.005;
      const bonusAmount = amount * bonusRate;

      referrer.accountBalance += bonusAmount;
      referrer.inviteCode.bonusAmount =
        (referrer.inviteCode.bonusAmount || 0) + bonusAmount;

      const bonus = new Bonus({
        user: referrer._id,
        amount: bonusAmount,
        reason: isFirstSubscription
          ? "First Time Referral Bonus"
          : "Recurring Referral Bonus",
        date: subscriptionDate,
      });

      await bonus.save();
      referrer.userTransactionTotal.bonusHistoryTotal += bonusAmount;
      referrer.userTransaction.bonusHistory.push(bonus._id);
      await referrer.save();

      sendEmail({
        email: referrer.email,
        subject: isFirstSubscription
          ? "First-Time Referral Bonus Earned"
          : "Recurring Referral Bonus Earned",
        html: isFirstSubscription
          ? referralCommissionEmail(referrer, bonusAmount)
          : recurringReferralBonusEmail(referrer, bonusAmount),
      });
    }

    // ✅ Save subscription and user
    await newSubscription.save();
    user.isSubscribed = true;
    user.userSubscription.push(newSubscription._id);
    user.userTransaction.subscriptionsHistory.push(newSubscription._id);
    await user.save();

    // ✅ Schedule daily cron job at subscription time
    const hours = parsedSubscriptionDate.getHours();
    const minutes = parsedSubscriptionDate.getMinutes();

    // ✅ Confirmation email
    sendEmail({
      email: user.email,
      subject: "Subscription Created Successfully",
      html: subscriptionCreatedEmail(user, newSubscription),
    });

    res.status(201).json({
      message: "Subscription created successfully",
      subscription: newSubscription,
      newBalance: user.accountBalance,
    });
  } catch (error) {
    console.error("Error creating subscription:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.recycleSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.body;

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription)
      return res.status(404).json({ message: "Subscription not found" });

    const currentDate = new Date();
    const oneDayBeforeEnd = new Date(subscription.endDate);
    oneDayBeforeEnd.setDate(oneDayBeforeEnd.getDate() - 1);

    const isSecondToLastDay =
      currentDate.toDateString() === oneDayBeforeEnd.toDateString();
    const isExpired = subscription.status === "expired";

    if (!isExpired && !isSecondToLastDay) {
      return res.status(400).json({
        message:
          "You can only recycle on the second-to-last day or after expiration.",
      });
    }

    // ✅ Add last pending bonus if due
    const lastBonusTime =
      subscription.lastBonusAt || subscription.subscriptionDate;
    const nextBonusTime = new Date(lastBonusTime);
    nextBonusTime.setDate(new Date(lastBonusTime).getDate() + 1);

    if (currentDate >= nextBonusTime) {
      const user = await User.findById(subscription.user);
      const dailyBonus = subscription.amount * 0.2;

      user.accountBalance += dailyBonus;
      user.userTransactionTotal.dailyInterestHistoryTotal += dailyBonus;

      const interest = new DailyInterest({
        user: user._id,
        subscription: subscription._id,
        amount: dailyBonus,
        date: currentDate.toLocaleString(),
      });

      await interest.save();
      user.userTransaction.dailyInterestHistory.push(interest._id);
      await user.save();

      subscription.lastBonusAt = currentDate;
      await subscription.save();
    }

    // ✅ Calculate original duration
    const durationInDays = Math.ceil(
      (new Date(subscription.endDate) - new Date(subscription.startDate)) /
        (1000 * 60 * 60 * 24)
    );

    // ✅ Reset subscription period
    const newStartDate = new Date();
    const newEndDate = new Date();
    newEndDate.setDate(newStartDate.getDate() + durationInDays);

    subscription.startDate = newStartDate;
    subscription.endDate = newEndDate;
    subscription.status = "active";
    subscription.isSubscriptionRecycle = true;
    subscription.lastBonusAt = null;

    await subscription.save();

    // 💸 0.5% Commission to Referrer
    const user = await User.findById(subscription.user);
    const referrer = await User.findOne({ "inviteCode.userInvited": user._id });

    if (referrer) {
      const commission = subscription.amount * 0.005;
      referrer.accountBalance += commission;
      referrer.inviteCode.bonusAmount =
        (referrer.inviteCode.bonusAmount || 0) + commission;

      const bonus = new Bonus({
        user: referrer._id,
        amount: commission,
        reason: "Recycle Bonus",
        date: new Date().toLocaleString(),
      });

      await bonus.save();
      referrer.userTransaction.bonusHistory.push(bonus._id);
      referrer.userTransactionTotal.bonusHistoryTotal += commission;
      await referrer.save();

      const emailDetails = {
        email: user.email,
        subject: "Referral Commission Earned",
        html: referralCommissionEmail(user, commission),
      };

      sendEmail(emailDetails);
    }

    const emailDetails = {
      email: user.email,
      subject: "Subscription Recycled Successfully",
      html: subscriptionRecycledEmail(user, subscription),
    };

    sendEmail(emailDetails);

    res.status(200).json({
      message: "Subscription recycled successfully",
      subscription,
    });
  } catch (error) {
    console.error("Recycle error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.getUserSubscriptions = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    // Fetch subscriptions and populate plan details if needed
    // console.log("Fetching subscriptions for user:", userId);
    const subscriptions = await Subscription.find({ user: userId }).populate(
      "plan"
    );
    // console.log("Subscriptions fetched:", subscriptions);

    if (!subscriptions.length) {
      return res
        .status(404)
        .json({ message: "No subscriptions found for this user" });
    }

    res.status(200).json({
      message: "User subscriptions retrieved successfully",
      count: subscriptions.length,
      subscriptions,
    });
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// exports.getOneSubscription = async (req, res) => {
//   try {
//     const { subscriptionId } = req.params;

//     // Validate subscriptionId format
//     if (!mongoose.Types.ObjectId.isValid(subscriptionId)) {
//       return res
//         .status(400)
//         .json({ message: "Invalid subscription ID format" });
//     }

//     // Fetch the subscription and populate plan details
//     const subscription = await Subscription.findById(subscriptionId).populate(
//       "plan"
//     );

//     if (!subscription) {
//       return res.status(404).json({ message: "Subscription not found" });
//     }

//     res.status(200).json({
//       message: "Subscription retrieved successfully",
//       subscription,
//     });
//   } catch (error) {
//     console.error("Error fetching subscription:", error);
//     res.status(500).json({ message: error });
//   }
// };

exports.getAllSubscriptions = async (req, res) => {
  try {
    const allSubscription = await Subscription.find();

    res.status(200).json({
      message: "All Subscriptions",
      data: allSubscription,
    });
  } catch (err) {
    res.status(500).json({ message: err });
  }
};
