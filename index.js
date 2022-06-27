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

//
const pitoBlogUrls = [
  "https://pitoghichep.com",
  "https://pitoblogapi.as.r.appspot.com",
];

const pingUrls = (urls) => {
  urls.forEach((url) =>
    axios.get(url).catch((e) => {
      new LogModel({ type: "exception", message: e.message }).save();
      console.error(`failed to ping ${url}`);
    })
  );
};

let pingInterval = 10000;
let lastPing;
setInterval(async () => {
  pingUrls(pitoBlogUrls);
  //
  lastPing = new Date();
  new LogModel({
    type: "ping",
    timestamp: lastPing.toISOString(),
  }).save();
}, [pingInterval]);

const cvtDateString = (timestamp) => {
  const date = new Date(timestamp);
  const dateString = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  return dateString;
};

app.get("/", async (req, res) => {
  const pingUrls = pitoBlogUrls;
  try {
    const pings = await LogModel.find({ type: "ping" })
      .sort({ timestamp: -1 })
      .limit(50);
    const pingDates = pings.map((ping) => cvtDateString(ping.timestamp));
    const exceptions = await LogModel.find({ type: "exception" })
      .sort({ timestamp: -1 })
      .limit(50);
    const exceptionMessages = exceptions.map((ex) => ({
      message: ex.message,
      timestamp: cvtDateString(ex.timestamp),
    }));
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify(
        {
          message: "kaffeine works",
          pingUrls,
          pingHistory: pingDates,
          exceptions: exceptionMessages,
        },
        null,
        4
      )
    );
  } catch (e) {
    new LogModel({ type: "exception", message: e.message }).save();
    res.status(500);
    res.json({ message: "failed to fetch ping history" });
  }
});
app.get("/reset", async (req, res) => {
  try {
    const result = await LogModel.deleteMany();
    res.json(result);
  } catch (e) {
    new LogModel({ type: "exception", message: e.message }).save();
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
