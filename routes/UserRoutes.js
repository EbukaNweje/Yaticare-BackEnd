const user = require("../controllers/User")
const router = require("express").Router()

router.get("/userdata/:id", user.getOneUser);

module.exports = router