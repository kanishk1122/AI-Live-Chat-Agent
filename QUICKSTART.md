# Quick Start Guide

## Prerequisites Checklist

- [ ] Node.js v16+ installed ([Download](https://nodejs.org/))
- [ ] MongoDB installed or MongoDB Atlas account ([Download](https://www.mongodb.com/try/download/community))
- [ ] Google Gemini API Key ([Get Free Key](https://makersuite.google.com/app/apikey))

## 5-Minute Setup

### Step 1: Install Dependencies



```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### Step 2: Configure Environment

1. Open `backend/.env`
2. Add your Gemini API key:

```env
GEMINI_API_KEY=your_actual_api_key_here
GEMINI_MODEL=gemini-2.5-flash-lite
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ai-chat-agent
```

### Step 3: Start MongoDB

**Local MongoDB:**

```bash
mongod
```

**MongoDB Atlas:**
Update `MONGODB_URI` in `.env` with your Atlas connection string

### Step 4: Start Backend

```bash
cd backend
npm run dev
```

You should see:

```
✅ Connected to MongoDB
✅ Server running on http://localhost:5000
🤖 AI Model: gemini-2.5-flash-lite
```

### Step 5: Start Frontend

Open a new terminal:

```bash
cd frontend
npm run dev
```

You should see:

```
  VITE vX.X.X  ready in XXX ms

  ➜  Local:   http://localhost:5173/
```

### Step 6: Open Browser

Visit: **http://localhost:5173**

🎉 **You're ready to chat!**

## Test the Agent

Try these questions:

- "What's your shipping policy?"
- "How do I return an item?"
- "What are your support hours?"

## Troubleshooting

### Backend won't start

**Problem:** `GEMINI_API_KEY is missing`

- **Solution:** Add your API key to `backend/.env`

**Problem:** `MongoDB connection error`

- **Solution:** Make sure MongoDB is running (`mongod` command)

**Problem:** Port 5000 already in use

- **Solution:** Change `PORT` in `backend/.env` to another port (e.g., 5001)

### Frontend can't connect

**Problem:** Network error in console

- **Solution:** Make sure backend is running on port 5000
- **Solution:** Check if there are CORS errors - backend should allow `*` origin

**Problem:** Page won't load

- **Solution:** Make sure port 5173 isn't blocked by firewall

### History not loading

**Problem:** Conversation history doesn't appear

- **Solution:** Check MongoDB is running and accessible
- **Solution:** Look at backend console for errors
- **Solution:** Clear browser cache and reload

## What Happens Next?

1. **First Visit:**
   - You see a welcome message
   - Your IP is registered when you send first message
2. **Send Messages:**

   - Messages are instantly displayed
   - AI responds within seconds
   - Everything is saved to database

3. **Return Visit:**
   - Open the chat again (same IP)
   - Your conversation history loads automatically
   - Continue chatting from where you left off

## File Locations

```
AI Live Chat Agent/
├── backend/
│   ├── .env                    ← Add your API key here
│   └── src/index.ts           ← Main backend code
│
├── frontend/
│   └── src/
│       ├── App.jsx            ← Main chat component
│       └── App.css            ← Styling
│
└── README.md                  ← Full documentation
```

## Next Steps

- **Customize the AI:** Edit system prompt in `backend/src/index.ts`
- **Change colors:** Edit gradients in `frontend/src/App.css`
- **Add features:** Extend the backend API
- **Deploy:** See deployment section in main README.md

## Need Help?

- Check the main [README.md](README.md) for detailed documentation
- Review backend [README.md](backend/README.md) for API details
- Review frontend [README.md](frontend/README.md) for UI customization

## Production Deployment

See the "Production Deployment" section in the main README.md for:

- Deploying backend to Heroku/Railway
- Deploying frontend to Vercel/Netlify
- MongoDB Atlas setup
- Environment variable configuration

---

**Happy Building! 🚀**
