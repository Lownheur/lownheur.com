import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;

async function expectNoAccessibilityViolations(page: Page, context: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    results.violations.map(({ id, impact, nodes }) => ({ id, impact, targets: nodes.map((node) => node.target) })),
    context
  ).toEqual([]);
}

test("authenticated user completes the V1 organization journey", async ({
  page
}) => {
  test.skip(!email || !password, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD.");

  await page.goto("/fr/login");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Mot de passe").fill(password!);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/fr\/dashboard$/);
  await expectNoAccessibilityViolations(page, "dashboard");

  const suffix = Date.now().toString();
  const category = "E2E Cat " + suffix;
  const categoryUpdated = category + " updated";
  const event = "E2E Event " + suffix;
  const goal = "E2E Goal " + suffix;

  await page.goto("/fr/dashboard/categories");
  await page.getByRole("button", { name: "Ajouter" }).click();
  const createPanel = page.getByRole("dialog");
  await expectNoAccessibilityViolations(page, "category create dialog");
  await createPanel.getByLabel("Titre").fill(category);
  await createPanel.getByLabel("Description").fill("Created by Playwright");
  await createPanel.getByRole("button", { name: "Créer" }).click();
  await expect(page.getByRole("heading", { name: category })).toBeVisible();

  const categoryCard = page.locator(".resource-card").filter({ hasText: category });
  await categoryCard.getByRole("button", { name: "Modifier" }).click();
  const categoryDialog = page.getByRole("dialog");
  await categoryDialog.getByLabel("Titre").fill(categoryUpdated);
  await categoryDialog.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("heading", { name: categoryUpdated })).toBeVisible();

  await page.goto("/fr/dashboard/events");
  await page.getByRole("button", { name: "Ajouter" }).click();
  const eventPanel = page.getByRole("dialog");
  await eventPanel.getByLabel("Catégorie").selectOption({ label: categoryUpdated });
  await eventPanel.getByLabel("Titre").fill(event);
  await eventPanel.getByLabel("Description").fill("V1 event");
  await eventPanel.getByRole("button", { name: "Créer" }).click();
  await expect(page.getByRole("heading", { name: event })).toBeVisible();

  await page.goto("/fr/dashboard/goals");
  await page.getByRole("button", { name: "Ajouter" }).click();
  const goalPanel = page.getByRole("dialog");
  await goalPanel.getByLabel("Catégorie").selectOption({ label: categoryUpdated });
  await goalPanel.getByLabel("Titre").fill(goal);
  await goalPanel.getByLabel("Statut").selectOption("in_progress");
  await goalPanel.getByRole("button", { name: "Créer" }).click();
  await expect(page.getByRole("heading", { name: goal })).toBeVisible();
  await expect(page.locator(".resource-card").filter({ hasText: goal })).toContainText("En cours");

  await page.goto("/fr/dashboard/schedules");
  await page.getByRole("button", { name: "Ajouter" }).click();
  const schedulePanel = page.getByRole("dialog");
  await schedulePanel.getByLabel("Événement ou objectif").selectOption({ label: event });
  await schedulePanel.getByLabel("Début").fill("2030-01-15T10:30");
  await schedulePanel.getByRole("button", { name: "Créer" }).click();
  await expect(page.getByRole("status")).toContainText("Élément créé");

  await page.goto("/fr/dashboard");
  for (const resource of ["Catégories", "Événements", "Objectifs", "Planifications"]) {
    await expect(page.locator(".stat-card").filter({ hasText: resource }).locator("strong")).toHaveText(/^[1-9]\d*$/);
  }

  await page.goto("/fr/dashboard/schedules");
  const scheduleCard = page.locator(".resource-card").filter({
    has: page.getByRole("heading", { name: event, exact: true })
  });
  await scheduleCard.getByRole("button", { name: "Supprimer" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Supprimer" }).click();

  await page.goto("/fr/dashboard/goals");
  const goalCard = page.locator(".resource-card").filter({ has: page.getByRole("heading", { name: goal, exact: true }) });
  await goalCard.getByRole("button", { name: "Supprimer" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Supprimer" }).click();

  await page.goto("/fr/dashboard/events");
  const eventCard = page.locator(".resource-card").filter({
    has: page.getByRole("heading", { name: event, exact: true })
  });
  await eventCard.getByRole("button", { name: "Supprimer" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Supprimer" }).click();

  await page.goto("/fr/dashboard/categories");
  const finalCategoryCard = page.locator(".resource-card").filter({ has: page.getByRole("heading", { name: categoryUpdated, exact: true }) });
  await finalCategoryCard.getByRole("button", { name: "Supprimer" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Supprimer" }).click();
  await expect(page.getByRole("heading", { name: categoryUpdated })).toHaveCount(0);
});
