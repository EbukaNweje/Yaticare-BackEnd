const AuthController = require("../controllers/Auth");
const middleware = require("../middleware/Middleware");
const router = require("express").Router();

router.post("/register", AuthController.register);
router.post("/login",middleware.isLogin, AuthController.login);
router.post("/logout/:id", AuthController.logout);

module.exports = router;
