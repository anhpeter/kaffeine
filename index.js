const axios = require("axios");
const express = require("express");
const mongoose = require("mongoose");
const moment = require("moment");

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
    const diffMinutes = moment(new Date()).diff(timestamp, "minutes");
    const result = `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
    return result;
  },
};

// CONSTANTS
const PORT = process.env.PORT || 3000;
const pingUrlIn = 1 * 60 * 1000;
const pingMeIn = 1 * 60 * 1000;
const pitoBlogUrls = [
  "https://pitoghichep.com",
  "https://pitoblogapi.as.r.appspot.com",
];

const pingUrls = (urls) => {
  urls.forEach((url) =>
    axios.get(url).catch((e) => {
      LogModel.saveExceptionLog(e.message);
      console.error(`failed to ping ${url}`);
    })
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
    .catch((e) => {
      LogModel.saveExceptionLog(e.message);
    });
}, pingMeIn);
//
app.get("/ping", (req, res) => {
  res.send("ping me!");
});

// SHOW PING INFORMATION
app.get("/", async (req, res) => {
  const pingUrls = pitoBlogUrls;
  try {
    const pings = await Log.find({ type: "ping" })
      .sort({ timestamp: -1 })
      .limit(10);
    //
    const pingMes = await Log.find({ type: "ping-me" })
      .sort({ timestamp: -1 })
      .limit(10);
    //
    const exceptions = await Log.find({ type: "exception" })
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
          pingHistory: pings.map((item) =>
            Helper.toReadableTime(item.timestamp)
          ),
          exceptions: exceptionMessages,
          pingMeHistory: pingMes.map((item) =>
            Helper.toReadableTime(item.timestamp)
          ),
        },
        null,
        4
      )
    );
  } catch (e) {
    LogModel.saveExceptionLog(e.message);
    res.status(500);
    res.json({ message: "failed to fetch ping history" });
  }
});

// RESET
app.get("/reset", async (req, res) => {
  try {
    const result = await Log.deleteMany();
    res.json(result);
  } catch (e) {
    LogModel.saveExceptionLog(e.message);
    res.status(500);
    res.json({ message: "failed to reset" });
  }
});

//
app.listen(PORT, () => {
  console.info(`Server is running on port ${appUrl}`);
});
//
