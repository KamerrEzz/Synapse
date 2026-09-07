import { test, expect } from "@playwright/test";

test("landing explains the product and links to login", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /conocimiento de tu equipo/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Crear workspace gratis" })).toHaveAttribute(
    "href",
    "/login",
  );
  await page.getByRole("link", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: /entrar a synapse/i })).toBeVisible();
});
