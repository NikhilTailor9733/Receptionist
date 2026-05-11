// whatsapp.js — FINAL FIX
// @lid IDs are WhatsApp internal IDs, NOT phone numbers
// Solution: store responses by ALL possible keys (lid + c.us variants)
// so lookup by phone number always finds it


const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");
const express = require("express");

let latestQR = null;

let latestResponses = {};
// We store the SAME response under MULTIPLE keys so any lookup finds it

const client = new Client({
  authStrategy: new LocalAuth(),

  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
    "--disable-dev-shm-usage"
    ]
  }
});

client.on("qr", async (qr) => {
  console.log("📱 QR Generated");

  latestQR = await QRCode.toDataURL(qr);
});

// Track: lid → phone number mapping (built when we SEND messages)
// sendMessage knows the phone number, so we record: "when reply comes from X, store it for phone Y"
let pendingLookup = {};
// { "917357834059@c.us": true }  — numbers we sent to recently

client.on("message", async (msg) => {
  if (msg.fromMe) return;
  const sender = msg.from;
  const text   = msg.body.toLowerCase().trim();

  console.log("📩 Message from:", sender, "→", text);

  let reply = null;
  if (text === "1" || text.includes("coming"))
    reply = "The person is on the way to meet you.";
  else if (text === "2" || text === "10" || text.includes("10 min"))
    reply = "The person will be available in 10 minutes.";
  else if (text === "3" || text.includes("not available") || text.includes("busy"))
    reply = "The person is not available right now.";

  if (reply) {
    // Store under sender's key (whatever format)
    latestResponses[sender] = { reply, time: Date.now() };

    // ALSO store under every pending phone number key
    // because we don't know which @c.us maps to this @lid
    for (const phoneKey of Object.keys(pendingLookup)) {
      latestResponses[phoneKey] = { reply, time: Date.now() };
      console.log("✅ Also stored for phone key:", phoneKey);
    }

    console.log("✅ Stored for", sender, ":", reply);
    console.log("📦 Keys:", Object.keys(latestResponses));
  }
});


client.initialize();

async function sendMessage(number, message) {
  const chatId = number + "@c.us";
  
  // Track this number as pending — any incoming reply will also be stored here
  pendingLookup[chatId] = true;
  
  // Clear old response for this number
  delete latestResponses[chatId];

  console.log("📤 Sending to:", chatId);
  await client.sendMessage(chatId, message);
}

function getLatestHRResponse(number) {
  const chatId = number + "@c.us";
  const data   = latestResponses[chatId];
  
  if (!data) {
    console.log("🔍 No response for:", chatId, "| Keys:", Object.keys(latestResponses));
    return null;
  }

  if (Date.now() - data.time > 5 * 60 * 1000) {
    delete latestResponses[chatId];
    return null;
  }

  console.log("✅ Found response for:", chatId);
  return data;
}

function clearHRResponse(number) {
  const chatId = number + "@c.us";
  delete latestResponses[chatId];
  delete pendingLookup[chatId];
  // Also clear any @lid keys (cleanup)
  for (const key of Object.keys(latestResponses)) {
    if (key.includes("@lid")) delete latestResponses[key];
  }
}

function clearAllResponses() {
  latestResponses = {};
  pendingLookup   = {};
}

function getAllResponses() {
  return latestResponses;
}

module.exports = { sendMessage, getLatestHRResponse, clearHRResponse, clearAllResponses, getAllResponses, getLatestQR: () => latestQR };