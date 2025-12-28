import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import ChatService from "./services/chat.service";
import chatRoutes from "./routes/chat.route";

// 1. Load Environment Variables
dotenv.config();

const PORT = process.env.PORT || 5000;
const API_KEY = process.env.GEMINI_API_KEY;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/ai-chat-agent";
// Using the "Lite" model which is available in your list and fast
const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

if (!API_KEY) {
  console.error("❌ GEMINI_API_KEY is missing in .env file");
  process.exit(1);
}

// 2. System Instructions
const SYSTEM_INSTRUCTION = `You are a helpful support agent for a small e-commerce store. Answer clearly and concisely.
Store Details:
- Shipping: USA only. Standard shipping 5-7 business days.
- Returns: Accepted within 30 days if original condition. Email support@example.com.
- Support Hours: Mon-Fri, 9 AM - 5 PM EST.`;

// 3. Chat Service
const chatService = new ChatService(API_KEY, MODEL_NAME, SYSTEM_INSTRUCTION);

// 4. Express App Setup
const app = express();

app.use(helmet());
app.use(cors({ origin: "*" }));
app.use(express.json());

// Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

// Health
app.get("/", (_req: Request, res: Response) => {
  res.send({
    status: "ok",
    provider: "Google SDK (Native)",
    model: MODEL_NAME,
  });
});

// Chat routes
app.use("/chat", chatRoutes(chatService));

// Global Error Handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled Server Error:", err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

// 6. Connect to MongoDB and Start Server
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
      console.log(`🤖 AI Model: ${MODEL_NAME}`);
      console.log(`📊 Database: ${MONGODB_URI}`);
    });
  })
  .catch((error) => {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  });
