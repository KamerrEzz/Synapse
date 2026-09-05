import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-6 py-16">
      <Suspense fallback={<p className="text-mist">Cargando…</p>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
