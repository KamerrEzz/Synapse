import { test, expect } from "@playwright/test";

test("login shows password, magic link and oauth options", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByLabel("Correo")).toBeVisible();
  await expect(page.getByLabel("Contraseña")).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Enviar magic link" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Google" })).toBeVisible();
  await expect(page.getByRole("button", { name: "GitHub" })).toBeVisible();
});

test("protected workspace list redirects to login", async ({ page }) => {
  await page.goto("/workspaces");
  await expect(page).toHaveURL(/\/login/);
  await expect(page).toHaveURL(/next=%2Fworkspaces/);
});

test("unknown invite token is rejected", async ({ page }) => {
  await page.goto("/invite/not-a-real-token", { waitUntil: "domcontentloaded" });
  await expect(page.getByText(/invitación no encontrada/i)).toBeVisible();
});
