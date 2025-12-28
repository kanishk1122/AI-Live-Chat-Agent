# AI Live Chat Agent - Frontend

## Overview

React-based frontend for the AI Live Chat Agent with automatic conversation history loading based on user IP.

## Features

- **IP-Based Sessions**: No login required - your conversation is automatically saved and restored based on your IP
- **Real-time Chat**: Instant messaging with AI support agent
- **Conversation History**: Automatically loads your previous messages when you return
- **Responsive Design**: Works on desktop and mobile devices
- **Typing Indicators**: Shows when AI is thinking
- **Error Handling**: Graceful error messages for connection issues
- **Modern UI**: Clean, professional chat interface

## Tech Stack

- React 18
- Vite (for fast development)
- React Icons (for UI icons)
- CSS3 (custom styling)

## Setup

### Prerequisites

- Node.js (v16+)
- Backend server running on `http://localhost:5000`

### Installation

1. Install dependencies:

```bash
npm install
```

2. Start development server:

```bash
npm run dev
```

3. Open browser to `http://localhost:5173` (or the URL shown in terminal)

## How It Works

### Automatic History Loading

When the app loads:

1. Calls `GET /chat/history` to fetch your conversation
2. Backend identifies you by your IP address
3. If previous conversation exists, it's displayed
4. If no history, shows welcome message

### Sending Messages

When you send a message:

1. Message is immediately displayed in UI (optimistic update)
2. Sent to backend via `POST /chat/message`
3. Backend automatically associates it with your IP
4. AI response is received and displayed
5. Everything is saved to database automatically

### No Session Management Needed

- No cookies
- No local storage
- No authentication
- Just automatic IP-based identification

## API Integration

The frontend connects to these backend endpoints:

```javascript
// Load history on mount
GET http://localhost:5000/chat/history

// Send message
POST http://localhost:5000/chat/message
Body: { "message": "Your message here" }
```

## Project Structure

```
frontend/
├── src/
│   ├── App.jsx           # Main chat component
│   ├── App.css           # Chat styling
│   ├── main.jsx          # React entry point
│   └── index.css         # Global styles
├── public/
├── index.html
├── package.json
└── vite.config.js
```

## Development

```bash
# Run dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Features Breakdown

### UI Components

- **Chat Header**: Status indicator and branding
- **Messages Area**: Scrollable message history
- **Message Bubbles**: Differentiated user/AI messages
- **Avatar Icons**: User and AI profile pictures
- **Timestamps**: Message timing information
- **Typing Indicator**: Animated dots while AI responds
- **Input Area**: Message composition and send button

### User Experience

- **Auto-scroll**: Automatically scrolls to latest message
- **Loading States**: Shows spinner while loading history
- **Error Messages**: Clear error communication
- **Disabled States**: Prevents sending while loading
- **Character Limit**: 1000 character max per message
- **Responsive**: Adapts to screen size

## Customization

### Change Backend URL

Edit the fetch URLs in [App.jsx](src/App.jsx):

```javascript
const API_URL = "http://your-backend-url:5000";
```

### Modify Colors

Edit [App.css](src/App.css) gradient colors:

```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### Adjust Chat Height

In [App.css](src/App.css):

```css
.chat-widget {
  height: 650px; /* Change this value */
}
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Android)

## Notes

- Conversation history persists as long as your IP address stays the same
- If your IP changes (VPN, different network), you'll get a new conversation
- All messages are stored in the backend MongoDB database
- Frontend has no local data persistence

## Production Deployment

For production deployment:

1. Update API URLs to production backend
2. Build the app: `npm run build`
3. Deploy `dist/` folder to hosting service (Vercel, Netlify, etc.)
4. Configure CORS on backend to allow your domain
