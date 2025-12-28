"# AI Live Chat Agent

A full-stack AI-powered chat application with automatic conversation persistence using IP-based user identification. No authentication required!

## 🌟 Features

- **🤖 AI-Powered**: Integrates with Google Gemini for intelligent responses
- **💾 Persistent Conversations**: MongoDB stores all chat history
- **🔒 No Auth Required**: IP-based user identification
- **📱 Responsive Design**: Works on desktop and mobile
- **⚡ Real-time Chat**: Instant messaging with typing indicators
- **🔄 Auto-History Loading**: Previous conversations automatically restored
- **🛡️ Error Handling**: Graceful handling of API errors and timeouts
- **💰 Cost Control**: Token limits and message history caps

## 🏗️ Architecture

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

## 📁 Project Structure

```
AI Live Chat Agent/
├── backend/                # Node.js + Express server
│   ├── src/
│   │   ├── index.ts       # Main server file
│   │   └── models/        # MongoDB schemas
│   ├── package.json
│   └── .env.example       # Environment template
│
├── frontend/              # React app
│   ├── src/
│   │   ├── App.jsx        # Main chat component
│   │   └── App.css        # Styling
│   ├── package.json
│   └── vite.config.js
│
└── README.md             # This file
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** v16 or higher
- **MongoDB** (local or cloud instance)
- **Google Gemini API Key** ([Get one here](https://makersuite.google.com/app/apikey))

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd "AI Live Chat Agent"
```

### 2. Setup Backend

```bash
cd backend
npm install

# Create .env file
cp .env.exmaple .env
```

Edit `.env` with your configuration:

```env
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.5-flash-lite
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ai-chat-agent
```

Start the backend:

```bash
npm run dev
```

Backend will run on `http://localhost:5000`

### 3. Setup Frontend

```bash
cd ../frontend
npm install
npm run dev
```

Frontend will run on `http://localhost:5173`

### 4. Start MongoDB

If running locally:

```bash
mongod
```

Or use MongoDB Atlas for cloud hosting.

## 🎯 How It Works

### IP-Based User Identification

1. User opens the chat widget
2. Frontend fetches conversation history from backend
3. Backend identifies user by their IP address
4. If conversation exists (format: `ip_xxx.xxx.xxx.xxx`), it's loaded
5. User sends messages - all automatically saved with their IP
6. On return visit, conversation history is restored

**No cookies, no login, no session tokens needed!**

### FAQ Knowledge Base

The AI agent knows about:

- **Shipping**: USA only, 5-7 business days
- **Returns**: 30-day policy, original condition
- **Support Hours**: Mon-Fri, 9 AM - 5 PM EST

## 📡 API Endpoints

### Backend API

| Method | Endpoint              | Description                           |
| ------ | --------------------- | ------------------------------------- |
| GET    | `/`                   | Health check                          |
| POST   | `/chat/message`       | Send message, get AI reply            |
| GET    | `/chat/history`       | Get current user's history (IP-based) |
| GET    | `/chat/history/:id`   | Get specific conversation (admin)     |
| GET    | `/chat/conversations` | List all conversations (admin)        |

## 🔧 Configuration

### Backend Environment Variables

```env
GEMINI_API_KEY=          # Your Google Gemini API key
GEMINI_MODEL=            # Model name (gemini-2.5-flash-lite)
PORT=                    # Server port (default: 5000)
MONGODB_URI=             # MongoDB connection string
```

### Frontend Configuration

Update API URLs in `frontend/src/App.jsx` if backend is not on localhost:5000

## 🛡️ Security Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Helmet.js**: Security headers
- **CORS**: Configurable origin control
- **Input Validation**: Message validation and sanitization
- **Content Safety**: Gemini API safety filters
- **Environment Variables**: Secrets protected

## 📊 Database Schema

### Conversations

```typescript
{
  conversationId: string;    // "ip_xxx.xxx.xxx.xxx"
  createdAt: Date;
  updatedAt: Date;
  metadata?: Object;
}
```

### Messages

```typescript
{
  conversationId: string;
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
}
```

## 🎨 Customization

### Change AI Model

Edit `backend/.env`:

```env
GEMINI_MODEL=gemini-pro  # or any Gemini model
```

### Update System Prompt

Edit `backend/src/index.ts`:

```typescript
const SYSTEM_INSTRUCTION = `Your custom prompt here...`;
```

### Modify UI Colors

Edit `frontend/src/App.css`:

```css
background: linear-gradient(135deg, #your-color-1, #your-color-2);
```

## 📈 Production Deployment

### Backend

1. Set production environment variables
2. Update CORS settings for your domain
3. Deploy to Heroku, Railway, or similar
4. Ensure MongoDB is accessible

### Frontend

1. Update API URLs to production backend
2. Build: `npm run build`
3. Deploy `dist/` folder to Vercel, Netlify, etc.

## 🐛 Troubleshooting

### Backend won't start

- Check MongoDB is running
- Verify `GEMINI_API_KEY` is set in `.env`
- Ensure port 5000 is available

### Frontend can't connect

- Verify backend is running on port 5000
- Check CORS settings in backend
- Open browser console for errors

### History not loading

- Check MongoDB connection
- Verify backend logs for errors
- Clear browser cache

## 📝 Cost Control

- **Max Tokens**: 1000 per response
- **History Limit**: Last 20 messages for context
- **Rate Limiting**: 100 requests per 15 minutes
- **Message Length**: 1000 character limit on frontend

## 🔐 Privacy Considerations

- IP addresses are stored in database
- Consider IP anonymization for production
- Add data retention policies
- Update privacy policy to mention IP tracking

## 🤝 Contributing

Feel free to submit issues and pull requests!

## 📄 License

MIT License - feel free to use for your projects!

## 🙏 Acknowledgments

- Google Gemini API for AI capabilities
- MongoDB for data persistence
- React & Vite for frontend framework

---

**Built with ❤️ using Node.js, React, MongoDB, and Google Gemini**"
