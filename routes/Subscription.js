const subscriptions = require("../controllers/Subscription");
const router = require("express").Router();

router.post("/userSubcription", subscriptions.createSubscription);
router.get("/getusrSubcription/:userId", subscriptions.getUserSubscriptions);
router.get("/recycleSubscription", subscriptions.recycleSubscription);
router.get("/subscription/:subscriptionId", subscriptions.getOneSubscription);
router.get("/allsubscriptiondata", subscriptions.getAllSubscriptions);

module.exports = router;
