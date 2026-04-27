import OpenAI from "openai";
import express from "express";
import cors from "cors";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ===== Middleware first =====
app.use(session({
  secret: "f83Ksd92jF!92jfK#29skdLslP0x_2Klm",
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === "production" }
}));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'front')));

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
"This sounds like a great fit. Let me get your contact details and our team will reach out within 24 hours."

Then ask for:
- Their name
- Email address or phone number (whichever they prefer)

After collecting their info, confirm with:
"Perfect — [name], we'll be in touch shortly. In the meantime, feel free to ask me anything else about what we do."

WHAT YOU DON'T DO:
- Don't discuss pricing — say "our team will give you a custom quote based on your needs."
- Don't make guarantees about specific rankings or timelines.
- Don't go off-topic. If asked something unrelated, redirect: "I'm here to help with our services — want to know what we can do for your business?"
`;

const MAX_MESSAGES = 20;

async function chatbotResponse(req) {
  const userInput = req.body.message;
  if (!req.session.chatHistory) {
    req.session.chatHistory = [
      { role: "system", content: SYSTEM_PROMPT }
    ];
  }
  const chatHistory = req.session.chatHistory;
  chatHistory.push({ role: "user", content: userInput });
  if (chatHistory.length > MAX_MESSAGES) {
    chatHistory.splice(1, chatHistory.length - MAX_MESSAGES);
  }
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: chatHistory,
    max_tokens: 400,
    temperature: 0.7
  });
  const reply = response.choices[0].message.content;
  chatHistory.push({ role: "assistant", content: reply });
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
    console.error(err);
    res.status(500).json({ reply: err.message });
  }
});

// ===== Start server =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
