const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config({ path: "./config/index.env" });
const Db = process.env.DATABASE;
require("./utilities/cron"); // cron jobs

mongoose
  .connect(Db, {})
  .then(() => {
    /////
    console.log("Database connected successfully");
  })
  .catch((err) => {
    console.log("Database connection error:", err.message);
    console.log("Retrying connection in 5 seconds...");
    setTimeout(() => {
      mongoose
        .connect(Db, {})
        .then(() => {
          console.log("Database connected successfully on retry");
        })
        .catch((retryErr) => {
          console.log("Database connection failed on retry:", retryErr.message);
        });
    }, 5000);
  });

const app = require("./App");
// console.log(new Date().toLocaleString());
// console.log(new Date().toISOString());

app.listen(process.env.PORT || 5000, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
