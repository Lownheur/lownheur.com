import { expect, test } from "@playwright/test";

test("landing, theme, locale and legal navigation", async ({ page }) => {
  await page.goto("/fr");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Passez de l'intention \u00e0 l'action."
    })
  ).toBeVisible();

  const root = page.locator("html");
  const themeButton = page.getByRole("button", { name: "Th\u00e8me" });
  await expect(themeButton).toHaveAttribute("data-ready", "true");
  const initialTheme = await root.getAttribute("data-theme");
  await themeButton.click();
  await expect(root).not.toHaveAttribute("data-theme", initialTheme ?? "");

  await page
    .getByRole("button", { name: "Switch to English" })
    .click();
  await expect(page).toHaveURL(/\/en/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Turn intention into action."
    })
  ).toBeVisible();

  await page.getByRole("link", { name: "Privacy", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/privacy$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Privacy" })
  ).toBeVisible();
});

test("signup form exposes accessible required fields", async ({ page }) => {
  await page.goto("/fr/signup");
  await expect(
    page.getByRole("heading", { level: 1, name: "Cr\u00e9er votre espace" })
  ).toBeVisible();
  await expect(page.getByLabel("Nom affich\u00e9")).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Mot de passe")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cr\u00e9er mon compte" })
  ).toBeVisible();
});