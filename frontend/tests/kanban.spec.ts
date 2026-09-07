import { expect, test, type Page } from "@playwright/test";

const columns = (page: Page) => page.locator('[data-testid^="column-"]');

const signIn = async (page: Page) => {
  await page.goto("/");
  await page.getByPlaceholder("Username").fill("user");
  await page.getByPlaceholder("Password").fill("password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(columns(page).first()).toBeVisible();
};

test("rejects wrong credentials", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder("Username").fill("user");
  await page.getByPlaceholder("Password").fill("wrong");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("Invalid credentials")).toBeVisible();
  await expect(columns(page)).toHaveCount(0);
});

test("logs in and out", async ({ page }) => {
  await signIn(page);
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByPlaceholder("Username")).toBeVisible();
  await expect(columns(page)).toHaveCount(0);
});

test("loads the kanban board", async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole("heading", { name: "Kanban Studio" })).toBeVisible();
  await expect(columns(page)).toHaveCount(5);
});

test("adds a card to a column", async ({ page }) => {
  await signIn(page);
  const firstColumn = columns(page).first();
  await firstColumn.getByRole("button", { name: /add a card/i }).click();
  await firstColumn.getByPlaceholder("Card title").fill("Playwright card");
  await firstColumn.getByPlaceholder("Details").fill("Added via e2e.");
  await firstColumn.getByRole("button", { name: /add card/i }).click();
  await expect(firstColumn.getByText("Playwright card")).toBeVisible();
});

test("persists changes across reload", async ({ page }) => {
  await signIn(page);
  const firstColumn = columns(page).first();
  await firstColumn.getByLabel("Column title").fill("Persisted Title");
  await expect
    .poll(async () => {
      const board = await page.evaluate(() =>
        fetch("/api/board").then((r) => r.json())
      );
      return board.columns[0].title;
    })
    .toBe("Persisted Title");
  await firstColumn.getByRole("button", { name: /add a card/i }).click();
  await firstColumn.getByPlaceholder("Card title").fill("Persisted card");
  await firstColumn.getByRole("button", { name: /add card/i }).click();
  await expect(firstColumn.getByText("Persisted card")).toBeVisible();
  await page.reload();
  await page.getByPlaceholder("Username").fill("user");
  await page.getByPlaceholder("Password").fill("password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(columns(page).first().getByLabel("Column title")).toHaveValue(
    "Persisted Title"
  );
  await expect(page.getByText("Persisted card")).toBeVisible();
});

test("moves a card between columns", async ({ page }) => {
  await signIn(page);
  const sourceColumn = columns(page).first();
  const targetColumn = columns(page).nth(1);
  const cardTitle = await sourceColumn
    .locator('[data-testid^="card-"]')
    .first()
    .getByRole("heading")
    .textContent();
  const card = sourceColumn.locator('[data-testid^="card-"]').first();
  const cardBox = await card.boundingBox();
  const columnBox = await targetColumn.boundingBox();
  if (!cardBox || !columnBox) {
    throw new Error("Unable to resolve drag coordinates.");
  }

  await page.mouse.move(
    cardBox.x + cardBox.width / 2,
    cardBox.y + cardBox.height / 2
  );
  await page.mouse.down();
  await page.mouse.move(
    columnBox.x + columnBox.width / 2,
    columnBox.y + 120,
    { steps: 12 }
  );
  await page.mouse.up();
  await expect(targetColumn.getByText(cardTitle ?? "")).toBeVisible();
});
