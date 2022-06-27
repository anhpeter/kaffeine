const axios = require("axios");
const express = require("express");

app = express();
app.use(express.json({ extended: false }));

app.get("/", (req, res) => {
  res.json({ message: "kaffeine works" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});
