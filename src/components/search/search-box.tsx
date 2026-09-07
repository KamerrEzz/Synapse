"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [error, setError] = useState<string | null>(null);

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
    if (!res.ok) {
      setHits([]);
      setError(body.error || "No se pudo buscar");
      setBusy(false);
      return;
    }
    setError(null);
    setHits(body.hits ?? []);
    setBusy(false);
  }

  return (
    <div>
      <form onSubmit={search} className="flex max-w-xl flex-col gap-2 sm:flex-row">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar en el workspace"
          aria-label="Buscar en el workspace"
          className="h-11 min-w-0"
        />
        <Button type="submit" disabled={busy} className="h-11 sm:shrink-0">
          {busy ? "Buscando…" : "Buscar"}
        </Button>
      </form>
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      <ul className="mt-8 divide-y divide-line border-b border-line">
        {hits.map((hit) => (
          <li
            key={hit.id}
            className="-mx-4 px-4 py-5 transition-colors hover:bg-raised/50"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={
                  hit.source_type === "document"
                    ? `/${slug}/documents/${hit.source_id}`
                    : `/${slug}/files`
                }
                className="font-display text-lg font-medium tracking-tight text-paper transition-colors hover:text-spark-hover"
              >
                {String(hit.metadata?.title ?? hit.source_type)}
              </Link>
              <Badge>{hit.source_type === "document" ? "Documento" : "Archivo"}</Badge>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-mist">{hit.content}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
