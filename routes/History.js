const router = require("express").Router();
const { getAllHistory, depositHistory } = require("../controllers/History");

router.get("/getallhistory", getAllHistory);
router.get("/deposithistory", depositHistory);
// router.get("/investmenthistory", investHistory)
// router.get("/investmenthistory", investHistory)

module.exports = router;
