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
  const [copilotOpen, setCopilotOpen] = useState(true);
  const [shortcut, setShortcut] = useState("Ctrl K");
  const [planIds, setPlanIds] = useState<string[]>([]);
  const [planFocusId, setPlanFocusId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.userAgent)) {
      setShortcut("⌘K");
    }
    if (window.innerWidth < 1360) {
      setCopilotOpen(false);
    }
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleChanged = (ops: ChatOp[], undone: boolean) => {
    setAiTouched((prev) => {
      const next = { ...prev };
      for (const op of ops) {
        const label = AI_LABELS[op.op];
        if (label && op.card_id !== undefined) {
          if (undone) {
            delete next[String(op.card_id)];
          } else {
            next[String(op.card_id)] = label;
          }
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
      <a
        href="#copiloto"
        onClick={() => setCopilotOpen(true)}
        className="sr-only z-50 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-3"
      >
        Pular para o copiloto
      </a>
      <header className="flex flex-wrap items-center gap-4 border-b border-line bg-white px-6 py-3">
        <div className="flex items-center gap-2.5">
          <Logo />
          <span className="text-[15px] font-semibold tracking-tight">Kanban Studio</span>
        </div>

        <div className="flex-[1_1_120px]" />

        <label className="flex min-h-10 w-[300px] max-w-full items-center gap-2.5 rounded-[10px] border border-line bg-subtle px-3 text-sm text-muted transition focus-within:border-primary focus-within:bg-white focus-within:ring-3 focus-within:ring-primary/20">
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
            onKeyDown={(event) => event.key === "Escape" && setQuery("")}
            placeholder="Buscar cartões"
            className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-muted"
          />
          <kbd className="rounded-md border border-chip bg-white px-1.5 py-0.5 font-sans text-xs">{shortcut}</kbd>
        </label>

        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-white" aria-hidden="true">
            U
          </span>
          <button
            type="button"
            onClick={() => setAuthed(false)}
            className="flex min-h-10 items-center gap-1.5 rounded-[10px] px-3 text-sm font-medium text-ink-3 transition hover:bg-hover"
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

      <div className="flex flex-1 flex-col gap-5 px-6 pb-6 pt-6 lg:flex-row lg:items-start">
        <main className="min-w-0 flex-1">
          <KanbanBoard
            refreshSignal={boardRefresh}
            query={query}
            onClearQuery={() => {
              setQuery("");
              searchRef.current?.focus();
            }}
            aiTouched={aiTouched}
            planIds={planIds}
            planFocusId={planFocusId}
          />
        </main>
        <AiPanel
          open={copilotOpen}
          onToggle={() => setCopilotOpen((v) => !v)}
          onChanged={handleChanged}
          onPlanChange={setPlanIds}
          onPlanFocus={setPlanFocusId}
        />
      </div>
    </div>
  );
};
