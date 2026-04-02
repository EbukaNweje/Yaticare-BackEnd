const user = require("../controllers/User");
const router = require("express").Router();

router.get("/userdata/:id", user.getOneUser);
router.put("/updateuser/:id", user.updateUser);
router.put("/addWallet/:id", user.saveBankInfo);
router.put("/changePhonenumber/:id", user.changePhoneNumber);
router.get(
  "/totalreferredactivesubscribers/:userId",
  user.totalReferredActiveSubscribers,
);
router.put("/updateAllTestimonials", user.updateAllUserTestimonials);
router.put(
  "/updateTestimonialsForWithdrawers",
  user.updateTestimonialsForWithdrawers,
);
router.get("/testimonials", user.getAllTestimonials);
router.get("/testimonials/approved", user.getApprovedTestimonials);
router.post("/testimonials", user.createTestimonial);
router.put("/testimonials/:id", user.updateTestimonial);

module.exports = router;
