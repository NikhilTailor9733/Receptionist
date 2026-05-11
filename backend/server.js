require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const whatsapp = require("./whatsapp");

const aiRoute = require("./routes/aiRoutes");

const app = express();
const upload = multer();

const multer = require("multer");
const FormData = require("form-data");

app.use(cors());
app.use(express.json());


// Alert route
app.get("/alert", (req, res) => {
  console.log("🚨 Visitor detected at reception");
  res.sendStatus(200);
});

// Python backend test route
app.get("/python-test", async (req, res) => {

  try {

    const response = await axios.get(
      "http://127.0.0.1:5001/health"
    );

    res.json(response.data);

  } catch (e) {

    console.log("❌ Python backend error:", e.message);

    res.status(500).json({
      success: false,
      error: "Python backend failed"
    });

  }

});

// Python recognize route
app.post(
  "/recognize",
  upload.single("image"),
  async (req, res) => {

    try {

      if (!req.file) {

        return res.status(400).json({
          success: false,
          error: "No image received"
        });

      }

      const form = new FormData();

      form.append(
        "image",
        req.file.buffer,
        {
          filename: "scan.jpg",
          contentType: "image/jpeg"
        }
      );

      const response = await axios.post(
        "http://127.0.0.1:5001/recognize",
        form,
        {
          headers: form.getHeaders()
        }
      );

      res.json(response.data);

    } catch (e) {

      console.log(
        "❌ Python recognize error:",
        e.response?.data || e.message
      );

      res.status(500).json({
        success: false,
        error: e.message
      });

    }

  }
);

app.use("/api", aiRoute);

app.get("/", (req, res) => {

  const qr = whatsapp.getLatestQR();

  if (!qr) {

    return res.send(`
      <h2 style="font-family:sans-serif">
        ⏳ Waiting for WhatsApp QR...
      </h2>
    `);

  }

  res.send(`
    <html>

      <body style="
        background:#111;
        display:flex;
        justify-content:center;
        align-items:center;
        height:100vh;
        flex-direction:column;
        font-family:sans-serif;
      ">

        <h2 style="color:white">
          Scan WhatsApp QR
        </h2>

        <img src="${qr}" />

      </body>

    </html>
  `);

});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});