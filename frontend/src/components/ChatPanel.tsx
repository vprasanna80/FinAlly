"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/types";

interface ChatPanelProps {
  messages: ChatMessage[];
  loading: boolean;
  onSend: (message: string) => void;
}

export function ChatPanel({ messages, loading, onSend }: ChatPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo?.({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const message = draft.trim();
    if (!message || loading) return;
    onSend(message);
    setDraft("");
  };

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="flex h-full w-10 items-center justify-center rounded-md border border-border-muted bg-panel text-accent-purple"
        aria-label="Expand chat panel"
      >
        <span className="[writing-mode:vertical-rl]">AI Chat</span>
      </button>
    );
  }

  return (
    <div className="flex h-full w-full flex-col rounded-md border border-border-muted bg-panel sm:w-80">
      <div className="flex items-center justify-between border-b border-border-muted px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
          AI Assistant
        </h2>
        <button
          onClick={() => setCollapsed(true)}
          aria-label="Collapse chat panel"
          className="text-foreground-muted hover:text-foreground"
        >
          −
        </button>
      </div>

      <div ref={scrollRef} className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {messages.length === 0 && (
          <p className="text-sm text-foreground-muted">
            Ask FinAlly about your portfolio, or tell it to make a trade.
          </p>
        )}
        {messages.map((m) => (
          <ChatBubble key={m.id} message={m} />
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-foreground-muted" data-testid="chat-loading">
            <span className="h-2 w-2 animate-bounce rounded-full bg-accent-purple [animation-delay:-0.3s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-accent-purple [animation-delay:-0.15s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-accent-purple" />
          </div>
        )}
      </div>

      <form onSubmit={submit} className="flex gap-2 border-t border-border-muted p-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask FinAlly…"
          aria-label="Chat message"
          className="min-w-0 flex-1 rounded border border-border-muted bg-elevated px-2 py-1.5 text-sm outline-none focus:border-accent-blue"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-accent-purple px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const actions = message.actions;
  const hasActions =
    actions && (actions.trades.length > 0 || actions.watchlist_changes.length > 0 || actions.errors.length > 0);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
          isUser ? "bg-accent-blue text-white" : "bg-elevated text-foreground"
        }`}
      >
        <div>{message.content}</div>
        {hasActions && (
          <div className="mt-2 space-y-1 border-t border-white/10 pt-2 text-xs">
            {actions!.trades.map((t, i) => (
              <div key={i} className="text-up">
                ✓ {t.side === "buy" ? "Bought" : "Sold"} {t.quantity} {t.ticker} @ ${t.price.toFixed(2)}
              </div>
            ))}
            {actions!.watchlist_changes.map((c, i) => (
              <div key={i} className="text-accent-yellow">
                ✓ {c.action === "add" ? "Added" : "Removed"} {c.ticker}{" "}
                {c.action === "add" ? "to" : "from"} watchlist
              </div>
            ))}
            {actions!.errors.map((err, i) => (
              <div key={i} className="text-down">
                ✗ {err}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
