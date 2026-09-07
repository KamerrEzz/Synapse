import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-ink px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-6 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-spark" aria-hidden />
        <span className="font-display text-xl tracking-tight">Synapse</span>
      </div>
      <Suspense fallback={<p className="text-mist">Cargando…</p>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
