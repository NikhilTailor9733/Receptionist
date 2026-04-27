// visitors.js — Unknown visitor memory store
// Visitors are stored by face embedding hash / first-seen name
// So next time they come, we recognize them by name without asking

const fs   = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "visitors_db.json");

// Load existing visitors
function loadVisitors() {
  try {
    if (fs.existsSync(FILE)) {
      return JSON.parse(fs.readFileSync(FILE, "utf8"));
    }
  } catch {}
  return {};
}

// Save all visitors
function saveVisitors(data) {
  try {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.error("❌ Could not save visitors:", e);
  }
}

// In-memory cache
let visitors = loadVisitors();

// Save a new visitor (key = lowercase name)
function saveVisitor(name, extraInfo = {}) {
  const key = name.toLowerCase().trim();
  visitors[key] = {
    name,
    firstSeen: visitors[key]?.firstSeen || new Date().toISOString(),
    lastSeen:  new Date().toISOString(),
    visits:    (visitors[key]?.visits || 0) + 1,
    ...extraInfo
  };
  saveVisitors(visitors);
  console.log(`✅ Visitor saved: ${name} (total visits: ${visitors[key].visits})`);
  return visitors[key];
}

// Get visitor by name
function getVisitor(name) {
  if (!name) return null;
  return visitors[name.toLowerCase().trim()] || null;
}

// Get all visitors
function getAllVisitors() {
  return visitors;
}

module.exports = { saveVisitor, getVisitor, getAllVisitors };