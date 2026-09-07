import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthGate } from "@/components/AuthGate";

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
    expect(screen.queryByTestId("column-col-backlog")).not.toBeInTheDocument();
  });

  it("unlocks the board with demo credentials and relocks on logout", async () => {
    const user = userEvent.setup();
    render(<AuthGate />);
    await signIn("user", "password");
    expect(screen.getByTestId("column-col-backlog")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Log out" }));
    expect(screen.getByPlaceholderText("Username")).toBeVisible();
    expect(screen.queryByTestId("column-col-backlog")).not.toBeInTheDocument();
  });
});
