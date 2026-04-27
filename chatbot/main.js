import OpenAI from "openai";
import express from "express";
import cors from "cors";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ===== Middleware =====
app.use(session({
  secret: process.env.SESSION_SECRET || "f83Ksd92jF!92jfK#29skdLslP0x_2Klm",
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));

// Restrict CORS to your own domain in production
const allowedOrigins = process.env.ALLOWED_ORIGIN
  ? [process.env.ALLOWED_ORIGIN]
  : "*";

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "front")));

// ===== OpenAI client =====
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const SYSTEM_PROMPT = `
You are a sharp, confident assistant for [svd pixel] — a web agency that builds high-performance websites, ranks them on Google, and deploys AI automation systems that save businesses 15–30 hours per week.
Your job is two things: answer questions about our services, and qualify leads.

SERVICES WE OFFER:
1. Web Development — custom websites, landing pages, e-commerce, web apps. Built fast, built to convert.
2. SEO & Google Ranking — we engineer every site to rank on the first page of Google. On-page SEO, technical SEO, Core Web Vitals.
3. AI Automation — we replace repetitive business tasks with custom AI systems. Lead qualification, CRM automation, AI chatbots, workflow automation, reporting.

YOUR TONE:
- Bold and direct. No fluff, no filler.
- Speak like a confident expert, not a salesperson.
- Short answers unless the user asks for detail.
- Never say "Great question!" or "Certainly!" — just answer.

HOW TO QUALIFY LEADS:
When someone shows interest in any service, ask these questions one at a time (not all at once):
1. What kind of business do you run?
2. What's the main problem you're trying to solve?
3. Have you worked with an agency before?

Once you have their answers, say something like:
"This sounds like a great fit. You can reach our team directly at svdpixel@gmail.com — or leave your contact details here and we'll reach out within 24 hours."
or
"Perfect — [name], we'll be in touch shortly at svdpixel@gmail.com. Feel free to ask me anything else about what we do."

WHAT YOU DON'T DO:
- Don't discuss pricing — say "our team will give you a custom quote based on your needs."
- Don't make guarantees about specific rankings or timelines.
- Don't go off-topic. If asked something unrelated, redirect: "I'm here to help with our services — want to know what we can do for your business?"
`;

const MAX_MESSAGES = 20;

// ===== Extract contact info from user message =====
function extractContactInfo(text, session) {
  if (!session.lead) session.lead = {};

  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
  if (emailMatch) session.lead.email = emailMatch[0];

  const phoneMatch = text.match(/(\+?\d[\d\s\-().]{7,}\d)/);
  if (phoneMatch) session.lead.phone = phoneMatch[1].trim();

  // Try to capture name if not already saved (simple heuristic: "I'm X" or "My name is X")
  if (!session.lead.name) {
    const nameMatch = text.match(/(?:i'?m|my name is)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/i);
    if (nameMatch) session.lead.name = nameMatch[1];
  }
}

// ===== Core chat logic =====
async function chatbotResponse(req) {
  const userInput = req.body.message;

  // Guard: reject empty messages
  if (!userInput || typeof userInput !== "string" || userInput.trim() === "") {
    throw new Error("Message cannot be empty.");
  }

  if (!req.session.chatHistory) {
    req.session.chatHistory = [
      { role: "system", content: SYSTEM_PROMPT }
    ];
  }

  const chatHistory = req.session.chatHistory;

  // Extract and save contact info before pushing to history
  extractContactInfo(userInput, req.session);

  chatHistory.push({ role: "user", content: userInput });

  // Keep system prompt + last (MAX_MESSAGES - 1) messages
  if (chatHistory.length > MAX_MESSAGES) {
    const systemPrompt = chatHistory[0];
    const trimmed = chatHistory.slice(-(MAX_MESSAGES - 1));
    req.session.chatHistory = [systemPrompt, ...trimmed];
  }

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: req.session.chatHistory,
    max_tokens: 400,
    temperature: 0.7
  });

  const reply = response.choices[0].message.content;
  req.session.chatHistory.push({ role: "assistant", content: reply });

  return reply;
}

// ===== Routes =====
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "front", "chat.html"));
});

app.post("/chat", async (req, res) => {
  try {
    const reply = await chatbotResponse(req);
    res.json({ reply });
  } catch (err) {
    console.error("Chat error:", err.message);
    const status = err.message === "Message cannot be empty." ? 400 : 500;
    res.status(status).json({ reply: err.message });
  }
});

// ===== View collected leads (protect this in production!) =====
// To secure this: add a middleware that checks a secret header or password
// Example: if (req.headers['x-admin-key'] !== process.env.ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' });
app.get("/leads", (req, res) => {
  const adminKey = req.headers["x-admin-key"];
  if (!process.env.ADMIN_KEY || adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.json({ lead: req.session.lead || null });
});

// ===== Start server =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
