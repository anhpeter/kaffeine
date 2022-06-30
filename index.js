const axios = require("axios");
const express = require("express");
const mongoose = require("mongoose");

const app = express();
app.use(express.json({ extended: false }));

// CONNECT DATABASE
mongoose
  .connect(
    "mongodb+srv://admin:VhN1XrRdTvwG1TJX@hobbies.ba9s98h.mongodb.net/kaffeine?retryWrites=true&w=majority"
  )
  .catch((e) => console.error(err));

const logSchema = new mongoose.Schema({
  type: String,
  message: String,
  timestamp: String,
});

const LogModel = mongoose.model("logs", logSchema);

const saveExceptionLog = (message) => {
  return new LogModel({ type: "exception", message }).save();
};
const savePingLog = () => {
  return new LogModel({
    type: "ping",
    timestamp: new Date().toISOString(),
  }).save();
};
const savePingMeLog = (message) => {
  return new LogModel({
    type: "ping-me",
    message,
    timestamp: new Date().toISOString(),
  }).save();
};

const pitoBlogUrls = [
  "https://pitoghichep.com",
  "https://pitoblogapi.as.r.appspot.com",
];

const pingUrls = (urls) => {
  urls.forEach((url) =>
    axios.get(url).catch((e) => {
      saveExceptionLog(e.message);
      console.error(`failed to ping ${url}`);
    })
  );
};

// PING URLS
let pingInterval = 1 * 60 * 1000;
setInterval(async () => {
  pingUrls(pitoBlogUrls);
  //
  savePingLog();
}, [pingInterval]);

// PING ME
const appUrl = process.env.PROJECT_DOMAIN
  ? `https://${process.env.PROJECT_DOMAIN}.glitch.me`
  : "http://localhost:3000";
setInterval(() => {
  axios
    .get(`${appUrl}/ping`)
    .then((res) => {
      savePingMeLog(res.data);
    })
    .catch((e) => {
      saveExceptionLog(e.message);
    });
}, 10000);
//
app.get("/ping", (req, res) => {
  res.send("ping me!");
});

// SHOW PING INFORMATION
app.get("/", async (req, res) => {
  const pingUrls = pitoBlogUrls;
  try {
    const pings = await LogModel.find({ type: "ping" })
      .sort({ timestamp: -1 })
      .limit(10);
    //
    const pingMes = await LogModel.find({ type: "ping-me" })
      .sort({ timestamp: -1 })
      .limit(10);
    //
    const exceptions = await LogModel.find({ type: "exception" })
      .sort({ timestamp: -1 })
      .limit(50);
    const exceptionMessages = exceptions.map((ex) => ({
      message: ex.message,
      timestamp: ex.timestamp,
    }));
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify(
        {
          message: "kaffeine works",
          pingUrls,
          pingHistory: pings.map((item) => item.timestamp),
          exceptions: exceptionMessages,
          pingMeHistory: pingMes.map((item) => item.timestamp),
        },
        null,
        4
      )
    );
  } catch (e) {
    saveExceptionLog(e.message);
    res.status(500);
    res.json({ message: "failed to fetch ping history" });
  }
});

// RESET
app.get("/reset", async (req, res) => {
  try {
    const result = await LogModel.deleteMany();
    res.json(result);
  } catch (e) {
    saveExceptionLog(e.message);
    res.status(500);
    res.json({ message: "failed to reset" });
  }
});

//
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${appUrl}`);
});
//
