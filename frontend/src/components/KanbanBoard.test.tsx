import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { KanbanBoard } from "@/components/KanbanBoard";

const col = (id: number, title: string, cards: object[] = []) => ({
  id,
  title,
  position: 0,
  cards,
});

const card = (id: number, column_id: number, title: string) => ({
  id,
  column_id,
  title,
  details: "Details",
  position: 0,
});

const boardWith = (cards: object[]) => ({
  id: 1,
  title: "My Board",
  columns: [col(1, "Backlog", cards)],
});

const json = (payload: unknown) => ({ ok: true, json: async () => payload });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

const getFirstColumn = () => screen.getAllByTestId(/column-/i)[0];

describe("KanbanBoard", () => {
  it("loads columns from the API", async () => {
    fetchMock.mockResolvedValueOnce(
      json(boardWith([card(7, 1, "From API")]))
    );
    render(<KanbanBoard />);
    expect(await screen.findByTestId("column-1")).toBeVisible();
    expect(screen.getByText("From API")).toBeVisible();
  });

  it("shows an error with retry when the API is down", async () => {
    fetchMock.mockRejectedValueOnce(new Error("down"));
    render(<KanbanBoard />);
    expect(await screen.findByText(/could not load/i)).toBeVisible();
    fetchMock.mockResolvedValueOnce(json(boardWith([])));
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByTestId("column-1")).toBeVisible();
  });

  it("renames a column via PATCH", async () => {
    fetchMock.mockResolvedValueOnce(json(boardWith([])));
    render(<KanbanBoard />);
    await screen.findByTestId("column-1");
    const input = within(getFirstColumn()).getByLabelText("Column title");
    fetchMock.mockResolvedValueOnce(json({}));
    await userEvent.clear(input);
    await userEvent.type(input, "Todo");
    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith("/api/columns/1", {
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
        body: JSON.stringify({ title: "Todo" }),
      });
    });
  });

  it("adds a card via the API", async () => {
    fetchMock.mockResolvedValueOnce(json(boardWith([])));
    fetchMock.mockResolvedValueOnce(json({}));
    fetchMock.mockResolvedValueOnce(
      json(boardWith([card(99, 1, "New card")]))
    );
    render(<KanbanBoard />);
    await screen.findByTestId("column-1");
    const column = getFirstColumn();
    await userEvent.click(
      within(column).getByRole("button", { name: /add a card/i })
    );
    await userEvent.type(
      within(column).getByPlaceholderText(/card title/i),
      "New card"
    );
    await userEvent.click(
      within(column).getByRole("button", { name: /add card/i })
    );
    expect(await within(column).findByText("New card")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/cards",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("deletes a card via the API", async () => {
    fetchMock.mockResolvedValueOnce(
      json(boardWith([card(7, 1, "Gone soon")]))
    );
    fetchMock.mockResolvedValueOnce(json({}));
    fetchMock.mockResolvedValueOnce(json(boardWith([])));
    render(<KanbanBoard />);
    await screen.findByText("Gone soon");
    const column = getFirstColumn();
    await userEvent.click(
      within(column).getByRole("button", { name: /delete gone soon/i })
    );
    expect(fetchMock).toHaveBeenCalledWith("/api/cards/7", expect.objectContaining({ method: "DELETE" }));
  });
});
