"use client";

import { useState } from "react";
import Link from "next/link";
import type { SearchHit } from "@/types/database";

export function SearchBox({
  workspaceId,
  slug,
}: {
  workspaceId: string;
  slug: string;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [busy, setBusy] = useState(false);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, query: q }),
    });
    const body = await res.json();
    setHits(body.hits ?? []);
    setBusy(false);
  }

  return (
    <div>
      <form onSubmit={search} className="flex max-w-xl gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar en el workspace"
          className="h-11 flex-1 rounded-md border border-line bg-raised px-3 text-sm"
        />
        <button
          type="submit"
          className="h-11 cursor-pointer rounded-md bg-spark px-4 text-sm font-medium text-ink"
          disabled={busy}
        >
          {busy ? "Buscando…" : "Buscar"}
        </button>
      </form>
      <ul className="mt-10 space-y-6">
        {hits.map((hit) => (
          <li key={hit.id} className="max-w-2xl">
            <Link
              href={
                hit.source_type === "document"
                  ? `/${slug}/documents/${hit.source_id}`
                  : `/${slug}/files`
              }
              className="text-spark hover:underline"
            >
              {String(hit.metadata?.title ?? hit.source_type)}
            </Link>
            <p className="mt-1 text-sm leading-relaxed text-mist">{hit.content}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
