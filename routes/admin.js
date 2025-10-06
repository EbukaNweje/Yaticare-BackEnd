const Admin = require("../controllers/Admin");
const router = require("express").Router();

router.post("/adminlogin", Admin.adminLogin);
router.post("/createadmin", Admin.createAdmin);
router.put("/approve/:depositId", Admin.approveDeposit);
router.get("/allusers", Admin.getAllUsers);
router.get("/alldeposits", Admin.getAllDeposits);
router.get("/allwithdrawals", Admin.getAllWithdrawals);
router.put("/approvewithdrawal/:withdrawalId", Admin.approveWithdrawal);

module.exports = router;
