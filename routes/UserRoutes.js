const user = require("../controllers/User");
const router = require("express").Router();

router.get("/userdata/:id", user.getOneUser);
router.put("/updateuser/:id", user.updateUser);
router.put("/addWallet/:id", user.saveBankInfo);
router.put("/changePhonenumber/:id", user.changePhoneNumber);

module.exports = router;
