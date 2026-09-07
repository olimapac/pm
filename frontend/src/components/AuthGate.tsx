"use client";

import { useState } from "react";
import { AiSidebar } from "@/components/AiSidebar";
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
      <div className="mx-auto flex max-w-[1500px] justify-end px-6 pt-6">
        <button
          type="button"
          onClick={() => setAuthed(false)}
          className="rounded-full border border-[var(--stroke)] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)] transition hover:text-[var(--navy-dark)]"
        >
          Log out
        </button>
      </div>
      <div className="mx-auto flex max-w-[1500px] flex-col gap-6 px-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <KanbanBoard refreshSignal={boardRefresh} />
        </div>
        <AiSidebar onApplied={() => setBoardRefresh((n) => n + 1)} />
      </div>
    </div>
  );
};
