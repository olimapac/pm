import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  fetchBoard,
  renameColumn,
  createCard,
  deleteCard,
  moveCardTo,
} from "@/lib/api";

const serverBoard = {
  id: 1,
  title: "My Board",
  columns: [
    {
      id: 1,
      title: "Backlog",
      position: 0,
      cards: [{ id: 7, column_id: 1, title: "Hello", details: "World", position: 0 }],
    },
    { id: 2, title: "Done", position: 1, cards: [] },
  ],
};

const mockFetch = (payload: unknown) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => payload }))
  );

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("api client", () => {
  it("maps the server board to string ids", async () => {
    mockFetch(serverBoard);
    const board = await fetchBoard();
    expect(board.columns[0]).toEqual({ id: "1", title: "Backlog", cardIds: ["7"] });
    expect(board.cards["7"]).toEqual({ id: "7", title: "Hello", details: "World" });
  });

  it("throws on HTTP errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500 })));
    await expect(fetchBoard()).rejects.toThrow("GET /api/board failed: 500");
  });

  it("sends mutations with the right method and body", async () => {
    const fetch = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
    vi.stubGlobal("fetch", fetch);

    await renameColumn("1", "Todo");
    expect(fetch).toHaveBeenCalledWith("/api/columns/1", {
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
      body: JSON.stringify({ title: "Todo" }),
    });

    await createCard("2", "T", "D");
    expect(fetch).toHaveBeenCalledWith("/api/cards", {
      headers: { "Content-Type": "application/json" },
      method: "POST",
      body: JSON.stringify({ column_id: 2, title: "T", details: "D" }),
    });

    await deleteCard("7");
    expect(fetch).toHaveBeenCalledWith("/api/cards/7", {
      headers: { "Content-Type": "application/json" },
      method: "DELETE",
    });

    await moveCardTo("7", "2", 0);
    expect(fetch).toHaveBeenCalledWith("/api/cards/move", {
      headers: { "Content-Type": "application/json" },
      method: "POST",
      body: JSON.stringify({ card_id: 7, to_column_id: 2, to_position: 0 }),
    });
  });
});
