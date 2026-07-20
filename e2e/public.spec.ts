import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("root chooses a locale and unknown routes use the Lownheur 404", async ({
  page
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/(fr|en)$/);

  const response = await page.goto("/fr/chemin-introuvable");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { level: 1, name: "Page introuvable" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Revenir à l’accueil" })
  ).toHaveAttribute("href", "/fr");
});

test("OAuth consent callback is never intercepted by the custom 404", async ({ page }) => {
  const response = await page.goto("/oauth/consent");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: "Autorisation impossible" })).toBeVisible();
  await expect(page.getByText("Page introuvable")).toHaveCount(0);
});

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

test("critical public pages have no automated WCAG A or AA violations", async ({
  page
}) => {
  for (const path of ["/fr", "/fr/login", "/fr/signup", "/fr/privacy"]) {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(
      results.violations.map(({ id, impact, nodes }) => ({
        id,
        impact,
        targets: nodes.map((node) => node.target)
      })),
      path
    ).toEqual([]);
  }
});
