"use client";

import { useState, type FormEvent } from "react";
import { sendChat, type ChatMessage } from "@/lib/api";

type AiSidebarProps = {
  onApplied: () => void;
};

export const AiSidebar = ({ onApplied }: AiSidebarProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || sending) {
      return;
    }
    const history = [...messages, { role: "user", content: text } as ChatMessage];
    setMessages(history);
    setInput("");
    setSending(true);
    setError(null);
    try {
      const { reply, applied } = await sendChat(text, messages);
      setMessages([...history, { role: "assistant", content: reply }]);
      if (applied) {
        onApplied();
      }
    } catch {
      setError("Could not reach the assistant. Retry.");
    } finally {
      setSending(false);
    }
  };

  return (
    <aside
      data-testid="ai-sidebar"
      className="flex w-full flex-col rounded-[24px] border border-[var(--stroke)] bg-white/80 shadow-[var(--shadow)] backdrop-blur lg:sticky lg:top-6 lg:h-fit lg:w-[340px] lg:shrink-0"
    >
      <div className="border-b-2 border-[var(--accent-yellow)] px-5 py-4">
        <h2 className="font-display text-lg font-semibold text-[var(--navy-dark)]">
          AI Assistant
        </h2>
        <p className="mt-1 text-xs leading-5 text-[var(--gray-text)]">
          Ask to create, edit, or move cards.
        </p>
      </div>

      <div data-testid="ai-messages" className="flex max-h-[420px] flex-col gap-3 overflow-y-auto px-5 py-4">
        {messages.length === 0 ? (
          <p className="text-xs leading-5 text-[var(--gray-text)]">
            Try “Create a card titled Launch plan in Backlog”.
          </p>
        ) : (
          messages.map((message, index) => (
            <p
              key={index}
              className={
                message.role === "user"
                  ? "self-end rounded-2xl rounded-br-sm bg-[var(--primary-blue)] px-3 py-2 text-sm text-white"
                  : "self-start rounded-2xl rounded-bl-sm bg-[var(--surface)] px-3 py-2 text-sm text-[var(--navy-dark)]"
              }
            >
              {message.content}
            </p>
          ))
        )}
        {sending ? (
          <p data-testid="ai-loading" className="text-xs text-[var(--gray-text)]">
            Thinking…
          </p>
        ) : null}
        {error ? (
          <p data-testid="ai-error" role="alert" className="text-xs text-red-600">
            {error}
          </p>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-[var(--stroke)] px-5 py-4">
        <input
          data-testid="ai-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask AI..."
          aria-label="Ask AI"
          disabled={sending}
          className="min-w-0 flex-1 rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)] disabled:opacity-60"
        />
        <button
          data-testid="ai-send"
          type="submit"
          disabled={sending || !input.trim()}
          className="rounded-full bg-[var(--secondary-purple)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </aside>
  );
};
