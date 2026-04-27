// aiService.js — FIXED
// Groq COMPLETELY REMOVED from company/FAQ responses
// Only companyData.js facts are spoken — no guessing ever

const Groq = require("groq-sdk");
const { sendMessage, getLatestHRResponse, clearHRResponse } = require("../whatsapp");
const employees = require("../data/employees");
const company   = require("../data/companyData");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── SESSION ──
let session = createSession();
function createSession() {
  return {
    mode: "guest", employeeName: "", name: "",
    greeted: false, target: "", targetNumber: "",
    purpose: "", waiting: false, requestTime: 0,
    active: false, lastActivityTime: 0, askedWho: false
  };
}
function resetSession() {
  Object.values(employees).forEach(num => clearHRResponse(num));
  session = createSession();
  console.log("🔄 Session reset");
}
setInterval(() => {
  if (session.active && Date.now() - session.lastActivityTime > 120_000) {
    console.log("⏰ Auto-reset"); resetSession();
  }
}, 20_000);

// ── LANGUAGE DETECT ──
function isHindi(text) {
  const words = ["kya","kaun","kaha","kaise","hai","mujhe","aap","naam","ka","ki",
    "ke","kar","milna","milne","baat","chahiye","haan","nahi","ji","se","mera",
    "mere","karna","hun","hu","koi","kuch","wale","abhi","phir","kal","aaj"];
  return words.some(w => text.toLowerCase().includes(w));
}

// ── NAME EXTRACT ──
function extractName(message) {
  const patterns = [
    /my name is ([A-Za-z]+)/i, /i(?:'m| am) ([A-Za-z]+)/i,
    /mera naam ([A-Za-z]+)/i,  /main ([A-Za-z]+) h(?:oon|un|u)/i,
    /naam ([A-Za-z]+) hai/i,   /this is ([A-Za-z]+)/i,
    /call me ([A-Za-z]+)/i,
  ];
  for (const p of patterns) {
    const m = message.match(p);
    if (m) return cap(m[1]);
  }
  const words = message.trim().split(/\s+/);
  if (words.length === 1) {
    const w = words[0];
    const skip = ["hi","hello","hey","ok","yes","no","haan","nahi","okay","sure",
                  "please","thanks","bye","namaste","good","ek","ji","aur","kya",
                  "aap","main","mera","mujhe","hai","tha","kahan","where","what"];
    if (/^[A-Za-z]{2,20}$/.test(w) && !skip.includes(w.toLowerCase())) return cap(w);
  }
  return null;
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(); }

// ── COMPANY FAQ — ONLY from companyData.js, zero guessing ──
const FAQ = [
  { k: ["company name","company ka naam","naam kya hai","kaun si company"],
    a: `This is ${company.name}.` },
  { k: ["kya kaam","what do you do","kya banate","kya hai ye","about company","company kya"],
    a: `${company.name} is an electronics R&D and IoT solutions company.` },
  { k: ["kahan","kaha","location","address","city","where","kahaan","office kahan"],
    a: `Our office is in ${company.location}.` },
  { k: ["timing","timings","time","working hours","office time","kab khulta","kab band","kab se kab","band kab","khulta kab","office hours","open kab","close kab","closing","opening","office timing","company timing","kab tak","kitne baje"],
    a: "Office is open Monday to Saturday, 9 AM to 6 PM." },
  { k: ["founder","founders","kisne banaya","banaya","started by","established"],
    a: `Founded by ${company.founders.join(" and ")}.` },
  { k: ["service","services","kya provide","kya dete","kya offer"],
    a: `Our services: ${company.services.slice(0,5).join(", ")}.` },
  { k: ["product","products","kya products","kya bana"],
    a: `Our products: ${company.products.join(", ")}.` },
  { k: ["website","site","link","url","online"],
    a: `Website: ${company.website}` },
  { k: ["iot","internet of things"],
    a: "We specialize in IoT solutions that connect devices for smart automation." },
  { k: ["embedded","firmware","pcb"],
    a: "We build embedded systems and PCB designs end-to-end." },
  { k: ["technology","technologies","tech stack","tech","kya use karte"],
    a: `We work with: ${company.technologies.join(", ")}.` },
  { k: ["industry","field","domain"],
    a: `We work in ${company.industry}.` },
  { k: ["founded","since","kab se","established","kitne saal"],
    a: `${company.name} was founded in ${company.founded}.` },
];

// Topics that sound like company questions but we should NOT guess
const COMPANY_TOPICS = [
  "phone","mobile","contact","email","address","number","revenue","salary",
  "employees","staff","size","funding","profit","loss","turnover","branch",
  "floor","room","parking","canteen","pantry","hr number","ceo number"
];

function getFaqAnswer(text) {
  const lower = text.toLowerCase();

  // ✅ FAQ check FIRST — so "office timings" hits FAQ before COMPANY_TOPICS blocks it
  for (const rule of FAQ) {
    if (rule.k.some(k => lower.includes(k))) return rule.a;
  }

  // Only block after FAQ has had a chance to match
  if (COMPANY_TOPICS.some(t => lower.includes(t))) {
    return null; // will be redirected to HR in main flow
  }

  return null;
}

function isCompanyQuestion(text) {
  const lower = text.toLowerCase();
  const companyWords = ["company","oxymora","office","work","kaam","business",
    "service","product","technology","iot","embedded","founder","website","timing",
    "location","city","address","kahan","kya karta","kya hai","industry","founded"];
  return companyWords.some(w => lower.includes(w));
}

// ── MEETING INTENT ──
const MEET_TRIGGERS = [
  "meet","milna","milne","milni","appointment","discuss",
  "se milna","se baat","se contact","talk to","speak to",
  "visit","milne aaya","milne aayi","bula","bulao","contact karna","milenge"
];
const TARGET_MAP = {
  "ceo":"ceo","chief":"ceo","director":"ceo","boss":"ceo","management":"ceo",
  "hr":"hr","human resource":"hr","manpower":"hr",
  "abhay":"abhay",
  "developer":"developer","dev":"developer","software":"developer",
  "technical":"developer","tech":"developer","engineer":"developer",
};
function findTarget(text) {
  const lower = text.toLowerCase();
  if (!MEET_TRIGGERS.some(t => lower.includes(t))) return null;
  for (const alias in TARGET_MAP) {
    if (lower.includes(alias)) return TARGET_MAP[alias];
  }
  for (const key in employees) {
    if (lower.includes(key.toLowerCase())) return key;
  }
  return "unknown_target";
}

// ── PURPOSE (Groq — only for 2-4 word extraction, not displayed to user) ──
async function getPurpose(text) {
  try {
    const res = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant", max_tokens: 30,
      messages: [
        { role: "system", content: 'Extract visit purpose in 2-4 words. Reply ONLY JSON: {"purpose":"general meeting"}' },
        { role: "user", content: text }
      ]
    });
    const match = res.choices[0].message.content.match(/\{[^}]+\}/);
    if (match) return JSON.parse(match[0]);
  } catch {}
  return { purpose: "General meeting" };
}

