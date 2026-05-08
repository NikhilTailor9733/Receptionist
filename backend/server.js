require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");

const aiRoute = require("./routes/aiRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// Alert route
app.get("/alert", (req, res) => {
  console.log("🚨 Visitor detected at reception");
  res.sendStatus(200);
});

// Python backend test route
// app.get("/python-test", async (req, res) => {

//   try {

//     const response = await axios.get(
//       "http://127.0.0.1:5001/health"
//     );

//     res.json(response.data);

//   } catch (e) {

//     console.log("❌ Python backend error:", e.message);

//     res.status(500).json({
//       success: false,
//       error: "Python backend failed"
//     });

//   }

// });

// Python recognize route
// app.post("/recognize", async (req, res) => {

//   try {

//     const response = await axios.post(
//       "http://127.0.0.1:5001/recognize",
//       req.body,
//       {
//         headers: {
//           "Content-Type": "application/json"
//         }
//       }
//     );

//     res.json(response.data);

//   } catch (e) {

//     console.log("❌ Python recognize error:", e.message);

//     res.status(500).json({
//       success: false,
//       error: "Recognition failed"
//     });

//   }

// });

app.use("/api", aiRoute);

app.get("/", (req, res) => {
  res.send("🤖 AI Receptionist — Oxymo is online");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});