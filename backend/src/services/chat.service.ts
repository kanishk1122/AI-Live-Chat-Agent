import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  Content,
} from "@google/generative-ai";
import Conversation from "../models/Conversation.model";
import Message from "../models/Message..model";

export class ChatService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string, modelName: string, systemInstruction: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: modelName,
      systemInstruction,
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
        },
      ],
    });
  }

  // Rough token estimate to keep requests under model limits
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private trimHistoryForBudget(history: Content[], maxTokens = 200): Content[] {
    type QueueItem = { item: Content; tokens: number };
    const queue: QueueItem[] = [];
    let total = 0;

    for (const item of history) {
      const text = item.parts?.map((p: any) => p?.text || "").join(" ") || "";
      const tokens = this.estimateTokens(text);
      queue.push({ item, tokens });
      total += tokens;

      while (total > maxTokens && queue.length > 0) {
        const removed = queue.shift();
        total -= removed?.tokens || 0;
      }
    }

    return queue.map((q) => q.item);
  }

  private async loadHistoryFromDB(conversationId: string): Promise<Content[]> {
    const messages = await Message.find({ conversationId })
      .sort({ timestamp: 1 })
      .limit(20);

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
      let conversation = await Conversation.findOne({ conversationId });
      if (!conversation) {
        conversation = await Conversation.create({ conversationId });
      }

      await Message.create({
        conversationId,
        sender: "user",
        text: userMessage,
        timestamp: new Date(),
      });

      const history = await this.loadHistoryFromDB(conversationId);

      const budgetedHistory = this.trimHistoryForBudget(history);

      const chat = this.model.startChat({
        history: budgetedHistory,
        generationConfig: {
          maxOutputTokens: 1000,
        },
      });

      const result = await chat.sendMessage(userMessage);
      const responseText = result.response.text();

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

export default ChatService;
