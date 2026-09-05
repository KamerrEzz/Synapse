import { test, expect } from "@playwright/test";
import { createConfirmedTestUser, supabasePublicEnv } from "./helpers";

const { url, anon } = supabasePublicEnv();

test.describe("authenticated workspace flow", () => {
  test.skip(!url || !anon, "Faltan credenciales de Supabase");

  test("sign in, create workspace and exercise main surfaces", async ({ page }) => {
    test.setTimeout(180_000);
    const user = await createConfirmedTestUser();
    if (!user.confirmed) {
      test.info().annotations.push({
        type: "note",
        description:
          "Supabase exige confirmar el correo; el flujo autenticado no puede completarse en e2e.",
      });
      test.skip(true, "Confirmación de email activa y no hay SUPABASE_SERVICE_ROLE_KEY");
    }

    await page.goto("/login");
    await page.getByLabel("Correo").fill(user.email);
    await page.getByLabel("Contraseña").fill(user.password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("heading", { name: "Tus workspaces" })).toBeVisible({
      timeout: 60_000,
    });

    const name = `E2E ${Date.now()}`;
    await page.getByLabel("Nombre").fill(name);
    await page.getByRole("button", { name: "Crear workspace" }).click();
    await expect(page.getByRole("heading", { name: "Documentos" })).toBeVisible({
      timeout: 60_000,
    });

    await page.getByRole("button", { name: "Nuevo documento" }).click();
    await expect(page).toHaveURL(/\/documents\/[0-9a-f-]{36}/, { timeout: 60_000 });
    await expect(page.getByText(/En vivo|Conectando|Sin conexión/)).toBeVisible();

    await page.getByRole("link", { name: "Chat" }).click();
    await expect(page.getByText("#general").first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByLabel("Mensaje")).toBeVisible();
    const ping = `hola e2e ${Date.now()}`;
    await page.getByLabel("Mensaje").fill(ping);
    await page.getByRole("button", { name: "Enviar" }).click();
    await expect(page.getByText(ping)).toBeVisible({ timeout: 20_000 });

    await page.getByRole("link", { name: "Archivos" }).click();
    await expect(page.getByRole("heading", { name: "Archivos" })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText("Nada indexado todavía")).toBeVisible();

    await page.getByRole("link", { name: "IA" }).click();
    await expect(page.getByRole("heading", { name: "IA del workspace" })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByRole("link", { name: "Ir a Ajustes" })).toBeVisible();

    await page.getByRole("link", { name: "Buscar" }).click();
    await expect(page.getByRole("heading", { name: "Buscar" })).toBeVisible({
      timeout: 60_000,
    });

    await page.getByRole("link", { name: "Ajustes" }).click();
    await expect(page.getByRole("heading", { name: "Ajustes" })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText(/plan free/i)).toBeVisible();
    await expect(page.getByText("Clave de IA")).toBeVisible();
  });
});
