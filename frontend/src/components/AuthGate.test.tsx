import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthGate } from "@/components/AuthGate";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({
        id: 1,
        title: "My Board",
        columns: [{ id: 1, title: "Backlog", position: 0, cards: [] }],
      }),
    }))
  );
});

const signIn = async (username: string, password: string) => {
  const user = userEvent.setup();
  await user.type(screen.getByPlaceholderText("Username"), username);
  await user.type(screen.getByPlaceholderText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Log in" }));
  return user;
};

describe("AuthGate", () => {
  it("blocks wrong credentials and shows an error", async () => {
    render(<AuthGate />);
    await signIn("user", "wrong");
    expect(screen.getByRole("alert")).toBeVisible();
    expect(screen.queryByTestId("column-1")).not.toBeInTheDocument();
  });

  it("unlocks the board with demo credentials and relocks on logout", async () => {
    const user = userEvent.setup();
    render(<AuthGate />);
    await signIn("user", "password");
    expect(screen.getByTestId("column-1")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Log out" }));
    expect(screen.getByPlaceholderText("Username")).toBeVisible();
    expect(screen.queryByTestId("column-1")).not.toBeInTheDocument();
  });

  it("refetches the board when the AI applies changes", async () => {
    const boardPayload = {
      id: 1,
      title: "My Board",
      columns: [{ id: 1, title: "Backlog", position: 0, cards: [] }],
    };
    const fetch = vi.fn(async (url: string) => {
      if (url.startsWith("/api/ai/chat")) {
        return {
          ok: true,
          json: async () => ({ reply: "created", applied: true, board: boardPayload }),
        };
      }
      return { ok: true, json: async () => boardPayload };
    });
    vi.stubGlobal("fetch", fetch);
    const user = userEvent.setup();
    render(<AuthGate />);
    await signIn("user", "password");
    expect(await screen.findByTestId("column-1")).toBeVisible();
    const boardCalls = () =>
      fetch.mock.calls.filter(([url]) => url === "/api/board").length;
    expect(boardCalls()).toBe(1);
    expect(screen.getByTestId("ai-sidebar")).toBeVisible();
    await user.type(screen.getByTestId("ai-input"), "create X");
    await user.click(screen.getByTestId("ai-send"));
    expect(await screen.findByText("created")).toBeVisible();
    await vi.waitFor(() => expect(boardCalls()).toBe(2));
  });
});
