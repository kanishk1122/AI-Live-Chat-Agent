import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  Content,
} from "@google/generative-ai";
import Conversation from "./models/Conversation";
import Message from "./models/Message";

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

// 3. Chat Service (Google SDK Version with MongoDB Persistence)
class ChatService {
  private genAI: GoogleGenerativeAI;
  private model: any;

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

  // Convert DB messages to Gemini Content format
  private async loadHistoryFromDB(conversationId: string): Promise<Content[]> {
    const messages = await Message.find({ conversationId })
      .sort({ timestamp: 1 })
      .limit(20); // Limit to last 20 messages for context

    const history: Content[] = [];
    for (const msg of messages) {
      history.push({
        role: msg.sender === "user" ? "user" : "model",
        parts: [{ text: msg.text }],
      });
    }
    return history;
  }

  public async getResponse(
    conversationId: string,
    userMessage: string
  ): Promise<string> {
    try {
      // A. Ensure conversation exists
      let conversation = await Conversation.findOne({ conversationId });
      if (!conversation) {
        conversation = await Conversation.create({ conversationId });
      }

      // B. Save user message to DB
      await Message.create({
        conversationId,
        sender: "user",
        text: userMessage,
        timestamp: new Date(),
      });

      // C. Load conversation history from DB
      const history = await this.loadHistoryFromDB(conversationId);

      // D. Start Chat Session with History
      const chat = this.model.startChat({
        history: history,
        generationConfig: {
          maxOutputTokens: 1000, // Keep answers relatively short
        },
      });

      // E. Send Message
      const result = await chat.sendMessage(userMessage);
      const responseText = result.response.text();

      // F. Save AI response to DB
      await Message.create({
        conversationId,
        sender: "ai",
        text: responseText,
        timestamp: new Date(),
      });

      return responseText;
    } catch (error) {
      console.error(
        `[ChatService Error] Conversation ${conversationId}:`,
        error
      );
      throw error;
    }
  }
}

const chatService = new ChatService(API_KEY);

// Helper function to get client IP
const getClientIP = (req: Request): string => {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = forwarded
    ? typeof forwarded === "string"
      ? forwarded.split(",")[0]
      : forwarded[0]
    : req.socket.remoteAddress || "unknown";
  return ip.replace("::ffff:", ""); // Clean IPv6 prefix
};

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
  res.send({
    status: "ok",
    provider: "Google SDK (Native)",
    model: MODEL_NAME,
  });
});

app.post(
  "/chat/message",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { message } = req.body;

      // Basic Validation
      if (!message || typeof message !== "string") {
        res.status(400).json({ error: "Invalid Input: 'message' is required" });
        return;
      }

      // Use client IP as conversation identifier
      const clientIP = getClientIP(req);
      const conversationId = `ip_${clientIP}`;

      // Get Reply
      const reply = await chatService.getResponse(conversationId, message);

      res.json({ reply, conversationId });
    } catch (error: any) {
      // Handle Quota Errors specifically
      if (error.status === 429) {
        res
          .status(429)
          .json({ error: "Too many requests. Please try again later." });
      } else {
        next(error);
      }
    }
  }
);

// Get current user's conversation history (based on IP)
// Replace your existing GET /chat/history route with this:

app.get(
  "/chat/history",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const clientIP = getClientIP(req);
      const conversationId = `ip_${clientIP}`;

      // Pagination params
      const limit = parseInt(req.query.limit as string) || 20;
      const before = req.query.before as string; // ISO date string

      const conversation = await Conversation.findOne({ conversationId });

      if (!conversation) {
        res.json({ conversation: null, messages: [], hasMore: false });
        return;
      }

      // Build query
      const query: any = { conversationId };

      // If 'before' is provided, fetch messages older than that date
      if (before) {
        query.timestamp = { $lt: new Date(before) };
      }

      // 1. Get messages sorted Newest -> Oldest (to get the correct chunk)
      // 2. Limit the result
      const rawMessages = await Message.find(query)
        .sort({ timestamp: -1 })
        .limit(limit);

      // Check if there might be even older messages for the next call
      const totalRemaining = await Message.countDocuments({
        conversationId,
        timestamp: {
          $lt:
            rawMessages.length > 0
              ? rawMessages[rawMessages.length - 1].timestamp
              : new Date(0),
        },
      });

      // 3. Reverse back to Oldest -> Newest for the frontend display
      const messages = rawMessages.reverse();

      res.json({
        conversation: { id: conversation.conversationId },
        messages: messages.map((msg) => ({
          id: msg._id, // Ensure we send ID for React keys
          sender: msg.sender,
          text: msg.text,
          timestamp: msg.timestamp,
        })),
        hasMore: totalRemaining > 0,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get conversation history by specific conversationId (admin/debug use)
app.get(
  "/chat/history/:conversationId",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { conversationId } = req.params;

      const conversation = await Conversation.findOne({ conversationId });
      if (!conversation) {
        res.status(404).json({ error: "Conversation not found" });
        return;
      }

      const messages = await Message.find({ conversationId }).sort({
        timestamp: 1,
      });

      res.json({
        conversation: {
          id: conversation.conversationId,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        },
        messages: messages.map((msg) => ({
          sender: msg.sender,
          text: msg.text,
          timestamp: msg.timestamp,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get all conversations
app.get(
  "/chat/conversations",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const conversations = await Conversation.find()
        .sort({ updatedAt: -1 })
        .limit(50);

      const conversationsWithCounts = await Promise.all(
        conversations.map(async (conv) => {
          const messageCount = await Message.countDocuments({
            conversationId: conv.conversationId,
          });
          return {
            id: conv.conversationId,
            createdAt: conv.createdAt,
            updatedAt: conv.updatedAt,
            messageCount,
          };
        })
      );

      res.json({ conversations: conversationsWithCounts });
    } catch (error) {
      next(error);
    }
  }
);

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
