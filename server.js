const http = require("http");
const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const nodemailer = require("nodemailer");

const ROOT_DIR = __dirname;
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT_DIR, "data");
const CONTACTS_FILE = path.join(DATA_DIR, "contacts.json");
const PORT = Number(process.env.PORT) || 3000;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = String(process.env.SMTP_SECURE || "").toLowerCase() === "true" || SMTP_PORT === 465;
const EMAIL_CONFIGURED =
  Boolean(process.env.CONTACT_TO_EMAIL) &&
  Boolean(process.env.MAIL_FROM) &&
  ((Boolean(process.env.SMTP_SERVICE) && Boolean(process.env.SMTP_USER) && Boolean(process.env.SMTP_PASS)) ||
    (Boolean(process.env.SMTP_HOST) && Boolean(process.env.SMTP_USER) && Boolean(process.env.SMTP_PASS)));

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const CONVERSION_CATEGORIES = {
  Length: {
    type: "factor",
    units: {
      meter: 1,
      kilometer: 1000,
      centimeter: 0.01,
      millimeter: 0.001,
      mile: 1609.344,
      yard: 0.9144,
      foot: 0.3048,
      inch: 0.0254
    }
  },
  Weight: {
    type: "factor",
    units: {
      kilogram: 1,
      gram: 0.001,
      milligram: 0.000001,
      pound: 0.45359237,
      ounce: 0.028349523125
    }
  },
  Area: {
    type: "factor",
    units: {
      "square meter": 1,
      "square kilometer": 1000000,
      "square foot": 0.09290304,
      acre: 4046.8564224,
      hectare: 10000
    }
  },
  Volume: {
    type: "factor",
    units: {
      liter: 1,
      milliliter: 0.001,
      "cubic meter": 1000,
      gallon: 3.785411784,
      cup: 0.2365882365
    }
  },
  Time: {
    type: "factor",
    units: {
      second: 1,
      minute: 60,
      hour: 3600,
      day: 86400
    }
  },
  Temperature: {
    type: "temperature",
    units: {
      Celsius: "C",
      Fahrenheit: "F",
      Kelvin: "K"
    }
  }
};

async function ensureStorage() {
  await fs.promises.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.promises.access(CONTACTS_FILE);
  } catch (error) {
    await fs.promises.writeFile(CONTACTS_FILE, "[]", "utf8");
  }
}

function createServer() {
  return http.createServer(async (req, res) => {
    try {
      if (req.url === "/api/health" && req.method === "GET") {
        return sendJson(res, 200, {
          status: "ok",
          service: "StudentUtilityTools API",
          emailConfigured: EMAIL_CONFIGURED
        });
      }

      if (req.url === "/api/contact" && req.method === "POST") {
        const payload = await parseJsonBody(req);
        const result = await handleContact(payload);
        return sendJson(res, 200, result);
      }

      if (req.url === "/api/attendance" && req.method === "POST") {
        const payload = await parseJsonBody(req);
        return sendJson(res, 200, calculateAttendance(payload));
      }

      if (req.url === "/api/cgpa" && req.method === "POST") {
        const payload = await parseJsonBody(req);
        return sendJson(res, 200, calculateCgpa(payload));
      }

      if (req.url === "/api/percentage" && req.method === "POST") {
        const payload = await parseJsonBody(req);
        return sendJson(res, 200, calculatePercentage(payload));
      }

      if (req.url === "/api/convert" && req.method === "POST") {
        const payload = await parseJsonBody(req);
        return sendJson(res, 200, convertUnits(payload));
      }

      if (req.url === "/api/grammar" && req.method === "POST") {
        const payload = await parseJsonBody(req);
        return sendJson(res, 200, analyzeGrammar(payload));
      }

      if (req.method === "GET") {
        return serveStaticFile(req, res);
      }

      return sendJson(res, 404, { error: "Route not found." });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return sendJson(res, statusCode, {
        error: error.message || "Internal server error."
      });
    }
  });
}

async function parseJsonBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString("utf8").trim();
  if (!rawBody) {
    return {};
  }

  try {
    return JSON.parse(rawBody);
  } catch (error) {
    throw createError(400, "Request body must be valid JSON.");
  }
}

