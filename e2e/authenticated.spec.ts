import { expect, test } from "@playwright/test";

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;

test("authenticated user can create and delete a category", async ({
  page
}) => {
  test.skip(!email || !password, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD.");

  await page.goto("/fr/login");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Mot de passe").fill(password!);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/fr\/dashboard$/);

  const title = "E2E " + Date.now();
  await page.goto("/fr/dashboard/categories");
  const createPanel = page.locator(".resource-create");
  await createPanel.getByLabel("Titre").fill(title);
  await createPanel.getByLabel("Description").fill("Created by Playwright");
  await createPanel.getByRole("button", { name: "Cr\u00e9er" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  const card = page.locator(".resource-card").filter({ hasText: title });
  await card.getByRole("button", { name: "Supprimer" }).click();
  await expect(page.getByRole("heading", { name: title })).toHaveCount(0);
});