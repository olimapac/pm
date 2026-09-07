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
});
