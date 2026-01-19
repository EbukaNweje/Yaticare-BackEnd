const router = require("express").Router();
const { getoneUserHistory, depositHistory } = require("../controllers/History");

router.get("/getallhistory/:userId", getoneUserHistory);
router.get("/deposithistory/:id", depositHistory);

module.exports = router;
