# AI Live Chat Agent - Backend

## Overview

Backend server for AI Live Chat Agent with LLM integration and MongoDB persistence. **No authentication required** - users are automatically identified by their IP address.

## Features

### 1. LLM Integration

- **Provider**: Google Gemini (gemini-2.5-flash-lite)
- **API Key**: Stored in environment variables (`.env`)
- **Service**: `ChatService` wraps LLM calls with `generateReply()` functionality
- **System Prompt**: Configured as helpful e-commerce support agent
- **Conversation History**: Includes past messages for contextual replies
- **Error Handling**: Graceful handling of API errors, rate limits, and timeouts
- **User Identification**: IP-based (no authentication required)
- **Cost Control**:
  - Max tokens set to 1000 per response
  - History limited to last 20 messages
  - Rate limiting: 100 requests per 15 minutes

### 2. FAQ / Domain Knowledge

The agent has built-in knowledge about:

- **Shipping Policy**: USA only, 5-7 business days standard shipping
- **Return/Refund Policy**: 30-day returns in original condition, email support@example.com
- **Support Hours**: Monday-Friday, 9 AM - 5 PM EST

### 3. Data Model & Persistence (MongoDB)

**No Authentication Required**: Users are identified by their IP address. Each IP gets a unique conversation that persists across sessions.

#### Collections:

**Conversations**

```typescript
{
  conversationId: string;     // Format: "ip_<user_ip_address>"
  createdAt: Date;           // Auto-generated
  updatedAt: Date;           // Auto-updated
  metadata?: Object;         // Optional custom metadata
}
```

**Messages**

```typescript
{
  conversationId: string; // Reference to conversation (ip_xxx)
  sender: "user" | "ai"; // Message sender type
  text: string; // Message content
  timestamp: Date; // Message timestamp
}
```

## Setup

### Prerequisites

- Node.js (v16+)
- MongoDB (local or remote instance)
- Gemini API Key

### Installation

1. Install dependencies:

```bash
npm install
```

2. Create `.env` file (copy from `.env.example`):

```bash
cp .env.exmaple .env
```

3. Configure environment variables in `.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash-lite
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ai-chat-agent
```

4. Start MongoDB (if running locally):

```bash
mongod
```

5. Start the server:

```bash
npm run dev
```

## API Endpoints

### 1. Health Check

```
GET /
```

Response:

```json
{
  "status": "ok",
  "provider": "Google SDK (Native)",
  "model": "gemini-2.5-flash-lite"
}
```

### 2. Send Message

```
POST /chat/message
```

Request:

```json
{
  "message": "What is your return policy?"
}
```

Response:

```json
{
  "reply": "We accept returns within 30 days...",
  "conversationId": "ip_127.0.0.1"
}
```

**Note**: ConversationId is automatically determined from the user's IP address. No need to send it in the request.

### 3. Get Current User's Conversation History

```
GET /chat/history
```

**Automatically retrieves history for the current user based on their IP address.**

Response:

```json
{
  "conversation": {
    "id": "ip_127.0.0.1",
    "createdAt": "2025-12-28T10:00:00.000Z",
    "updatedAt": "2025-12-28T10:05:00.000Z"
  },
  "messages": [
    {
      "sender": "user",
      "text": "Hello",
      "timestamp": "2025-12-28T10:00:00.000Z"
    },
    {
      "sender": "ai",
      "text": "Hello! How can I help you today?",
      "timestamp": "2025-12-28T10:00:01.000Z"
    }
  ]
}
```

### 4. Get Specific Conversation History (Admin/Debug)

```
GET /chat/history/:conversationId
```

Response: Same format as above, but for a specific conversationId.

### 5. Get All Conversations (Admin/Debug)

```
GET /chat/conversations
```

Response:

```json
{
  "conversations": [
    {
      "id": "ip_127.0.0.1",
      "createdAt": "2025-12-28T10:00:00.000Z",
      "updatedAt": "2025-12-28T10:05:00.000Z",
      "messageCount": 6
    }
  ]
}
```

## How IP-Based Identification Works

1. **Automatic User Identification**: When a user sends a message, the server extracts their IP address from the request headers.

2. **Conversation Creation**: On first message, a conversation is created with ID format `ip_<user_ip>`.

3. **History Persistence**: All subsequent messages from the same IP are stored in the same conversation.

4. **Automatic History Loading**: When the user returns (same IP), their conversation history is automatically loaded.

5. **Proxy Support**: The system handles proxied requests by checking `X-Forwarded-For` headers.

## Error Handling

The API handles various error scenarios:

- **400 Bad Request**: Invalid input (missing message)
- **404 Not Found**: Conversation not found
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server or LLM errors

All errors return JSON:

```json
{
  "error": "Error message here"
}
```

## Security Features

- **Helmet**: Security headers
- **CORS**: Configured for all origins (adjust for production)
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Environment Variables**: Secrets stored securely
- **Content Safety**: Gemini safety settings enabled
- **IP-based Identification**: No passwords or personal data required

## Database Indexes

- `conversationId`: Indexed on both collections for fast lookups
- `timestamp`: Indexed on messages for chronological queries
- Compound index: `{conversationId: 1, timestamp: 1}` for efficient history retrieval

## Development

```bash
# Development mode with auto-reload
npm run dev

# Production start
npm start
```

## Notes

- Conversation history is limited to the last 20 messages to manage token usage
- Users are identified by IP address - no authentication required
- Messages are persisted in MongoDB for reliability and reload capability
- All timestamps use UTC
- Conversations persist across sessions as long as the IP remains the same
- Behind proxies/load balancers, ensure `X-Forwarded-For` header is properly set

## Privacy Considerations

- IP addresses are stored in the database (format: `ip_xxx.xxx.xxx.xxx`)
- Consider implementing IP anonymization for production environments
- Add data retention policies as needed
- Inform users about IP-based session tracking in your privacy policy
