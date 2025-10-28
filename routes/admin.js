const Admin = require("../controllers/Admin");
const { SuperAdminAuth } = require("../middleware/Middleware");
const router = require("express").Router();

router.post("/adminlogin", Admin.adminLogin);
router.post("/createadmin", Admin.createAdmin);
router.put("/approve/:depositId", SuperAdminAuth, Admin.approveDeposit);
router.get("/allusers", Admin.getAllUsers);
router.get("/alldeposits", Admin.getAllDeposits);
router.get("/allwithdrawals", Admin.getAllWithdrawals);
router.delete("/deletedeposit/:id", SuperAdminAuth, Admin.deleteDeposit);
router.delete("/deleteuser/:id", SuperAdminAuth, Admin.deleteUser);
router.delete("/deletewithdrawal/:id", SuperAdminAuth, Admin.deleteWithdrawal);
router.put(
  "/approvewithdrawal/:withdrawalId",
  SuperAdminAuth,
  Admin.approveWithdrawal
);
router.put("/updateuseremail/:id", SuperAdminAuth, Admin.updateUserEmail);
router.patch(
  "/changeuserpassword/:id",
  SuperAdminAuth,
  Admin.changeUserPassword
);
router.patch("/changeuserpin/:id", SuperAdminAuth, Admin.changeUserPin);
router.patch("/blockuser/:id", SuperAdminAuth, Admin.blockUser);
router.patch("/unblockuser/:id", SuperAdminAuth, Admin.unblockUser);

module.exports = router;
