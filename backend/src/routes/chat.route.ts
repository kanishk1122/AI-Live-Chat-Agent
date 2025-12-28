import { Router, Request, Response, NextFunction } from "express";
import Conversation from "../models/Conversation.model";
import Message from "../models/Message..model";
import ChatService from "../services/chat.service";

const SESSION_HEADER = "x-session-id";

const normalizeSessionId = (
  value: string | string[] | undefined
): string | null => {
  if (!value) return null;
  const raw = Array.isArray(value) ? value[0] : value;
  const cleaned = raw
    .trim()
    .slice(0, 64)
    .replace(/[^a-zA-Z0-9_-]/g, "");
  return cleaned || null;
};

const deriveConversationId = (req: Request): string | null => {
  const sessionId = normalizeSessionId(req.headers[SESSION_HEADER]);
  if (sessionId) return `session_${sessionId}`;
  return null;
};

export const chatRoutes = (chatService: ChatService): Router => {
  const router = Router();

  // Send a message and get reply
  router.post(
    "/message",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const { message } = req.body;

        if (!message || typeof message !== "string") {
          res
            .status(400)
            .json({ error: "Invalid Input: 'message' is required" });
          return;
        }

        const trimmedMessage = message.trim();
        if (trimmedMessage.length === 0 || trimmedMessage.length > 1000) {
          res.status(400).json({ error: "Message must be 1-1000 characters." });
          return;
        }

        const conversationId =
          deriveConversationId(req) || `anonymous_${Date.now()}`;

        const reply = await chatService.getResponse(
          conversationId,
          trimmedMessage
        );

        res.json({ reply, conversationId });
      } catch (error: any) {
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

  // Get current user's conversation history (by IP) with pagination
  router.get(
    "/history",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const conversationId = deriveConversationId(req);

        const limit = parseInt(req.query.limit as string) || 20;
        const before = req.query.before as string;

        const conversation = await Conversation.findOne({ conversationId });
        if (!conversation) {
          res.json({ conversation: null, messages: [], hasMore: false });
          return;
        }

        const query: any = { conversationId };
        if (before) {
          query.timestamp = { $lt: new Date(before) };
        }

        const rawMessages = await Message.find(query)
          .sort({ timestamp: -1 })
          .limit(limit);

        const totalRemaining = await Message.countDocuments({
          conversationId,
          timestamp: {
            $lt:
              rawMessages.length > 0
                ? rawMessages[rawMessages.length - 1].timestamp
                : new Date(0),
          },
        });

        const messages = rawMessages.reverse();

        res.json({
          conversation: { id: conversation.conversationId },
          messages: messages.map((msg) => ({
            id: msg._id,
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

  // Get conversation history by specific conversationId (admin/debug)
  router.get(
    "/history/:conversationId",
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

  // Get all conversations (admin/debug)
  router.get(
    "/conversations",
    async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
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

  return router;
};

export default chatRoutes;
