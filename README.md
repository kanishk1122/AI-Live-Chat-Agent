# AI Live Chat Agent

A full-stack AI-powered chat app with automatic conversation persistence using IP-based identification. No authentication required.

## Features

- Google Gemini responses
- MongoDB persistence
- IP-based identity (no login)
- Responsive React UI
- Auto-history loading
- Friendly surfacing of LLM/API errors
- Cost control (token + history caps)

## How to Run Locally

### Prerequisites

- Node.js v16+
- MongoDB (local `mongod` or Atlas URI)
- Gemini API key (https://makersuite.google.com/app/apikey)
- You can use any model which you apikey support as my apikey support gemini-2.5-flash-lite just change the model on backend env

### 1) Clone

```sh

cd "AI Live Chat Agent"
```

### 2) Backend setup

```sh
cd backend
npm install
cp .env.example .env
```

Edit backend/.env:

```sh
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.5-flash-lite
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ai-chat-agent
```

Start MongoDB locally (or use Atlas):

```sh
mongod
```

Run backend:

```sh
npm run dev
```

### 3) Frontend setup

```sh
cd ../frontend
npm install
npm run dev
```

### 4) Open the app

- Backend: http://localhost:5000
- Frontend: http://localhost:5173

### Render Free Plan Tip

- If deploying on Render Free, the server may sleep when idle.
- Use the "Wake Server" button in the app header to ping the backend and wake it before sending messages.

## Database Setup (Migrations/Seed)

- No migrations required; Mongoose creates collections on first write.
- Optional seed: insert sample conversations/messages via Mongo shell or Compass; none required for functionality.

## Configuration (Env Vars)

Backend .env keys:

```sh
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.5-flash-lite
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ai-chat-agent
```

Other providers (not used here but could be wired similarly):

- OPENAI_API_KEY=...
- ANTHROPIC_API_KEY=...

Frontend: update API base in frontend/src/App.jsx if backend URL changes.

## Architecture Overview

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Frontend  │────────>│   Backend   │────────>│   MongoDB   │
│   (React)   │<────────│  (Node.js)  │<────────│  Database   │
└─────────────┘         └─────────────┘         └─────────────┘
                                             │
                                             ▼
                                  ┌─────────────┐
                                  │Google Gemini│
                                  │     API     │
                                  └─────────────┘
```

Project layout:

```
AI Live Chat Agent/
├── backend/
│   ├── src/
│   │   ├── index.ts              # App bootstrap (Express wiring)
│   │   ├── routes/chat.route.ts  # HTTP layer
│   │   ├── services/chat.service.ts # LLM + persistence orchestration
│   │   ├── models/               # Mongoose schemas
│   │   └── utils/ip.ts           # IP helper
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx               # UI + data fetching
│   │   └── App.css               # Styling
└── README.md
```

Layering (backend)

- Routes: HTTP concerns only (validation, mapping)
- Services: business + LLM orchestration
- Models: persistence
- Utils: shared helpers

Design decisions

- Session base identity to avoid auth while preserving continuity
- Paginated history (`before` cursor) to control token usage
- Limit context to last 20 messages for cost/perf balance
- Service wrapper around Gemini SDK to keep routes thin

## API Endpoints

| Method | Endpoint              | Description                           |
| ------ | --------------------- | ------------------------------------- |
| GET    | `/`                   | Health check                          |
| POST   | `/chat/message`       | Send message, get AI reply            |
| GET    | `/chat/history`       | Get current user's history (IP-based) |
| GET    | `/chat/history/:id`   | Get specific conversation (admin)     |
| GET    | `/chat/conversations` | List all conversations (admin)        |

## How It Works

- Frontend loads history (`/chat/history`), backend derives user by IP.
- Messages are stored in MongoDB; last 20 are used as LLM context.
- Responses are saved and returned to the UI, which displays them with typing/error states.

## Cost Control

- Max tokens: 1000 per response
- History window: last 20 messages
- Rate limiting: 100 requests / 15 minutes
- Frontend message length cap: 1000 chars

## LLM Notes

- Provider: Google Gemini (gemini-2.5-flash-lite)
- Prompting: single system prompt defining e-commerce support persona + recent history
- Safety: harassment blocked at low+ threshold
- Rationale: fast, cost-effective for support answers

## Trade-offs & If I Had More Time

- IP identity is simple but brittle for shared/VPN users; next step: optional anonymous user tokens or cookies.
- No schema migrations; could add Mongoose migration/seed tooling for evolutions.
- No retrieval over FAQs; could add vector search for richer answers.
- Rate limiting is in-process; could move to Redis for horizontal scale.
- Tests are minimal; would add integration tests with mocked LLM + Mongo.

## Database Schema

Conversations

```ts
{
   conversationId: string;    // "ip_xxx.xxx.xxx.xxx"
   createdAt: Date;
   updatedAt: Date;
   metadata?: object;
}
```

Messages

```ts
{
  conversationId: string;
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
}
```

## Security

- Helmet headers, CORS
- Input validation
- Rate limiting (100/15min)
- Environment-based secrets
- LLM safety settings

## Acknowledgments

- Google Gemini API
- MongoDB
- React & Vite

---

Built with love using Node.js, React, MongoDB, and Google Gemini.
