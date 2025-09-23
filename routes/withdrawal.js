const express = require("express");
const router = express.Router();
const {
  createWithdrawal,
  getAllWithdrawals,
  getUserWithdrawals,
  updateWithdrawalStatus,
  deleteWithdrawal,
} = require("../controllers/withdrawal");
// const { protect, adminOnly } = require("../middleware/authMiddleware");

// User routes
router.post("/createWithdrawal", createWithdrawal);
router.get("/userWithdrawal", getUserWithdrawals);

// Admin routes
// router.get("/", getAllWithdrawals);
// router.put("/:id", updateWithdrawalStatus);
// router.delete("/:id", deleteWithdrawal);

module.exports = router;
