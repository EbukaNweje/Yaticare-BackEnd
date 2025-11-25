const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config({ path: "./config/index.env" });
const Db = process.env.DATABASE;
require("./utilities/cron"); // cron jobs

mongoose
  .connect(Db, {
    // useNewUrlParser: true,
    // useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000,
  })
  .then(() => {
    console.log("Database connected successfully");
  })
  .catch((err) => {
    console.log(err);
  });

const app = require("./App");
// console.log(new Date().toLocaleString());
// console.log(new Date().toISOString());

app.listen(process.env.PORT || 5000, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
