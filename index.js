const axios = require("axios");
const express = require("express");
const mongoose = require("mongoose");

app = express();
app.use(express.json({ extended: false }));

main().catch((err) => console.log(err));

async function main() {
  await mongoose.connect(
    "mongodb+srv://admin:VhN1XrRdTvwG1TJX@hobbies.ba9s98h.mongodb.net/kaffeine?retryWrites=true&w=majority"
  );
}

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

//
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

let pingInterval = 1 * 60 * 1000;
setInterval(async () => {
  pingUrls(pitoBlogUrls);
  //
  savePingLog();
}, [pingInterval]);
// ping me
setInterval(() => {
  axios
    .get("https://kaffeine-eta.vercel.app/ping")
    .then((res) => {
      savePingMeLog(res.data);
    })
    .catch((e) => {
      saveExceptionLog(e.message);
    });
}, 1000);
//
app.get("/ping", (req, res) => {
  res.send("ping me!");
});

app.get("/", async (req, res) => {
  const pingUrls = pitoBlogUrls;
  try {
    const pings = await LogModel.find(
      { type: "ping" },
      { _id: 0, timestamp: 1 }
    )
      .sort({ timestamp: -1 })
      .limit(10);
    const pingDates = pings.map((ping) => ping.timestamp);
    //
    const pingMes = await LogModel.find(
      { type: "ping-me" },
      { _id: 0, message: 1, timestamp: 1 }
    )
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
          pingHistory: pingDates,
          exceptions: exceptionMessages,
          pingMeHistory: pingMes,
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
  console.log(`Server is running on port http://localhost:${PORT}`);
});
//
