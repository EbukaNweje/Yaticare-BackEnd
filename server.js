const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config({ path: "./config/index.env"});
const Db = process.env.DATABASE;

mongoose.connect(Db).then(() => {
    console.log("Database connected successfully");
}).catch((err) => {
    console.log(err);
});

const app = require("./App");

app.listen(process.env.PORT || 5000, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});
