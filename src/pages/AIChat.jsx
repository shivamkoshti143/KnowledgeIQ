import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, User, Lightbulb, ArrowRight, CornerDownLeft } from "lucide-react";
import { PageTitle } from "../components/UI";
import { request } from "../api/client";
import { getInitials } from "../utils/initials";
import { LinkifiedText } from "../components/LinkifiedText";

function RenderMessage({ text, onNavigate }) {
  const parts = (text || "").split(/(\[REF:\d+:(?:task|knowledge|video):[^\]]+\])/g);

  return (
    <div style={{ lineHeight: 1.6, fontSize: 14.5, color: "#1e293b", whiteSpace: "pre-wrap" }}>
      {parts.map((part, idx) => {
        const match = part.match(/^\[REF:(\d+):(task|knowledge|video):([^\]]+)\]$/);
        if (match) {
          const [, id, type, title] = match;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onNavigate(type, Number(id))}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 8px",
                borderRadius: 6,
                background: "rgba(37, 99, 235, 0.1)",
                color: "#2563eb",
                border: "1px solid rgba(37, 99, 235, 0.25)",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                margin: "0 4px",
                verticalAlign: "baseline"
              }}
              title={`Open ${title}`}
            >
              📄 {title}
            </button>
          );
        }
        return <LinkifiedText key={idx} text={part} />;
      })}
    </div>
  );
}

export function AIChat({ data, session, setRoute, openItem }) {
  const [messages, setMessages] = useState(data.aiChats ? [...data.aiChats].reverse() : []);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const tempIdRef = useRef(null);

  const samplePrompts = [
    "How do I containerize apps with Docker best practices?",
    "What are database scaling and replication patterns?",
    "How does the knowledge submission workflow work?",
    "Summarize recent IT and DevOps walkthroughs"
  ];

  useEffect(() => {
    let cancelled = false;
    if (!data.aiChats || !data.aiChats.length) {
      request("/ai/chats")
        .then((chats) => {
          if (!cancelled && Array.isArray(chats)) {
            setMessages([...chats].reverse());
          }
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [data.aiChats]);

  useEffect(() => {
    const end = document.getElementById("ai-chat-end");
    end?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(customText) {
    const text = (customText || input).trim();
    if (!text || sending) return;
    setSending(true);
    if (!customText) setInput("");

    const tempId = Date.now();
    tempIdRef.current = tempId;
    setMessages((current) => [
      ...current,
      { id: tempId, message: text, response: "Searching knowledge base and generating answer...", createdAt: new Date().toISOString() }
    ]);

    try {
      const result = await request("/ai/chat", { method: "POST", body: JSON.stringify({ message: text }) });
      const reply = result.reply || "Assistant response unavailable.";
      setMessages((current) => current.map((msg) => (msg.id === tempId ? { ...msg, response: reply } : msg)));
    } catch (error) {
      setMessages((current) =>
        current.map((msg) => (msg.id === tempId ? { ...msg, response: "Sorry, I couldn't answer that right now." } : msg))
      );
    } finally {
      setSending(false);
    }
  }

  function navigateToItem(type, id) {
    if (openItem) {
      openItem(id, type);
    } else if (setRoute) {
      setRoute("knowledge");
    }
  }

  return (
    <div className="ai-chat-page" style={{ maxWidth: 880, margin: "0 auto" }}>
      <PageTitle
        eyebrow="AI Assistant"
        title="Knowledge Assistant"
        subtitle="Ask questions about tasks, operational solutions, workflows, and company-wide ABM knowledge."
      />

      <div
        className="table-card"
        style={{
          borderRadius: 16,
          border: "1px solid rgba(0,0,0,0.08)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          minHeight: 520,
          background: "#ffffff"
        }}
      >
        {/* Messages Container */}
        <div style={{ flex: 1, padding: "24px 28px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  boxShadow: "0 4px 12px rgba(37,99,235,0.25)"
                }}
              >
                <Sparkles size={28} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>
                How can I help you today?
              </h3>
              <p style={{ fontSize: 14, color: "#64748b", maxWidth: 480, margin: "0 auto 24px", lineHeight: 1.5 }}>
                I can search across all approved guides, tasks, videos, and documentation to answer your questions instantly.
              </p>

              {/* Sample Prompts */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, maxWidth: 640, margin: "0 auto" }}>
                {samplePrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleSend(prompt)}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 10,
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      textAlign: "left",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#334155",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      transition: "all 0.15s ease"
                    }}
                  >
                    <span>{prompt}</span>
                    <ArrowRight size={13} style={{ color: "#94a3b8", flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((item) => (
              <div key={item.id || item.createdAt} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* User Message */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  <div
                    style={{
                      maxWidth: "75%",
                      padding: "12px 16px",
                      borderRadius: "16px 16px 4px 16px",
                      background: "#2563eb",
                      color: "#ffffff",
                      fontSize: 14.5,
                      lineHeight: 1.5
                    }}
                  >
                    {item.message}
                  </div>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: "#1d4ed8",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: 12,
                      flexShrink: 0
                    }}
                  >
                    {getInitials(session?.name)}
                  </div>
                </div>

                {/* Assistant Response */}
                <div style={{ display: "flex", justifyContent: "flex-start", gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #10b981, #059669)",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0
                    }}
                  >
                    <Bot size={18} />
                  </div>
                  <div
                    style={{
                      maxWidth: "80%",
                      padding: "14px 18px",
                      borderRadius: "16px 16px 16px 4px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0"
                    }}
                  >
                    <RenderMessage text={item.response} onNavigate={navigateToItem} />
                  </div>
                </div>
              </div>
            ))
          )}
          <div id="ai-chat-end" />
        </div>

        {/* Input Bar */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(0,0,0,0.06)", background: "#ffffff" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask anything about ABM knowledge, procedures, or troubleshooting..."
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSend();
              }}
              style={{
                flex: 1,
                padding: "12px 16px",
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                fontSize: 14,
                outline: "none",
                background: "#f8fafc"
              }}
            />
            <button
              type="button"
              className="primary"
              onClick={() => handleSend()}
              disabled={sending || !input.trim()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "12px 18px",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700
              }}
            >
              <Send size={15} /> Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
