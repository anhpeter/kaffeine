const axios = require("axios");
const express = require("express");

app = express();
app.use(express.json({ extended: false }));

//
const pitoBlogUrls = [
  "https://pitoghichep.com",
  "https://pitoblogapi.as.r.appspot.com",
];

const pingUrls = (urls) => {
  urls.forEach((url) => axios.get(url));
};

let pingInterval = 1 * 60 * 1000;
let pingHistory = [];
let lastPing;
setInterval(() => {
  lastPing = new Date();
  const lastPingDateString = `${lastPing.toLocaleDateString()} ${lastPing.toLocaleTimeString()}`;
  pingHistory = [lastPingDateString, ...pingHistory.slice(0, 999)];
  pingUrls(pitoBlogUrls);
}, [pingInterval]);

app.get("/", (req, res) => {
  const pingUrls = pitoBlogUrls;
  res.setHeader("Content-Type", "application/json");
  res.end(
    JSON.stringify(
      { message: "kaffeine works", pingUrls, pingHistory },
      null,
      4
    )
  );
});

//
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});
