const router = require("express").Router();
const { getAllHistory, depositHistory } = require("../controllers/History");

router.get("/getallhistory/:id", getAllHistory);
router.get("/deposithistory/:id", depositHistory);

module.exports = router;
