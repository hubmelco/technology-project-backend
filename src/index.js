const https = require("https");
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const { userRouter } = require("./controller/userRouter");
const { postRouter } = require("./controller/postRouter");
const songRouter = require("./controller/songRouter");
require("dotenv").config();

const options = {
    key: fs.readFileSync("tech-project-key.pem"),
    cert: fs.readFileSync("tech-project.pem")
};
const app = express();
const server = https.createServer(options, app);
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Routes
app.get("/", (req, res) => {
    res.send("Test");
})
app.use("/users", userRouter);
app.use("/posts", postRouter);
app.use("/songs", songRouter);


server.listen(PORT, () => console.log(`Server listening on https://localhost:${PORT}`)); 