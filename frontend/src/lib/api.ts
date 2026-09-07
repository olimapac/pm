import type { BoardData } from "@/lib/kanban";

type ServerCard = {
  id: number;
  column_id: number;
  title: string;
  details: string;
  position: number;
};

type ServerColumn = {
  id: number;
  title: string;
  position: number;
  cards: ServerCard[];
};

type ServerBoard = {
  id: number;
  title: string;
  columns: ServerColumn[];
};

const req = async (path: string, init?: RequestInit) => {
  const r = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!r.ok) {
    throw new Error(`${init?.method ?? "GET"} ${path} failed: ${r.status}`);
  }
  return r.json();
};

export const fetchBoard = async (): Promise<BoardData> => {
  const board: ServerBoard = await req("/api/board");
  const cards: BoardData["cards"] = {};
  const columns = board.columns.map((c) => {
    const cardIds = c.cards.map((card) => {
      const id = String(card.id);
      cards[id] = { id, title: card.title, details: card.details };
      return id;
    });
    return { id: String(c.id), title: c.title, cardIds };
  });
  return { columns, cards };
};

export const renameColumn = (columnId: string, title: string) =>
  req(`/api/columns/${columnId}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });

export const createCard = (columnId: string, title: string, details: string) =>
  req("/api/cards", {
    method: "POST",
    body: JSON.stringify({
      column_id: Number(columnId),
      title,
      details,
    }),
  });

export const deleteCard = (cardId: string) =>
  req(`/api/cards/${cardId}`, { method: "DELETE" });

export const moveCardTo = (
  cardId: string,
  toColumnId: string,
  toPosition: number
) =>
  req("/api/cards/move", {
    method: "POST",
    body: JSON.stringify({
      card_id: Number(cardId),
      to_column_id: Number(toColumnId),
      to_position: toPosition,
    }),
  });

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type ChatResult = { reply: string; applied: boolean };

export const sendChat = async (
  message: string,
  history: ChatMessage[] = []
): Promise<ChatResult> => {
  const res = await req("/api/ai/chat", {
    method: "POST",
    body: JSON.stringify({ message, history }),
  });
  return { reply: res.reply, applied: res.applied === true };
};
