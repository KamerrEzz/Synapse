import { createClient } from "@supabase/supabase-js";

export function supabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return { url, anon };
}

export async function createConfirmedTestUser() {
  const seededEmail = process.env.E2E_EMAIL;
  const seededPassword = process.env.E2E_PASSWORD;
  if (seededEmail && seededPassword) {
    return { email: seededEmail, password: seededPassword, confirmed: true };
  }

  const { url, anon } = supabasePublicEnv();
  if (!url || !anon) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const email = `e2e.${Date.now()}@gmail.com`;
  const password = "SynapseE2e!234";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (service) {
    const admin = createClient(url, service, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "E2E Synapse" },
    });
    if (error) throw new Error(`No se pudo crear el usuario de prueba: ${error.message}`);
    return { email, password, confirmed: true };
  }

  const supabase = createClient(url, anon);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: "E2E Synapse" } },
  });
  if (error) throw new Error(`No se pudo registrar: ${error.message}`);
  return { email, password, confirmed: Boolean(data.session) };
}
