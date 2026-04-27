require("dotenv").config();

const express  = require("express");
const cors     = require("cors");
const aiRoute  = require("./routes/aiRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// Alert route (visitor detected at camera)
app.get("/alert", (req, res) => {
  console.log("🚨 Visitor detected at reception");
  res.sendStatus(200);
});

app.use("/api", aiRoute);

app.get("/", (req, res) => {
  res.send("🤖 AI Receptionist — Oxymo is online");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});