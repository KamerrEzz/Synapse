import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-ink px-4 sm:px-6">
      <h1 className="font-display text-4xl">No está aquí</h1>
      <p className="mt-3 text-mist">Esa página no existe o no tienes acceso.</p>
      <Link href="/workspaces" className="mt-6 text-spark underline">
        Volver a workspaces
      </Link>
    </main>
  );
}
