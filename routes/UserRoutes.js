const user = require("../controllers/User")
const router = require("express").Router()

router.get("/userdata/:id", user.getOneUser);
router.delete("/deleteuser/:id", user.deleteUser);
router.put("/updateuser/:id", user.updateUser);

module.exports = router