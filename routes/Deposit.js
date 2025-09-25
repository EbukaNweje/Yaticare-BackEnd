const depositControllers = require("../controllers/Deposit");

const router = require("express").Router();

router.post("/deposit", depositControllers.userDeposit);
router.get("/alldeposit", depositControllers.getAllDeposits);
router.put("/approve/:depositId", depositControllers.approveDeposit);

module.exports = router;
