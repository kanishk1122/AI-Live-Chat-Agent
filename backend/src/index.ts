import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { 
  GoogleGenerativeAI, 
  HarmCategory, 
  HarmBlockThreshold,
  Content 
} from "@google/generative-ai";

// 1. Load Environment Variables
dotenv.config();

const PORT = process.env.PORT || 5000;
const API_KEY = process.env.GEMINI_API_KEY;
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

// 3. Chat Service (Google SDK Version)
class ChatService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  // Store history as an array of Google SDK 'Content' objects
  private sessions: Map<string, Content[]> = new Map();

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: SYSTEM_INSTRUCTION,
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
        },
      ],
    });
  }

  public async getResponse(sessionId: string, userMessage: string): Promise<string> {
    // A. Retrieve History
    let history = this.sessions.get(sessionId) || [];

    // B. Start Chat Session with History
    const chat = this.model.startChat({
      history: history,
      generationConfig: {
        maxOutputTokens: 1000, // Keep answers relatively short
      },
    });

    try {
      // C. Send Message
      const result = await chat.sendMessage(userMessage);
      const responseText = result.response.text();

      // D. Save Updated History
      // The SDK's 'chat' object automatically tracks the exchange. 
      // We grab the full history from it to save for next time.
      const newHistory = await chat.getHistory();
      this.sessions.set(sessionId, newHistory);

      return responseText;
    } catch (error) {
      console.error(`[ChatService Error] Session ${sessionId}:`, error);
      throw error;
    }
  }
}

const chatService = new ChatService(API_KEY);

// 4. Express App Setup
const app = express();

app.use(helmet());
app.use(cors({ origin: "*" }));
app.use(express.json());

// Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
});
app.use(limiter);

// 5. Route Definition
app.get("/", (_req: Request, res: Response) => {
  res.send({ status: "ok", provider: "Google SDK (Native)", model: MODEL_NAME });
});

app.post("/chat/message", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { message, sessionId: clientSessionId } = req.body;

    // Basic Validation
    if (!message || typeof message !== "string") {
      res.status(400).json({ error: "Invalid Input: 'message' is required" });
      return;
    }

    const sessionId = clientSessionId || `sess_${Date.now()}`;

    // Get Reply
    const reply = await chatService.getResponse(sessionId, message);

    res.json({ reply, sessionId });
  } catch (error: any) {
    // Handle Quota Errors specifically
    if (error.status === 429) {
      res.status(429).json({ error: "Too many requests. Please try again later." });
    } else {
      next(error);
    }
  }
});

// Global Error Handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled Server Error:", err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

// 6. Start Server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`🤖 AI Model: ${MODEL_NAME}`);
});