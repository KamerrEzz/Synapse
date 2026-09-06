import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-ink px-4 py-12 sm:px-6 sm:py-16">
      <Suspense fallback={<p className="text-mist">Cargando…</p>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
