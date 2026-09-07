"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AiMessage, AiSource } from "@/types/database";
import Link from "next/link";

export function AiChat({
  workspaceId,
  slug,
  conversationId,
  initialMessages,
}: {
  workspaceId: string;
  slug: string;
  conversationId: string | null;
  initialMessages: AiMessage[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeId, setActiveId] = useState(conversationId);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || busy) return;
    setInput("");
    setBusy(true);
    const userMsg: AiMessage = {
      id: crypto.randomUUID(),
      conversation_id: activeId ?? "temp",
      role: "user",
      content: question,
      sources: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const res = await fetch("/api/rag-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        conversationId: activeId,
        question,
      }),
    });

    if (!res.ok || !res.body) {
      const body = await res.json().catch(() => ({}));
      const fallback =
        body.code === "missing_openai_key"
          ? body.error
          : body.error || "No se pudo responder. Revisa tu clave de IA y los archivos indexados.";
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          conversation_id: activeId ?? "temp",
          role: "assistant",
          content: fallback,
          sources: null,
          created_at: new Date().toISOString(),
        },
      ]);
      setBusy(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let assistant = "";
    let sources: AiSource[] = [];
    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        conversation_id: activeId ?? "temp",
        role: "assistant",
        content: "",
        sources: null,
        created_at: new Date().toISOString(),
      },
    ]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        const line = part.replace(/^data: /, "").trim();
        if (!line) continue;
        try {
          const json = JSON.parse(line) as {
            token?: string;
            sources?: AiSource[];
            conversationId?: string;
            done?: boolean;
          };
          if (json.conversationId && json.conversationId !== activeId) {
            setActiveId(json.conversationId);
            window.history.replaceState(null, "", `/${slug}/ai/${json.conversationId}`);
          }
          if (json.sources) sources = json.sources;
          if (json.token) {
            assistant += json.token;
            const snapshot = assistant;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: snapshot, sources } : m,
              ),
            );
          }
        } catch {
          // ignore malformed chunks
        }
      }
    }
    setBusy(false);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6 sm:py-8">
        {messages.length === 0 ? (
          <div className="mx-auto max-w-lg rounded-2xl border border-line bg-shell px-4 py-6 sm:px-6 sm:py-8">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-spark" aria-hidden />
              <p className="font-display text-xl">Pregunta al workspace</p>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-mist">
              Responde con documentos y archivos indexados. Si no está en vuestra base, lo dirá.
            </p>
          </div>
        ) : null}
        {messages.map((m) => (
          <article
            key={m.id}
            className={`max-w-2xl rounded-2xl px-4 py-3 ${
              m.role === "user"
                ? "ml-auto bg-raised text-paper"
                : "border border-line bg-shell"
            }`}
          >
            <p className="text-[11px] text-mist">{m.role === "user" ? "Tú" : "Synapse"}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
            {m.role === "assistant" && m.sources && m.sources.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {m.sources.map((s, i) => (
                  <li key={`${s.source_id}-${i}`}>
                    <Link
                      href={
                        s.source_type === "document"
                          ? `/${slug}/documents/${s.source_id}`
                          : `/${slug}/files`
                      }
                      className="rounded-full border border-line px-2 py-0.5 text-xs text-spark hover:border-spark"
                    >
                      {s.title || s.source_type}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
        <div ref={bottom} />
      </div>
      <form onSubmit={send} className="border-t border-line bg-shell p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
        <div className="rounded-xl border border-line bg-raised p-2 transition-colors focus-within:border-spark/60">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pregunta sobre el conocimiento del equipo"
            rows={3}
            className="min-h-20 border-0 bg-transparent focus-visible:ring-0"
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={busy}>
              {busy ? "Pensando…" : "Preguntar"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
