const axios = require("axios");
const express = require("express");
const mongoose = require("mongoose");
const moment = require("moment-timezone");

const app = express();
app.use(express.json({ extended: false }));

// CONNECT DATABASE
mongoose
  .connect(
    "mongodb+srv://admin:VhN1XrRdTvwG1TJX@hobbies.ba9s98h.mongodb.net/kaffeine?retryWrites=true&w=majority"
  )
  .catch((e) => console.error(e));

const logSchema = new mongoose.Schema({
  type: String,
  message: String,
  timestamp: String,
});
const Log = mongoose.model("logs", logSchema);

// LOG MODEL
const LogModel = {
  saveExceptionLog: (message) => {
    return new Log({ type: "exception", message }).save();
  },
  savePingLog: () => {
    return new Log({
      type: "ping",
      timestamp: new Date().toISOString(),
    }).save();
  },
  savePingMeLog: (message) => {
    return new Log({
      type: "ping-me",
      message,
      timestamp: new Date().toISOString(),
    }).save();
  },
};

const Helper = {
  toReadableTime: (timestamp) => {
    return moment(timestamp).tz("Asia/HO_CHI_MINH").fromNow();
  },
};

// CONSTANTS
const PORT = process.env.PORT || 3000;
const pingUrlIn = 5 * 60 * 1000;
const pingMeIn = 30 * 1000;
const pitoBlogUrls = [
  "https://pitoghichep.com",
  "https://pitoblogapi.as.r.appspot.com",
];

const pingUrls = (urls) => {
  urls.forEach((url) =>
    axios.get(url).catch((e) => LogModel.saveExceptionLog(e.message))
  );
};

// PING URLS INTERVAL
setInterval(async () => {
  pingUrls(pitoBlogUrls);
  //
  LogModel.savePingLog();
}, [pingUrlIn]);

// PING ME INTERVAL
const appUrl = process.env.PROJECT_DOMAIN
  ? `https://${process.env.PROJECT_DOMAIN}.glitch.me`
  : `http://localhost:${PORT}`;
setInterval(() => {
  axios
    .get(`${appUrl}/ping`)
    .then((res) => {
      LogModel.savePingMeLog(res.data);
    })
    .catch((e) => LogModel.saveExceptionLog(e.message));
}, pingMeIn);
//
app.get("/ping", (req, res) => {
  res.send("ping me!");
});

// SHOW PING INFORMATION
app.get("/", async (req, res) => {
  const pingUrls = pitoBlogUrls;
  const pings = await Log.find({ type: "ping" })
    .sort({ timestamp: -1 })
    .limit(10)
    .catch((e) => LogModel.saveExceptionLog(e.message));
  //
  const pingMes = await Log.find({ type: "ping-me" })
    .sort({ timestamp: -1 })
    .limit(10)
    .catch((e) => LogModel.saveExceptionLog(e.message));

  //
  const exceptions = await Log.find({ type: "exception" })
    .sort({ timestamp: -1 })
    .limit(50)
    .catch((e) => LogModel.saveExceptionLog(e.message));

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
        pingUrlTimestamps: pings.map((item) =>
          Helper.toReadableTime(item.timestamp)
        ),
        pingMeTimestamps: pingMes.map((item) =>
          Helper.toReadableTime(item.timestamp)
        ),
        exceptions: exceptionMessages,
      },
      null,
      4
    )
  );
});

// RESET
app.get("/reset", async (req, res) => {
  const result = await Log.deleteMany().catch((e) =>
    LogModel.saveExceptionLog(e.message)
  );
  res.json(result);
});

//
app.listen(PORT, () => {
  console.info(`Server is running on port ${appUrl}`);
});
//
