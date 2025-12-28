import { useState, useEffect, useRef } from "react";
import { FiSend, FiMessageSquare, FiUser, FiCpu, FiAlertCircle } from "react-icons/fi";
import "./App.css";

// Simple utility to generate a session ID (persists per page load)
const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

function App() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hi! I'm your support assistant. Ask me about our shipping policy, returns, or support hours.",
      sender: "bot",
      timestamp: new Date().toISOString()
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(generateSessionId()); // Created once on component mount
  const messageListRef = useRef(null);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTo({
        top: messageListRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userText = inputValue.trim();
    
    // 1. Optimistically add user message to UI
    const userMessage = {
      id: Date.now(),
      text: userText,
      sender: "user",
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // 2. Send to Backend
      const response = await fetch("http://localhost:5000/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Requirement: Pass sessionId so backend can link history
        body: JSON.stringify({ 
          message: userText,
          sessionId: sessionId 
        }),
      });

      if (!response.ok) {
        throw new Error("Server Error");
      }

      const data = await response.json();

      // 3. Add Bot Response
      const botMessage = {
        id: Date.now() + 1,
        text: data.reply,
        sender: "bot",
        timestamp: new Date().toISOString()
      };
      setMessages((prev) => [...prev, botMessage]);

    } catch (error) {
      console.error("Chat Error:", error);
      
      // Robustness: Show error in UI so user knows what happened
      const errorMessage = {
        id: Date.now() + 1,
        text: "I'm having trouble connecting to the server. Please try again later.",
        sender: "bot",
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-wrapper">
      <div className="chat-widget">
        {/* Header - Simple & Trustworthy */}
        <header className="chat-header">
          <div className="header-info">
            <div className="status-dot"></div>
            <div>
              <h3>Customer Support</h3>
              <p>Typically replies instantly</p>
            </div>
          </div>
          <FiMessageSquare className="header-icon" />
        </header>

        {/* Message Area */}
        <div className="messages-area" ref={messageListRef}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`message-group ${
                msg.sender === "user" ? "user-group" : "bot-group"
              }`}
            >
              <div className="avatar">
                {msg.sender === "user" ? <FiUser /> : <FiCpu />}
              </div>
              
              <div className="message-content">
                <div className={`bubble ${msg.sender} ${msg.isError ? "error" : ""}`}>
                  {msg.isError && <FiAlertCircle style={{marginRight: '8px'}}/>}
                  {msg.text}
                </div>
                <span className="timestamp">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="message-group bot-group">
              <div className="avatar"><FiCpu /></div>
              <div className="bubble bot loading-bubble">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="input-area">
          <form className="input-form" onSubmit={handleSendMessage}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your question..."
              disabled={isLoading}
              maxLength={1000} // Basic idiot-proofing for long messages
            />
            <button 
              type="submit" 
              disabled={isLoading || !inputValue.trim()}
              className={inputValue.trim() ? "active" : ""}
            >
              <FiSend />
            </button>
          </form>
          <div className="branding">Powered by AI Agent</div>
        </div>
      </div>
    </div>
  );
}

export default App;