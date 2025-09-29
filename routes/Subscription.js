const subscriptions = require("../controllers/Subscription");
const router = require("express").Router();

router.post("/usrSubcription", subscriptions.createSubscription);
router.get("/getusrSubcription", subscriptions.getUserSubscriptions);
router.get("/recycleSubscription", subscriptions.recycleSubscription);

module.exports = router;
