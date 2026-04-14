import OpenAI from "openai";
import express from "express";
import cors from "cors";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from front folder
app.use(express.static(path.join(__dirname, 'front')));

// ===== OpenAI client =====
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const SYSTEM_PROMPT = `
You are a professional AI consultant and chatbot developer assistant.
Explain benefits of AI chatbots for businesses.
Keep answers friendly, clear, concise, persuasive.
Always format answers using proper Markdown with bullet points instead of inline numbered paragraphs.
`;

// ===== Memory =====
app.use(
  session({
    secret: "f83Ksd92jF!92jfK#29skdLslP0x_2Klm",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === "production" }
  })
);
const MAX_MESSAGES = 20;

async function chatbotResponse(req) {

  const userInput = req.body.message;

  // Create session memory if not exists
  if (!req.session.chatHistory) {
    req.session.chatHistory = [
      { role: "system", content: SYSTEM_PROMPT }
    ];
  }

  const chatHistory = req.session.chatHistory;

  chatHistory.push({
    role: "user",
    content: userInput
  });

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

  chatHistory.push({
    role: "assistant",
    content: reply
  });

  return reply;
}

app.post("/chat", async (req, res) => {
  try {
    const reply = await chatbotResponse(req);
    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: "Server error" });
  }
});

// ===== Start server =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
