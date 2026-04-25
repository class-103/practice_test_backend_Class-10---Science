const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

// 🔥 Load allowed emails with expiry
let students = JSON.parse(fs.readFileSync("students.json"));

// 🔐 Store active sessions
let activeSessions = {};

// 🔹 Check expiry (using expiresOn)
function isExpired(expiresOn) {
  const expiryDate = new Date(expiresOn);
  const today = new Date();
  return today > expiryDate;
}

// === LOGIN ===
app.post("/login", (req, res) => {
  const { email, deviceId } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  const normalizedEmail = email.toLowerCase();

  // 🔍 Check ONLY allowed emails
  const student = students.find(
    s => s.email.toLowerCase() === normalizedEmail
  );

  // ❌ Not allowed
  if (!student) {
    return res.json({ notAllowed: true });
  }

  // 🔥 Check expiry
  if (isExpired(student.expiresOn)) {
    return res.json({ expired: true });
  }

  // 🔐 Single device login
  const token = Math.random().toString(36).substring(2);
  activeSessions[normalizedEmail] = {
    token,
    deviceId
  };

  console.log("✅ Login:", normalizedEmail);

  res.json({ token });
});

// === VALIDATE ===
app.post("/validate", (req, res) => {
  const { email, token, deviceId } = req.body;

  if (!email || !token) return res.json({ valid: false });

  const normalizedEmail = email.toLowerCase();

  const student = students.find(
    s => s.email.toLowerCase() === normalizedEmail
  );

  // ❌ Not allowed
  if (!student) return res.json({ valid: false });

  // 🔥 Check expiry again
  if (isExpired(student.expiresOn)) {
    return res.json({ valid: false, expired: true });
  }

  const session = activeSessions[normalizedEmail];

  // 🔐 Check token + device
  if (!session) return res.json({ valid: false });

  if (session.token !== token) {
    return res.json({ valid: false });
  }

  if (session.deviceId !== deviceId) {
    return res.json({ valid: false });
  }

  res.json({ valid: true });
});

// === STATIC FILES ===
app.use(express.static(path.join(__dirname, "Public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "Public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
