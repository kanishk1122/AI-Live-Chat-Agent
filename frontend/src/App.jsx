import { useState, useEffect, useRef, useLayoutEffect } from "react";
import {
  FiSend,
  FiMessageSquare,
  FiUser,
  FiCpu,
  FiAlertCircle,
  FiPower,
  FiActivity,
} from "react-icons/fi";
import "./App.css";

function App() {
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const SESSION_STORAGE_KEY = "ai-agent-session-id";

  // --- Session Management ---
  const generateSessionId = () =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const [sessionId] = useState(() => {
    const existing = localStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;
    const generated = generateSessionId();
    localStorage.setItem(SESSION_STORAGE_KEY, generated);
    return generated;
  });

  // --- State ---
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState("");

  // Server wake-up states (Render free plan)
  const [serverStatus, setServerStatus] = useState("unknown"); // unknown | sleeping | awake
  const [wakeMessage, setWakeMessage] = useState("");

  // History loading states
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const messageListRef = useRef(null);
  const scrollHeightRef = useRef(0);
  const scrollThrottleRef = useRef(null);

  // --- Helpers ---

  // Ping helper with short timeout
  const pingServer = async (timeoutMs = 3000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      // We ping the root "/" or a dedicated "/health" endpoint
      const res = await fetch(`${API_BASE}/`, { signal: controller.signal });
      clearTimeout(timer);
      return res.ok;
    } catch (e) {
      clearTimeout(timer);
      return false;
    }
  };

  // Merge messages (prevent duplicates)
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

  const parseErrorResponse = async (response) => {
    const statusInfo = `${response.status} ${response.statusText || ""}`.trim();
    if (response.status === 429)
      return "Too many requests. Please wait a moment.";
    try {
      const data = await response.json();
      if (data?.error) return data.error;
    } catch (_) {}
    return `${statusInfo}: Server error.`;
  };

  // --- API Actions ---

  const fetchMessages = async (beforeTimestamp = null) => {
    try {
      let url = `${API_BASE}/chat/history?limit=20`;
      if (beforeTimestamp) url += `&before=${beforeTimestamp}`;

      const headers = sessionId ? { "x-session-id": sessionId } : undefined;
      const response = await fetch(url, { headers });

      if (response.ok) {
        const data = await response.json();
        const formattedMessages = data.messages.map((msg) => ({
          id: msg.id || msg._id,
          text: msg.text,
          sender: msg.sender === "user" ? "user" : "bot",
          timestamp: msg.timestamp,
        }));
        return { newMessages: formattedMessages, hasMore: data.hasMore };
      }

      // If error (and server was thought to be awake), might have slept
      if (response.status === 502 || response.status === 503) {
        setServerStatus("sleeping");
      }

      return { newMessages: [], hasMore: false };
    } catch (error) {
      console.error("Fetch error:", error);
      return { newMessages: [], hasMore: false };
    }
  };

  const loadInitialMessages = async () => {
    setIsInitialLoading(true);
    const { newMessages, hasMore: moreAvailable } = await fetchMessages();

    if (newMessages.length > 0) {
      setMessages(newMessages);
    } else {
      setMessages([
        {
          id: "welcome",
          text: "Hi! I'm your support assistant. Ask me anything.",
          sender: "bot",
          timestamp: new Date().toISOString(),
        },
      ]);
    }
    setHasMore(moreAvailable);
    setIsInitialLoading(false);
  };

  const wakeServer = async () => {
    if (serverStatus === "waking") return;
    setServerStatus("waking");
    setWakeMessage("Starting backend... (approx 30s)");

    const maxAttempts = 15;
    let delay = 2000;

    for (let i = 1; i <= maxAttempts; i++) {
      const ok = await pingServer(5000);
      if (ok) {
        setServerStatus("awake");
        await loadInitialMessages();
        return;
      }
      setWakeMessage(`Still waking up... (Attempt ${i}/${maxAttempts})`);
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay + 1000, 5000); // Backoff
    }

    setServerStatus("sleeping"); // Failed
    setErrorBanner("Failed to wake server. Please try again.");
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading || serverStatus !== "awake") return;

    const userText = inputValue.trim();
    if (userText.length > 1000) {
      setErrorBanner("Message too long.");
      return;
    }

    const tempId = Date.now();
    const userMessage = {
      id: tempId,
      text: userText,
      sender: "user",
      timestamp: new Date().toISOString(),
    };

    const pendingId = `pending-${tempId}`;
    const pendingMessage = {
      id: pendingId,
      text: "",
      sender: "bot",
      timestamp: new Date().toISOString(),
      status: "pending",
    };

    setMessages((prev) => [...prev, userMessage, pendingMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/chat/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId,
        },
        body: JSON.stringify({ message: userText }),
      });

      if (!response.ok) {
        const errorMsg = await parseErrorResponse(response);
        throw new Error(errorMsg);
      }

      const data = await response.json();

      // Replace pending message with real one
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === pendingId
            ? {
                ...msg,
                text: data.reply,
                status: "sent",
                id: Date.now(), // update ID
              }
            : msg
        )
      );
    } catch (error) {
      const errMsg = error.message || "Connection failed";
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === pendingId
            ? { ...msg, text: errMsg, isError: true, status: "error" }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  // --- Effects ---

  // 1. Initial Boot
  useEffect(() => {
    const boot = async () => {
      const ok = await pingServer(3000);
      if (ok) {
        setServerStatus("awake");
        loadInitialMessages();
      } else {
        setServerStatus("sleeping");
        setIsInitialLoading(false);
      }
    };
    boot();
  }, []);

  // 2. Infinite Scroll
  const handleScroll = async (e) => {
    if (scrollThrottleRef.current) return;
    scrollThrottleRef.current = setTimeout(
      () => (scrollThrottleRef.current = null),
      200
    );

    const { scrollTop } = e.currentTarget;
    if (scrollTop === 0 && hasMore && !isLoadingOlder) {
      setIsLoadingOlder(true);
      scrollHeightRef.current = messageListRef.current.scrollHeight;

      const oldestTimestamp = messages[0]?.timestamp;
      const { newMessages, hasMore: more } = await fetchMessages(
        oldestTimestamp
      );

      if (newMessages.length > 0) {
        setMessages((prev) => mergeMessages(prev, newMessages));
        setHasMore(more);
      }
      setIsLoadingOlder(false);
    }
  };

  // 3. Maintain Scroll Position
  useLayoutEffect(() => {
    if (!messageListRef.current) return;

    if (isLoadingOlder) {
      const newHeight = messageListRef.current.scrollHeight;
      const diff = newHeight - scrollHeightRef.current;
      messageListRef.current.scrollTop = diff;
    } else if (!isInitialLoading) {
      // Auto-scroll to bottom for new messages
      messageListRef.current.scrollTo({
        top: messageListRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isLoadingOlder, isInitialLoading]);

  // --- Render Helpers ---

  // Dynamic status color
  const getStatusColor = () => {
    if (serverStatus === "awake") return "#10b981"; // Green
    if (serverStatus === "waking") return "#f59e0b"; // Orange
    return "#ef4444"; // Red
  };

  const getStatusText = () => {
    if (serverStatus === "awake") return "Online";
    if (serverStatus === "waking") return "Waking up...";
    return "Offline (Sleeping)";
  };

  return (
    <div className="app-wrapper">
      <div className="chat-widget">
        {/* Header */}
        <header className="chat-header">
          <div className="header-info">
            <div
              className="status-dot"
              style={{ backgroundColor: getStatusColor() }}
            ></div>
            <div>
              <h3>AI Support</h3>
              <p className="status-text">{getStatusText()}</p>
            </div>
          </div>
          <FiMessageSquare className="header-icon" />
        </header>

        {/* Error Banner */}
        {errorBanner && (
          <div className="error-banner">
            <FiAlertCircle />
            <span>{errorBanner}</span>
            <button onClick={() => setErrorBanner("")}>Dismiss</button>
          </div>
        )}

        {/* Chat Area */}
        <div
          className="messages-area"
          ref={messageListRef}
          onScroll={handleScroll}
        >
          {/* SCENARIO 1: Server is Sleeping or Waking */}
          {serverStatus !== "awake" && serverStatus !== "unknown" ? (
            <div className="wake-overlay">
              <div className="wake-icon">
                {serverStatus === "waking" ? (
                  <div className="spinner-large"></div>
                ) : (
                  <FiPower />
                )}
              </div>
              <h4>Server is Sleeping</h4>
              <p>
                {serverStatus === "waking"
                  ? wakeMessage
                  : "To save resources, the backend sleeps when idle. Please wake it up to chat."}
              </p>
              <button
                className="wake-btn"
                onClick={wakeServer}
                disabled={serverStatus === "waking"}
              >
                {serverStatus === "waking" ? "Waking Up..." : "Wake Server"}
              </button>
            </div>
          ) : (
            /* SCENARIO 2: Chat Interface */
            <>
              {isLoadingOlder && (
                <div className="history-loader">
                  <div className="spinner-small"></div>
                </div>
              )}

              {isInitialLoading ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Connecting...</p>
                </div>
              ) : (
                messages.map((msg) => (
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
                          <FiAlertCircle style={{ marginRight: 6 }} />
                        )}
                        {msg.status === "pending" ? (
                          <div className="typing-indicator">
                            <span></span>
                            <span></span>
                            <span></span>
                          </div>
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
                ))
              )}
            </>
          )}
        </div>

        {/* Input Area */}
        <div
          className={`input-area ${serverStatus !== "awake" ? "disabled" : ""}`}
        >
          <form className="input-form" onSubmit={handleSendMessage}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) =>
                e.target.value.length < 1000 && setInputValue(e.target.value)
              }
              placeholder={
                serverStatus === "awake"
                  ? "Type your question..."
                  : "Waiting for server..."
              }
              disabled={isLoading || serverStatus !== "awake"}
            />
            <div className="char-count">
              <span className="char-remaining">
                {1000 - inputValue.length} characters remaining
              </span>
            </div>

            <button
              type="submit"
              disabled={
                isLoading || serverStatus !== "awake" || !inputValue.trim()
              }
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