async function handleContact(payload) {
  const name = sanitizeText(payload.name);
  const email = sanitizeText(payload.email);
  const message = sanitizeText(payload.message);

  if (!name || !email || !message) {
    throw createError(400, "Please complete all contact form fields.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError(400, "Please enter a valid email address.");
  }

  const ticketId = "SUT-" + randomUUID().slice(0, 8).toUpperCase();
  const submission = {
    id: ticketId,
    name,
    email,
    message,
    createdAt: new Date().toISOString()
  };

  const contacts = JSON.parse(await fs.promises.readFile(CONTACTS_FILE, "utf8"));
  contacts.push(submission);
  await fs.promises.writeFile(CONTACTS_FILE, JSON.stringify(contacts, null, 2), "utf8");

  await sendContactEmail(submission);

  return {
    message: "Message sent successfully.",
    ticketId
  };
}

async function sendContactEmail(submission) {
  if (!EMAIL_CONFIGURED) {
    throw createError(503, "Email delivery is not configured on the server yet.");
  }

  const transporter = createMailTransporter();

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: process.env.CONTACT_TO_EMAIL,
    replyTo: submission.email,
    subject: "New StudentUtilityTools contact message [" + submission.id + "]",
    text: [
      "Reference ID: " + submission.id,
      "Name: " + submission.name,
      "Email: " + submission.email,
      "Created At: " + submission.createdAt,
      "",
      "Message:",
      submission.message
    ].join("\n"),
    html:
      "<h2>New StudentUtilityTools contact message</h2>" +
      "<p><strong>Reference ID:</strong> " +
      escapeHtml(submission.id) +
      "</p>" +
      "<p><strong>Name:</strong> " +
      escapeHtml(submission.name) +
      "</p>" +
      "<p><strong>Email:</strong> " +
      escapeHtml(submission.email) +
      "</p>" +
      "<p><strong>Created At:</strong> " +
      escapeHtml(submission.createdAt) +
      "</p>" +
      "<p><strong>Message:</strong></p>" +
      "<p>" +
      escapeHtml(submission.message).replace(/\n/g, "<br>") +
      "</p>"
  });
}

function createMailTransporter() {
  const options = {
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  };

  if (process.env.SMTP_SERVICE) {
    options.service = process.env.SMTP_SERVICE;
  } else {
    options.host = process.env.SMTP_HOST;
    options.port = SMTP_PORT;
    options.secure = SMTP_SECURE;
  }

  return nodemailer.createTransport(options);
}

function calculateAttendance(payload) {
  const total = Number(payload.totalClasses);
  const attended = Number(payload.attendedClasses);
  const target = Number(payload.targetAttendance);

  if (!Number.isFinite(total) || !Number.isFinite(attended) || !Number.isFinite(target)) {
    throw createError(400, "Please enter valid numeric values.");
  }

  if (total <= 0 || attended < 0 || attended > total || target <= 0 || target > 100) {
    throw createError(400, "Classes and target values must be within a valid range.");
  }

  const currentAttendance = round((attended / total) * 100);

  if (currentAttendance >= target) {
    const safeLeaves = target === 100 ? 0 : Math.floor((100 * attended) / target - total);
    return {
      currentAttendance,
      summary: "You are meeting your target attendance.",
      action:
        safeLeaves > 0
          ? "You can miss " + safeLeaves + " more class" + pluralize(safeLeaves) + " and still stay above " + formatNumber(target) + "%."
          : "You should avoid missing any upcoming classes if you want to stay at or above " + formatNumber(target) + "%."
    };
  }

  if (target === 100) {
    return {
      currentAttendance,
      summary: "You are currently below your target attendance.",
      action:
        attended === total
          ? "You must attend every upcoming class to maintain 100% attendance."
          : "Reaching 100% is no longer possible because at least one class has already been missed."
    };
  }

  const classesNeeded = Math.ceil((target * total - 100 * attended) / (100 - target));

  return {
    currentAttendance,
    summary: "You are currently below your target attendance.",
    action:
      "Attend the next " +
      classesNeeded +
      " class" +
      pluralize(classesNeeded) +
      " without missing any to reach " +
      formatNumber(target) +
      "%."
  };
}

