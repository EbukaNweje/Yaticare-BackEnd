const AuthController = require("../controllers/Auth");
const middleware = require("../middleware/Middleware");
const router = require("express").Router();

router.post("/register", AuthController.register);
router.post("/login",middleware.isLogin, AuthController.login);
router.post("/logout/:id", AuthController.logout);
router.post("/forgot-password", AuthController.forgetPassword);
router.post("/reset-password/:id", AuthController.resetPassword);
router.post("/change-password/:id", AuthController.changePassword);
router.post("/create-pin/:id", AuthController.creeatepin);
router.post("/change-pin/:id", AuthController.changepin);


module.exports = router;
