import mongoose, { Schema, Document } from "mongoose";

export interface IConversation extends Document {
  conversationId: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

const ConversationSchema: Schema = new Schema(
  {
    conversationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true, // Automatically creates createdAt and updatedAt
  }
);

export default mongoose.model<IConversation>(
  "Conversation",
  ConversationSchema
);
