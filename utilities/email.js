const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config({ path: "./config/index.env"});

const transporter = nodemailer.createTransport({
    service: process.env.SERVICE,
    host: process.env.SERVICE,
    port: 465,
    auth: {
        user: process.env.USEREMAIL,
        pass: process.env.EMAILPASS
    },
    secure: true
});

module.exports = transporter;
