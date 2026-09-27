"use client";

import { useState } from "react";
import { AiPanel } from "@/components/AiPanel";
import { KanbanBoard } from "@/components/KanbanBoard";
import { LoginForm } from "@/components/LoginForm";

export const AuthGate = () => {
  const [authed, setAuthed] = useState(false);
  const [boardRefresh, setBoardRefresh] = useState(0);

  if (!authed) {
    return <LoginForm onLogin={() => setAuthed(true)} />;
  }

  return (
    <div>
      <div className="mx-auto flex max-w-[1500px] justify-end px-4 pt-3">
        <button
          type="button"
          onClick={() => setAuthed(false)}
          className="rounded-full border border-[var(--stroke)] bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)] transition hover:text-[var(--navy-dark)]"
        >
          Log out
        </button>
      </div>
      <div className="mx-auto flex max-w-[1500px] flex-col gap-3 px-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <KanbanBoard refreshSignal={boardRefresh} />
        </div>
        <AiPanel onApplied={() => setBoardRefresh((n) => n + 1)} />
      </div>
    </div>
  );
};
