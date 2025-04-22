const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const AuthRoutes = require("./routes/authRoutes");
const UserRoutes = require("./routes/UserRoutes");

const app = express();

app.use(cors());
app.use(cookieParser());
app.use(express.json());

app.use("/api/auth", AuthRoutes);
app.use("/api/user", UserRoutes);

app.use("/", (req, res, next) => {
    res.status(200).send("Server is running");
});


module.exports = app;