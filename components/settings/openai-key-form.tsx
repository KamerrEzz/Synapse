"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AI_PRESETS, type AiProviderId } from "@/lib/ai/catalog";
import { toast } from "sonner";

type Meta = {
  configured: boolean;
  last4: string | null;
  provider?: AiProviderId;
  baseUrl?: string;
  chatModel?: string;
  embeddingModel?: string;
  embeddingDim?: number;
};

export function OpenAIKeyForm() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [provider, setProvider] = useState<AiProviderId>("openai");
  const [baseUrl, setBaseUrl] = useState(AI_PRESETS.openai.baseUrl);
  const [chatModel, setChatModel] = useState(AI_PRESETS.openai.chatModel);
  const [embeddingModel, setEmbeddingModel] = useState(AI_PRESETS.openai.embeddingModel);
  const [embeddingDim, setEmbeddingDim] = useState(AI_PRESETS.openai.embeddingDim);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const locked = provider !== "compatible";

  function applyPreset(id: AiProviderId, overlay?: Partial<Meta>) {
    const preset = AI_PRESETS[id];
    setProvider(id);
    setBaseUrl(overlay?.baseUrl || preset.baseUrl);
    setChatModel(overlay?.chatModel || preset.chatModel);
    setEmbeddingModel(overlay?.embeddingModel || preset.embeddingModel);
    setEmbeddingDim(overlay?.embeddingDim || preset.embeddingDim);
  }

  async function load() {
    const res = await fetch("/api/openai-key");
    const body = (await res.json()) as Meta & { error?: string };
    if (!res.ok) {
      toast.error(body.error || "No se pudo leer el estado de la clave");
      return;
    }
    setMeta({ configured: body.configured, last4: body.last4 ?? null });
    if (body.provider) applyPreset(body.provider, body);
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!meta?.configured && !key.trim()) {
      toast.error("Pega una clave");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/openai-key", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: key.trim() || undefined,
          provider,
          baseUrl,
          chatModel,
          embeddingModel,
          embeddingDim,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "No se pudo guardar");
      setKey("");
      setMeta({ configured: true, last4: body.last4 });
      toast.success("Guardado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const res = await fetch("/api/openai-key", { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "No se pudo quitar");
      }
      setMeta({ configured: false, last4: null });
      toast.success("Clave eliminada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo quitar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <p className="text-sm leading-relaxed text-mist">
        Cada persona trae su propia clave. Se cifra en el servidor y no vuelve a mostrarse.
        Vale cualquier API con el contrato de OpenAI: OpenAI, NaN, Helmcode, un servidor propio…
      </p>
      {meta?.configured ? (
        <p className="rounded-lg border border-ok/40 bg-ok/10 px-3 py-2 text-sm text-paper">
          Clave activa terminada en <span className="font-medium">{meta.last4}</span>
        </p>
      ) : (
        <p className="rounded-lg border border-line bg-raised px-3 py-2 text-sm text-mist">
          Todavía no hay clave. Sin ella no funcionan IA, búsqueda semántica ni el indexado.
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="ai-provider">Proveedor</Label>
        <select
          id="ai-provider"
          className="flex h-10 w-full rounded-lg border border-line bg-raised px-3 text-sm text-paper"
          value={provider}
          onChange={(e) => applyPreset(e.target.value as AiProviderId)}
        >
          {Object.values(AI_PRESETS).map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <p className="text-xs leading-relaxed text-mist">{AI_PRESETS[provider].hint}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="ai-base-url">URL base</Label>
        <Input
          id="ai-base-url"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          readOnly={locked}
          required
          spellCheck={false}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ai-chat-model">Modelo de chat</Label>
          <Input
            id="ai-chat-model"
            value={chatModel}
            onChange={(e) => setChatModel(e.target.value)}
            readOnly={locked}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ai-embed-model">Modelo de embeddings</Label>
          <Input
            id="ai-embed-model"
            value={embeddingModel}
            onChange={(e) => setEmbeddingModel(e.target.value)}
            readOnly={locked}
            required
          />
        </div>
      </div>
      <p className="text-xs text-mist">
        La dimensión la decide el modelo al indexar (NaN suele devolver 1024, OpenAI 1536). Solo
        choca si el workspace ya tiene vectores de otro tamaño.
      </p>
      {provider === "compatible" ? (
        <div className="space-y-2">
          <Label htmlFor="ai-embed-dim">Dimensiones (opcional, se ignora si el modelo dice otra cosa)</Label>
          <Input
            id="ai-embed-dim"
            type="number"
            min={8}
            max={16000}
            value={embeddingDim}
            onChange={(e) => setEmbeddingDim(Number(e.target.value))}
          />
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="ai-key">{meta?.configured ? "Nueva clave (opcional)" : "Clave"}</Label>
        <Input
          id="ai-key"
          type="password"
          name="ai-key"
          autoComplete="new-password"
          spellCheck={false}
          placeholder="sk-…"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          required={!meta?.configured}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Guardando…" : "Guardar"}
        </Button>
        {meta?.configured ? (
          <Button type="button" variant="danger" disabled={busy} onClick={() => void remove()}>
            Quitar clave
          </Button>
        ) : null}
      </div>
    </form>
  );
}
