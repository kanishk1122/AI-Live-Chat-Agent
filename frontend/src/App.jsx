import { useState, useEffect, useRef, useLayoutEffect } from "react";
import {
  FiSend,
  FiMessageSquare,
  FiUser,
  FiCpu,
  FiAlertCircle,
} from "react-icons/fi";
import "./App.css";

function App() {
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const SESSION_STORAGE_KEY = "ai-agent-session-id";

  console.log("Current API URL:", import.meta.env.VITE_API_URL);
  const generateSessionId = () =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const [sessionId, setSessionId] = useState(() => {
    const existing = localStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;
    const generated = generateSessionId();
    localStorage.setItem(SESSION_STORAGE_KEY, generated);
    return generated;
  });

  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState("");

  // History loading states
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const messageListRef = useRef(null);

  // Ref to track scroll height to maintain position when loading old messages
  const scrollHeightRef = useRef(0);
  const scrollThrottleRef = useRef(null);

  // Merge messages without duplicates, ordered by timestamp ascending
  const mergeMessages = (existing, incoming) => {
    const byKey = new Map();
    [...existing, ...incoming].forEach((msg) => {
      const key = `${msg.id || msg.timestamp}-${msg.timestamp}`;
      byKey.set(key, msg);
    });
    return Array.from(byKey.values()).sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );
  };

  // Parse backend error payloads into a friendly, detailed string
  const parseErrorResponse = async (response) => {
    const statusInfo = `${response.status} ${response.statusText || ""}`.trim();

    if (response.status === 429)
      return `${statusInfo}: Too many requests. Please wait a moment.`;

    try {
      const data = await response.json();
      if (data?.error) return `${statusInfo}: ${data.error}`;
    } catch (_) {
      // ignore JSON parsing issues and fall through
    }

    return `${statusInfo || "Server error"}: Please try again.`;
  };

  // Fetch Messages Function
  const fetchMessages = async (beforeTimestamp = null) => {
    try {
      let url = `${API_BASE}/chat/history?limit=20`;
      if (beforeTimestamp) {
        url += `&before=${beforeTimestamp}`;
      }

      const headers = sessionId
        ? {
            "x-session-id": sessionId,
          }
        : undefined;

      const response = await fetch(url, { headers });
      if (response.ok) {
        const data = await response.json();

        const formattedMessages = data.messages.map((msg) => ({
          id: msg.id || msg._id || `${msg.timestamp}-${msg.text.length}`,
          text: msg.text,
          sender: msg.sender === "user" ? "user" : "bot",
          timestamp: msg.timestamp,
        }));

        return {
          newMessages: formattedMessages,
          hasMore: data.hasMore,
        };
      }

      // Non-OK response
      const errText = await parseErrorResponse(response);
      setErrorBanner(errText);
      return { newMessages: [], hasMore: false };
    } catch (error) {
      console.error("Error loading history:", error);
      const detail = error instanceof Error ? error.message : "Unknown error";
      setErrorBanner(`Unable to load history. ${detail}`);
      return { newMessages: [], hasMore: false };
    }
  };

  // 1. Initial Load
  useEffect(() => {
    const initLoad = async () => {
      const { newMessages, hasMore: moreAvailable } = await fetchMessages();

      if (newMessages.length > 0) {
        setMessages(newMessages);
      } else {
        // Welcome message if purely empty
        setMessages([
          {
            id: 1,
            text: "Hi! I'm your support assistant. Ask me anything.",
            sender: "bot",
            timestamp: new Date().toISOString(),
          },
        ]);
      }
      setHasMore(moreAvailable);
      setIsInitialLoading(false);
    };

    initLoad();
  }, []);

  // 2. Handle Scroll (Load Older)
  const handleScroll = async (e) => {
    if (scrollThrottleRef.current) return;
    scrollThrottleRef.current = setTimeout(() => {
      scrollThrottleRef.current = null;
    }, 150);

    const { scrollTop } = e.currentTarget;

    // If scrolled to top, has more data, and not currently fetching
    if (scrollTop === 0 && hasMore && !isLoadingOlder) {
      setIsLoadingOlder(true);

      // Save current scroll height to restore position later
      scrollHeightRef.current = messageListRef.current.scrollHeight;

      // Get oldest message timestamp
      const oldestTimestamp = messages[0]?.timestamp;

      const { newMessages, hasMore: moreAvailable } = await fetchMessages(
        oldestTimestamp
      );

      if (newMessages.length > 0) {
        setMessages((prev) => mergeMessages(prev, newMessages));
        setHasMore(moreAvailable);
      }

      setIsLoadingOlder(false);
    }
  };

  // 3. Auto-Scroll logic
  useLayoutEffect(() => {
    if (!messageListRef.current) return;

    if (isLoadingOlder) {
      // SCENARIO A: Loaded older messages
      // Restore scroll position so user doesn't jump to top
      const newScrollHeight = messageListRef.current.scrollHeight;
      const heightDifference = newScrollHeight - scrollHeightRef.current;
      messageListRef.current.scrollTop = heightDifference;
    } else {
      // SCENARIO B: New message sent/received or Initial Load
      // Scroll to bottom
      messageListRef.current.scrollTo({
        top: messageListRef.current.scrollHeight,
        behavior: isInitialLoading ? "auto" : "smooth",
      });
    }
  }, [messages, isLoadingOlder, isInitialLoading]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userText = inputValue.trim();

    if (userText.length > 1000) {
      setErrorBanner("Message too long (max 1000 characters).");
      return;
    }

    const userMessage = {
      id: Date.now(),
      text: userText,
      sender: "user",
      timestamp: new Date().toISOString(),
    };

    const pendingBotId = `pending-${Date.now()}`;
    const pendingBotMessage = {
      id: pendingBotId,
      text: "",
      sender: "bot",
      timestamp: new Date().toISOString(),
      status: "pending",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      setMessages((prev) => [...prev, pendingBotMessage]);

      const headers = {
        "Content-Type": "application/json",
        ...(sessionId ? { "x-session-id": sessionId } : {}),
      };

      const response = await fetch(`${API_BASE}/chat/message`, {
        method: "POST",
        headers,
        body: JSON.stringify({ message: userText }),
      });

      if (!response.ok) {
        const errText = await parseErrorResponse(response);
        setErrorBanner(errText);
        setInputValue(userText);

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === pendingBotId
              ? {
                  ...msg,
                  text: errText,
                  isError: true,
                  status: "error",
                }
              : msg
          )
        );
        return;
      }

      const data = await response.json();

      const botMessage = {
        id: Date.now() + 1,
        text: data.reply,
        sender: "bot",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) =>
        prev.map((msg) => (msg.id === pendingBotId ? botMessage : msg))
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown error";
      const errorText = `Unable to reach server. ${detail}`;
      setErrorBanner(errorText);
      setInputValue(userText);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === pendingBotId
            ? {
                ...msg,
                text: errorText,
                isError: true,
                status: "error",
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-wrapper">
      <div className="chat-widget">
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

        {/* Error Banner */}
        {errorBanner && (
          <div className="error-banner">
            <div className="error-text">
              <FiAlertCircle />
              <span>{errorBanner}</span>
            </div>
            <button onClick={() => setErrorBanner("")}>Dismiss</button>
          </div>
        )}

        {/* Added onScroll handler */}
        <div
          className="messages-area"
          ref={messageListRef}
          onScroll={handleScroll}
        >
          {/* Loading Spinner for Old History */}
          {isLoadingOlder && (
            <div className="history-loader">
              <div className="spinner-small"></div>
            </div>
          )}

          {isInitialLoading ? (
            <div className="loading-history">
              <div className="spinner"></div>
              <p>Loading conversation...</p>
            </div>
          ) : (
            <>
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
                    <div
                      className={`bubble ${msg.sender} ${
                        msg.isError ? "error" : ""
                      }`}
                    >
                      {msg.isError && (
                        <FiAlertCircle style={{ marginRight: "8px" }} />
                      )}
                      {msg.status === "pending" ? (
                        <div className="typing-dot" />
                      ) : (
                        msg.text
                      )}
                    </div>
                    <span className="timestamp">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))}

              {isLoading && !messages.some((m) => m.status === "pending") && (
                <div className="message-group bot-group">
                  <div className="avatar">
                    <FiCpu />
                  </div>
                  <div className="bubble bot loading-bubble">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="input-area">
          <form className="input-form" onSubmit={handleSendMessage}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your question..."
              disabled={isLoading}
            />
            {/* Button is now visually inside the form container */}
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className={inputValue.trim() ? "active" : ""}
            >
              <FiSend size={18} />
            </button>
          </form>
          <div className="branding">Powered by AI Agent</div>
        </div>
      </div>
    </div>
  );
}

export default App;