function calculateCgpa(payload) {
  const subjects = Array.isArray(payload.subjects) ? payload.subjects : [];

  if (!subjects.length) {
    throw createError(400, "Add at least one subject before calculating CGPA.");
  }

  let totalCredits = 0;
  let totalPoints = 0;

  subjects.forEach((subject) => {
    const name = sanitizeText(subject.name);
    const gradePoint = Number(subject.gradePoint);
    const credit = Number(subject.credit);

    if (!name) {
      throw createError(400, "Each CGPA row needs a subject name.");
    }

    if (!Number.isFinite(gradePoint) || gradePoint < 0 || gradePoint > 10) {
      throw createError(400, "Grade points must be between 0 and 10.");
    }

    if (!Number.isFinite(credit) || credit <= 0) {
      throw createError(400, "Credits must be greater than zero.");
    }

    totalCredits += credit;
    totalPoints += gradePoint * credit;
  });

  return {
    cgpa: round(totalPoints / totalCredits),
    totalCredits: round(totalCredits),
    totalPoints: round(totalPoints)
  };
}

function calculatePercentage(payload) {
  const subjects = Array.isArray(payload.subjects) ? payload.subjects : [];

  if (!subjects.length) {
    throw createError(400, "Add at least one subject before calculating percentage.");
  }

  let totalObtained = 0;
  let totalMaximum = 0;

  subjects.forEach((subject) => {
    const name = sanitizeText(subject.name);
    const obtained = Number(subject.obtained);
    const maximum = Number(subject.maximum);

    if (!name) {
      throw createError(400, "Each percentage row needs a subject name.");
    }

    if (!Number.isFinite(obtained) || obtained < 0) {
      throw createError(400, "Obtained marks must be zero or more.");
    }

    if (!Number.isFinite(maximum) || maximum <= 0) {
      throw createError(400, "Maximum marks must be greater than zero.");
    }

    if (obtained > maximum) {
      throw createError(400, "Obtained marks cannot be greater than maximum marks.");
    }

    totalObtained += obtained;
    totalMaximum += maximum;
  });

  return {
    obtainedMarks: round(totalObtained),
    maximumMarks: round(totalMaximum),
    percentage: round((totalObtained / totalMaximum) * 100)
  };
}

function convertUnits(payload) {
  const category = CONVERSION_CATEGORIES[payload.category];
  const value = Number(payload.value);
  const fromUnit = sanitizeText(payload.fromUnit);
  const toUnit = sanitizeText(payload.toUnit);

  if (!category) {
    throw createError(400, "Please choose a valid conversion category.");
  }

  if (!Number.isFinite(value)) {
    throw createError(400, "Please enter a valid number to convert.");
  }

  if (!(fromUnit in category.units) || !(toUnit in category.units)) {
    throw createError(400, "Please choose valid units for conversion.");
  }

  let convertedValue;
  let note;

  if (category.type === "factor") {
    convertedValue = (value * category.units[fromUnit]) / category.units[toUnit];
    note = "Converted via a shared base unit for " + payload.category.toLowerCase() + ".";
  } else {
    convertedValue = convertTemperature(value, fromUnit, toUnit);
    note = "Temperature conversion uses direct Celsius, Fahrenheit, and Kelvin formulas.";
  }

  return {
    convertedValue: round(convertedValue),
    note
  };
}

