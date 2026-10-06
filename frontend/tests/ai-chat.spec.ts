import { expect, test } from "@playwright/test";

test("creates a card via the AI sidebar without manual reload", async ({
  page,
}) => {
  test.setTimeout(480_000);
  const title = `E2E AI ${Date.now()}`;
  await page.goto("/");
  await page.getByLabel("Usuário").fill("user");
  await page.getByLabel("Senha").fill("password");
  await page.getByRole("button", { name: "Entrar no quadro" }).click();
  await expect(page.locator('[data-testid^="column-"]').first()).toBeVisible();
  await expect(page.getByTestId("ai-sidebar")).toBeVisible();

  await page.getByTestId("ai-input").fill(`Create a card titled '${title}' in Backlog`);
  await page.getByTestId("ai-send").click();
  await expect(page.getByTestId("ai-loading")).toBeVisible();
  await expect(
    page.locator('[data-testid^="card-"]', { hasText: title })
  ).toBeVisible({ timeout: 420_000 });
});