// ── NOTIFY ──
async function notifyPerson(name, purpose, key) {
  const number = employees[key];
  if (!number) { console.error("❌ No number for:", key); return; }
  clearHRResponse(number);
  await sendMessage(number,
    `📢 Visitor Alert\n\nVisitor: ${name}\nTo meet: ${key.toUpperCase()}\nPurpose: ${purpose || "Meeting"}\n\nReply:\n1 → Coming now\n2 → 10 minutes\n3 → Not available`
  );
  console.log(`📤 Notified: ${key}`);
}

// ── TRIGGER NOTIFY helper ──
async function triggerNotify(text, key) {
  session.target       = key;
  session.targetNumber = employees[key];
  session.waiting      = true;
  session.requestTime  = Date.now();
  const pd = await getPurpose(text);
  session.purpose = pd.purpose || "Meeting";
  await notifyPerson(session.name, session.purpose, key);
}

// ── MAIN ──
async function getAIResponse(input) {
  const trimmed = input.trim();
  const msg     = trimmed.toLowerCase();
  const hindi   = isHindi(trimmed);

  if (msg.startsWith("employee_login:")) {
    const empName = trimmed.split(":")[1]?.trim() || "Employee";
    resetSession();
    Object.assign(session, {
      mode: "employee", employeeName: empName, name: empName,
      greeted: true, active: true, lastActivityTime: Date.now()
    });
    return { reply: null };
  }

  if (msg === "start") {
    resetSession();
    Object.assign(session, { mode: "guest", active: true, lastActivityTime: Date.now() });
    return {
      reply: hindi
        ? "Namaste! Oxymora Technology mein aapka swagat hai. Main Priya hoon. Aapka naam kya hai?"
        : "Hello! Welcome to Oxymora Technology. I'm Priya — may I know your name?"
    };
  }

  if (msg === "check") {
    if (!session.waiting || !session.targetNumber) return { reply: null };
    const data = getLatestHRResponse(session.targetNumber);
    if (data && data.time > session.requestTime) {
      clearHRResponse(session.targetNumber);
      session.waiting = false;
      const hr = data.reply;
      if (hr.toLowerCase().includes("not available")) {
        const prev = session.target;
        session.target = ""; session.targetNumber = ""; session.purpose = "";
        return {
          reply: hindi
            ? `${session.name} ji, ${prev.toUpperCase()} abhi available nahi hain. Kya aap kisi aur se milna chahenge?`
            : `${session.name}, ${prev.toUpperCase()} is not available right now. Would you like to meet someone else?`
        };
      }
      return { reply: hr };
    }
    return { reply: null };
  }

  if (msg === "visitor_left") { resetSession(); return { reply: null }; }

  session.lastActivityTime = Date.now();
  session.active = true;

  // ── Employee mode — only office basics, no company guessing ──
  if (session.mode === "employee") {
    const faq = getFaqAnswer(msg);
    if (faq) return { reply: faq };
    return {
      reply: hindi
        ? "Is baare mein HR ya concerned department se pooch sakte hain."
        : "Please check with HR or the concerned department for that."
    };
  }

  // ════════════ GUEST FLOW ════════════

  // STEP 1 — Name
  if (!session.name) {
    const name = extractName(trimmed);
    if (name) {
      session.name = name;
    } else {
      return { reply: hindi ? "Aapka naam kya hai?" : "May I know your name?" };
    }
  }

  // STEP 2 — Early meeting detection
  if (!session.target) {
    const t = findTarget(trimmed);
    if (t && t !== "unknown_target") {
      session.target       = t;
      session.targetNumber = employees[t];
    }
  }

  // STEP 3 — Greet once
  if (!session.greeted) {
    session.greeted = true;
    const h = new Date().getHours();
    const tg = h < 12 ? "Good Morning" : h < 18 ? "Good Afternoon" : "Good Evening";
    const greeting = hindi
      ? `Namaste ${session.name} ji, Oxymora mein aapka swagat hai!`
      : `${tg} ${session.name}, welcome to Oxymora Technology!`;

    if (session.target && !session.waiting) {
      await triggerNotify(trimmed, session.target);
      return {
        reply: hindi
          ? `${greeting} Maine ${session.target.toUpperCase()} ko inform kar diya. Please baith jaiye.`
          : `${greeting} I've notified ${session.target.toUpperCase()}. Please have a seat!`
      };
    }
    return {
      reply: hindi
        ? `${greeting} Kaise madad kar sakti hoon?`
        : `${greeting} How may I help you today?`
    };
  }

  // ── WAITING — complete silence ──
  if (session.waiting) {
    console.log("⏳ Waiting — ignoring:", trimmed);
    return { reply: null };
  }

  // STEP 4 — FAQ (only companyData.js facts)
  const faq = getFaqAnswer(msg);
  if (faq) return { reply: faq };

  // STEP 5 — Contact/phone/email asked → don't guess
  if (/phone|mobile|contact|email|number/.test(msg)) {
    return {
      reply: hindi
        ? "Contact details ke liye aap HR se mil sakte hain."
        : "Please meet HR for contact details."
    };
  }

  // STEP 6 — Meeting intent
  if (!session.target) {
    const t = findTarget(trimmed);
    if (t === "unknown_target") {
      if (!session.askedWho) {
        session.askedWho = true;
        return {
          reply: hindi
            ? "Aap kisse milna chahte hain — CEO, HR, Abhay, ya Developer team?"
            : "Who would you like to meet — CEO, HR, Abhay, or the Developer team?"
        };
      } else {
        // Asked once, still unclear → send to HR
        await triggerNotify(trimmed, "hr");
        return {
          reply: hindi
            ? `${session.name} ji, main HR ko inform kar deti hoon. Please baith jaiye.`
            : `${session.name}, I'm notifying HR to assist you. Please have a seat.`
        };
      }
    }
    if (t) {
      await triggerNotify(trimmed, t);
      return {
        reply: hindi
          ? `Bilkul! Maine ${t.toUpperCase()} ko inform kar diya. Please baith jaiye.`
          : `Sure! I've notified ${t.toUpperCase()}. Please have a seat.`
      };
    }
  }

  if (session.target && !session.waiting) {
    await triggerNotify(trimmed, session.target);
    return {
      reply: hindi
        ? `Maine ${session.target.toUpperCase()} ko inform kar diya. Please baith jaiye.`
        : `I've notified ${session.target.toUpperCase()}. Please have a seat.`
    };
  }

  // STEP 7 — Company question but not in FAQ → honest reply, NO GROQ
  if (isCompanyQuestion(msg)) {
    return {
      reply: hindi
        ? "Is baare mein mujhe exact details nahi pata. HR se pooch sakte hain."
        : "I don't have exact details on that. Please check with HR."
    };
  }

  // STEP 8 — Sounds like a request but unclear → ask to repeat
  const UNCLEAR_PATTERNS = [
    /milna|meet|baat|contact|bulao|kab|kaise|chahiye|help|problem|issue|kaam/i
  ];
  if (UNCLEAR_PATTERNS.some(p => p.test(msg))) {
    return {
      reply: hindi
        ? "Mujhe aapki baat samajh nahi aayi. Kya aap dobara bol sakte hain?"
        : "I'm sorry, I didn't understand that. Could you please repeat?"
    };
  }

  // STEP 9 — Completely off-topic → ask to repeat (not "I don't know")
  return {
    reply: hindi
      ? "Mujhe samajh nahi aaya. Kya aap dobara bol sakte hain?"
      : "I didn't quite catch that. Could you please say it again?"
  };
}

module.exports = { getAIResponse };