function analyzeGrammar(payload) {
  const text = sanitizeText(payload.text);

  if (!text) {
    throw createError(400, "Enter some text to run the grammar checker.");
  }

  const issues = [];
  let corrected = text;

  const directReplacements = [
    ["alot", "a lot"],
    ["definately", "definitely"],
    ["recieve", "receive"],
    ["seperate", "separate"],
    ["occured", "occurred"],
    ["grammer", "grammar"],
    ["attendence", "attendance"],
    ["dont", "don't"],
    ["cant", "can't"],
    ["wont", "won't"],
    ["im", "I'm"],
    ["ive", "I've"],
    ["didnt", "didn't"],
    ["isnt", "isn't"],
    ["arent", "aren't"]
  ];

  directReplacements.forEach(([original, replacement]) => {
    const pattern = new RegExp("\\b" + original + "\\b", "gi");
    if (pattern.test(corrected)) {
      corrected = corrected.replace(pattern, replacement);
      issues.push('Replaced "' + original + '" with "' + replacement + '".');
    }
  });

  if (/\b(\w+)\s+\1\b/i.test(corrected)) {
    corrected = corrected.replace(/\b(\w+)\s+\1\b/gi, "$1");
    issues.push("Removed repeated consecutive words.");
  }

  if (/\bi\b/.test(corrected)) {
    corrected = corrected.replace(/\bi\b/g, "I");
    issues.push('Capitalized the pronoun "I".');
  }

  if (/\s+([,.;!?])/g.test(corrected)) {
    corrected = corrected.replace(/\s+([,.;!?])/g, "$1");
    issues.push("Removed extra spaces before punctuation.");
  }

  if (/ {2,}/.test(corrected)) {
    corrected = corrected.replace(/ {2,}/g, " ");
    issues.push("Collapsed multiple spaces into single spaces.");
  }

  corrected = corrected
    .split(/([.!?]\s*)/)
    .reduce((sentences, part, index, parts) => {
      if (index % 2 === 0) {
        const punctuation = parts[index + 1] || "";
        const combined = (part + punctuation).trim();
        if (combined) {
          sentences.push(combined);
        }
      }
      return sentences;
    }, [])
    .map((sentence) => sentence.charAt(0).toUpperCase() + sentence.slice(1))
    .join(" ");

  if (corrected && text.charAt(0) === text.charAt(0).toLowerCase()) {
    issues.push("Capitalized sentence beginnings.");
  }

  corrected = corrected.replace(/\b([Aa])\s+([aeiouAEIOU]\w*)/g, (_, article, word) => {
    issues.push('Adjusted "a" to "an" before a vowel sound.');
    return article === "A" ? "An " + word : "an " + word;
  });

  corrected = corrected.replace(/\b([Aa])n\s+([^aeiouAEIOU\s]\w*)/g, (_, article, word) => {
    issues.push('Adjusted "an" to "a" before a consonant sound.');
    return article === "A" ? "A " + word : "a " + word;
  });

  if (!/[.!?]$/.test(corrected)) {
    corrected += ".";
    issues.push("Added ending punctuation.");
  }

  corrected = corrected.replace(/\s+/g, " ").trim();

  return {
    issueCount: Array.from(new Set(issues)).length,
    suggestions: Array.from(new Set(issues)),
    corrected
  };
}

function convertTemperature(value, fromUnit, toUnit) {
  let celsius;

  if (fromUnit === "Celsius") {
    celsius = value;
  } else if (fromUnit === "Fahrenheit") {
    celsius = ((value - 32) * 5) / 9;
  } else {
    celsius = value - 273.15;
  }

  if (toUnit === "Celsius") {
    return celsius;
  }

  if (toUnit === "Fahrenheit") {
    return (celsius * 9) / 5 + 32;
  }

  return celsius + 273.15;
}

async function serveStaticFile(req, res) {
  const requestPath = req.url === "/" ? "/index.html" : req.url;
  const decodedPath = decodeURIComponent(requestPath.split("?")[0]);
  const filePath = path.join(ROOT_DIR, decodedPath);

  if (!filePath.startsWith(ROOT_DIR)) {
    throw createError(403, "Forbidden.");
  }

  let stat;
  try {
    stat = await fs.promises.stat(filePath);
  } catch (error) {
    throw createError(404, "File not found.");
  }

  if (!stat.isFile()) {
    throw createError(404, "File not found.");
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const file = await fs.promises.readFile(filePath);

  res.writeHead(200, { "Content-Type": contentType });
  res.end(file);
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });
  res.end(JSON.stringify(payload));
}

function createError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function sanitizeText(value) {
  return String(value || "").trim();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function round(value) {
  return Number(value.toFixed(2));
}

function formatNumber(value) {
  return Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2
  });
}

function pluralize(count) {
  return count === 1 ? "" : "es";
}

async function startServer(port = PORT) {
  await ensureStorage();
  const server = createServer();

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "0.0.0.0", () => resolve(server));
  });
}

if (require.main === module) {
  startServer()
    .then(() => {
      console.log("StudentUtilityTools running on http://localhost:" + PORT);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  CONVERSION_CATEGORIES,
  analyzeGrammar,
  calculateAttendance,
  calculateCgpa,
  calculatePercentage,
  convertUnits,
  createServer,
  startServer
};
