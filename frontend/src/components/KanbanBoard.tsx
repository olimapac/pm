"use client";

import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { KanbanColumn } from "@/components/KanbanColumn";
import { KanbanCardPreview } from "@/components/KanbanCardPreview";
import * as api from "@/lib/api";
import type { BoardData } from "@/lib/kanban";

const COLUMN_COLORS = ["#c4cdd9", "#8fa3bd", "#209dd7", "#753991", "#ecad0a"];

type KanbanBoardProps = {
  refreshSignal?: number;
  query?: string;
  aiTouched?: Record<string, string>;
};

export const KanbanBoard = ({
  refreshSignal = 0,
  query = "",
  aiTouched = {},
}: KanbanBoardProps) => {
  const [board, setBoard] = useState<BoardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const renameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const load = async () => {
    try {
      setError(null);
      setBoard(await api.fetchBoard());
    } catch {
      setError("Não foi possível carregar o quadro. Verifique o backend e tente de novo.");
    }
  };

  useEffect(() => {
    load();
  }, [refreshSignal]);

  const run = async (action: () => Promise<unknown>, message: string) => {
    try {
      await action();
      await load();
    } catch {
      setError(message);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCardId(null);

    if (!over || !board || active.id === over.id) {
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;
    const targetColumn =
      board.columns.find((c) => c.id === overId) ??
      board.columns.find((c) => c.cardIds.includes(overId));
    if (!targetColumn) {
      return;
    }
    const toPosition = targetColumn.id === overId
      ? targetColumn.cardIds.length
      : targetColumn.cardIds.indexOf(overId);

    await run(
      () => api.moveCardTo(activeId, targetColumn.id, toPosition),
      "Não foi possível mover o cartão. Tente de novo."
    );
  };

  const handleRenameColumn = (columnId: string, title: string) => {
    setBoard((prev) =>
      prev
        ? {
            ...prev,
            columns: prev.columns.map((column) =>
              column.id === columnId ? { ...column, title } : column
            ),
          }
        : prev
    );
    if (renameTimer.current) {
      clearTimeout(renameTimer.current);
    }
    renameTimer.current = setTimeout(() => {
      api.renameColumn(columnId, title).catch(() => {
        setError("Não foi possível renomear a coluna. Recarregue para sincronizar.");
      });
    }, 400);
  };

  if (error && !board) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted">{error}</p>
        <button
          type="button"
          onClick={load}
          className="min-h-10 rounded-[10px] bg-secondary px-4 text-sm font-semibold text-white hover:bg-secondary-hover"
        >
          Tentar de novo
        </button>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-muted">Carregando o quadro…</p>
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const matches = (id: string) => {
    const card = board.cards[id];
    return !q || `${card.title} ${card.details}`.toLowerCase().includes(q);
  };
  const total = Object.keys(board.cards).length;
  const doneCount = board.columns.at(-1)?.cardIds.length ?? 0;
  const activeCard = activeCardId ? board.cards[activeCardId] : null;
  const colorOf = (i: number) => COLUMN_COLORS[i % COLUMN_COLORS.length];

  return (
    <div className="flex flex-col gap-[18px]">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            Quadro · {board.columns.length} etapas
          </p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight">{board.title}</h1>
        </div>

        <div className="flex min-w-[280px] flex-[0_1_460px] flex-col gap-2">
          <div className="flex items-baseline justify-between text-[13px] text-ink-3">
            <span>
              <strong className="font-semibold text-ink">
                {doneCount} de {total}
              </strong>{" "}
              cartões em {board.columns.at(-1)?.title}
            </span>
            <span className="font-mono text-xs font-semibold text-ink">
              {total ? Math.round((doneCount / total) * 100) : 0}%
            </span>
          </div>
          <div className="flex h-2 gap-[3px]" role="img" aria-label="Distribuição de cartões por etapa">
            {board.columns.map((column, i) => (
              <span
                key={column.id}
                className="rounded-[3px]"
                style={{ flex: `${column.cardIds.length} 1 0`, background: colorOf(i) }}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-muted">
            {board.columns.map((column, i) => (
              <span key={column.id} className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-[2px]" style={{ background: colorOf(i) }} />
                {column.title} <span className="font-mono text-ink">{column.cardIds.length}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {error ? (
        <p role="alert" className="rounded-[10px] bg-[#fbeceb] px-3 py-2 text-[13px] text-danger">
          {error}
        </p>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-x-auto pb-1">
          <div className="grid grid-cols-[repeat(5,minmax(228px,1fr))] items-start gap-3">
            {board.columns.map((column, i) => (
              <KanbanColumn
                key={column.id}
                column={{ ...column, cardIds: column.cardIds.filter(matches) }}
                index={i}
                color={colorOf(i)}
                cards={column.cardIds.filter(matches).map((id) => board.cards[id])}
                aiTouched={aiTouched}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onRename={handleRenameColumn}
                onAddCard={(columnId, title, details) =>
                  run(() => api.createCard(columnId, title, details), "Não foi possível adicionar o cartão. Tente de novo.")
                }
                onDeleteCard={(cardId) =>
                  run(() => api.deleteCard(cardId), "Não foi possível remover o cartão. Tente de novo.")
                }
                onSaveCard={(cardId, title, details) =>
                  run(() => api.updateCard(cardId, title, details), "Não foi possível salvar o cartão. Tente de novo.")
                }
              />
            ))}
          </div>
        </div>
        <DragOverlay>
          {activeCard ? (
            <div className="w-[240px]">
              <KanbanCardPreview card={activeCard} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
