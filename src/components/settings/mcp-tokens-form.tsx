"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  cursorMcpJson,
  mcpOriginUrl,
  opencodeAddCommand,
  opencodeMcpJson,
  opencodeMcpJsonLegacy,
  prettyJson,
} from "@/mcp/snippets";
import type { McpToken } from "@/types/database";
import { toast } from "sonner";

type ClientId = "opencode" | "cursor";

export function McpTokensForm({ workspaceId }: { workspaceId: string }) {
  const [tokens, setTokens] = useState<McpToken[]>([]);
  const [name, setName] = useState("OpenCode");
  const [scope, setScope] = useState<"workspace" | "all">("workspace");
  const [client, setClient] = useState<ClientId>("opencode");
  const [busy, setBusy] = useState(false);
  const [fresh, setFresh] = useState<{ secret: string; url: string } | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  async function load() {
    const res = await fetch("/api/mcp-tokens");
    const body = (await res.json()) as { tokens?: McpToken[]; error?: string };
    if (!res.ok) {
      toast.error(body.error || "No se pudieron leer los tokens");
      return;
    }
    setTokens(body.tokens ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  const pack = useMemo(() => {
    if (!fresh) return null;
    const url = fresh.url || mcpOriginUrl(origin);
    return {
      command: opencodeAddCommand(url, fresh.secret),
      opencode: prettyJson(opencodeMcpJson(url, fresh.secret)),
      opencodeLegacy: prettyJson(opencodeMcpJsonLegacy(url, fresh.secret)),
      cursor: prettyJson(cursorMcpJson(url, fresh.secret)),
    };
  }, [fresh, origin]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFresh(null);
    try {
      const res = await fetch("/api/mcp-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          workspaceId: scope === "workspace" ? workspaceId : null,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "No se pudo crear");
      setFresh({ secret: body.secret, url: body.url });
      toast.success("Token creado. Cópialo ahora; no se vuelve a mostrar.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/mcp-tokens?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "No se pudo revocar");
      if (fresh) setFresh(null);
      toast.success("Token revocado");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo revocar");
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string, ok: string) {
    await navigator.clipboard.writeText(text);
    toast.success(ok);
  }

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-mist">
        Token personal en la cabecera <span className="text-paper">Authorization</span>. No hay
        OAuth: en OpenCode no uses <span className="text-paper">mcp auth</span>, pon{" "}
        <span className="text-paper">oauth: false</span>. El secreto se muestra una vez. El
        agente usa la clave de IA del workspace (la tuya o la compartida del
        propietario) para buscar y preguntar, y puede crear, editar y
        borrar documentos de la wiki.
      </p>

      <form onSubmit={(e) => void create(e)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="mcp-token-name">Nombre</Label>
            <Input
              id="mcp-token-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mcp-token-scope">Alcance</Label>
            <select
              id="mcp-token-scope"
              className="flex h-10 w-full rounded-lg border border-line bg-raised px-3 text-sm text-paper"
              value={scope}
              onChange={(e) => setScope(e.target.value as "workspace" | "all")}
            >
              <option value="workspace">Solo este workspace</option>
              <option value="all">Todos mis workspaces</option>
            </select>
          </div>
        </div>
        <Button type="submit" disabled={busy}>
          {busy ? "Creando…" : "Crear token"}
        </Button>
      </form>

      {fresh && pack ? (
        <div className="space-y-3 rounded-xl border border-spark/40 bg-spark/10 p-4">
          <p className="text-sm text-paper">
            Guarda este secreto ahora. No lo volveremos a mostrar.
          </p>
          <code className="block break-all rounded-lg bg-ink px-3 py-2 text-xs text-paper">
            {fresh.secret}
          </code>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={client === "opencode" ? "default" : "secondary"}
              onClick={() => setClient("opencode")}
            >
              OpenCode
            </Button>
            <Button
              type="button"
              size="sm"
              variant={client === "cursor" ? "default" : "secondary"}
              onClick={() => setClient("cursor")}
            >
              Cursor
            </Button>
          </div>
          {client === "opencode" ? (
            <div className="space-y-3">
              <p className="text-xs leading-relaxed text-mist">
                Un comando con el Bearer. Después, en el JSON del servidor, deja{" "}
                <span className="text-paper">oauth: false</span>.{" "}
                <span className="text-paper">opencode mcp auth</span> no aplica.
              </p>
              <pre className="overflow-x-auto rounded-lg bg-ink p-3 text-xs text-mist">
                {pack.command}
              </pre>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => void copy(pack.command, "Comando copiado")}
              >
                Copiar comando
              </Button>
              <p className="text-xs text-mist">
                O pega el bloque en{" "}
                <span className="text-paper">~/.config/opencode/opencode.json</span> (OpenCode
                2 usa <span className="text-paper">mcp.servers</span>):
              </p>
              <pre className="overflow-x-auto rounded-lg bg-ink p-3 text-xs text-mist">
                {pack.opencode}
              </pre>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => void copy(pack.opencode, "JSON OpenCode copiado")}
                >
                  Copiar JSON (v2)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => void copy(pack.opencodeLegacy, "JSON legado copiado")}
                >
                  Copiar JSON (add plano)
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <pre className="overflow-x-auto rounded-lg bg-ink p-3 text-xs text-mist">
                {pack.cursor}
              </pre>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => void copy(pack.cursor, "Snippet de Cursor copiado")}
              >
                Copiar config de Cursor
              </Button>
            </div>
          )}
        </div>
      ) : null}

      {tokens.length ? (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
          {tokens.map((token) => (
            <li
              key={token.id}
              className="flex flex-col gap-2 bg-raised/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-paper">
                  {token.name}{" "}
                  <span className="text-mist">···{token.last4}</span>
                </p>
                <p className="text-xs text-mist">
                  {token.workspace_id
                    ? token.workspace_id === workspaceId
                      ? "Este workspace"
                      : "Otro workspace"
                    : "Todos los workspaces"}
                  {token.last_used_at
                    ? ` · último uso ${new Date(token.last_used_at).toLocaleString("es")}`
                    : " · sin usar"}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="danger"
                disabled={busy}
                onClick={() => void revoke(token.id)}
              >
                Revocar
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-line bg-raised px-3 py-2 text-sm text-mist">
          Todavía no hay tokens. Crea uno para conectar un agente.
        </p>
      )}
    </div>
  );
}
