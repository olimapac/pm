"use client";

import { useEffect, useRef, useState } from "react";
import { AiPanel } from "@/components/AiPanel";
import { KanbanBoard } from "@/components/KanbanBoard";
import { LoginForm } from "@/components/LoginForm";
import { Logo } from "@/components/Logo";
import type { ChatOp } from "@/lib/api";

const AI_LABELS: Partial<Record<ChatOp["op"], string>> = {
  create_card: "criado",
  update_card: "editado",
  move_card: "movido",
};

export const AuthGate = () => {
  const [authed, setAuthed] = useState(false);
  const [boardRefresh, setBoardRefresh] = useState(0);
  const [aiTouched, setAiTouched] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleApplied = (ops: ChatOp[]) => {
    setAiTouched((prev) => {
      const next = { ...prev };
      for (const op of ops) {
        const label = AI_LABELS[op.op];
        if (label && op.card_id !== undefined) {
          next[String(op.card_id)] = label;
        }
      }
      return next;
    });
    setBoardRefresh((n) => n + 1);
  };

  if (!authed) {
    return <LoginForm onLogin={() => setAuthed(true)} />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center gap-4 border-b border-line bg-white px-6 py-3">
        <div className="flex items-center gap-2.5">
          <Logo />
          <span className="text-[15px] font-semibold tracking-tight">Kanban Studio</span>
        </div>
        <span className="text-[#c3cad5]" aria-hidden="true">/</span>
        <span className="font-medium text-ink-3">Meu projeto</span>

        <div className="flex-[1_1_120px]" />

        <label className="flex min-h-10 min-w-[240px] items-center gap-2.5 rounded-[10px] border border-line bg-[#f8f9fb] px-3 text-[13px] text-muted focus-within:border-primary focus-within:bg-white">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <span className="sr-only">Buscar cartões</span>
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar cartões"
            className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-muted"
          />
          <kbd className="rounded-md border border-[#dde2ea] bg-white px-1.5 py-0.5 font-mono text-[11px]">Ctrl K</kbd>
        </label>

        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-[13px] font-semibold text-white" aria-hidden="true">
            U
          </span>
          <button
            type="button"
            onClick={() => setAuthed(false)}
            className="flex min-h-10 items-center gap-1.5 rounded-[10px] px-3 text-[13px] font-medium text-ink-3 transition hover:bg-[#e9ecf2]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
              <path d="M10 17l-5-5 5-5" />
              <path d="M5 12h11" />
            </svg>
            Sair
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-5 px-6 pb-6 pt-5 lg:flex-row lg:items-start">
        <main className="min-w-0 flex-1">
          <KanbanBoard refreshSignal={boardRefresh} query={query} aiTouched={aiTouched} />
        </main>
        <AiPanel onApplied={handleApplied} />
      </div>
    </div>
  );
};
