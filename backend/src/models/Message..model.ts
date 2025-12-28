import mongoose, { Schema, Document } from "mongoose";

export interface IMessage extends Document {
  conversationId: string;
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
}

const MessageSchema: Schema = new Schema({
  conversationId: {
    type: String,
    required: true,
    index: true,
  },
  sender: {
    type: String,
    required: true,
    enum: ["user", "ai"],
  },
  text: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Create compound index for efficient querying
MessageSchema.index({ conversationId: 1, timestamp: -1 });

export default mongoose.model<IMessage>("Message", MessageSchema);
