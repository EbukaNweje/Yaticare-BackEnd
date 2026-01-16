const subscriptions = require("../controllers/Subscription");
const router = require("express").Router();

router.post("/userSubcription", subscriptions.createSubscription);
router.get("/getusrSubcription/:userId", subscriptions.getUserSubscriptions);
router.patch(
  "/recycleSubscription/:recycleSubscription",
  subscriptions.recycleSubscription
);
// router.get("/subscription/:userId", subscriptions.getOneSubscription);
router.get("/allsubscriptiondata", subscriptions.getAllSubscriptions);

module.exports = router;
