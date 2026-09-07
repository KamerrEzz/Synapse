"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Message, Profile } from "@/types/database";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function ChatRoom({
  channelId,
  workspaceId,
  userId,
  profile,
  initialMessages,
}: {
  channelId: string;
  workspaceId: string;
  userId: string;
  profile: Profile | null;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`chat:${channelId}`, { config: { private: true } })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          const row = payload.new as Message;
          const { data: prof } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", row.user_id)
            .maybeSingle();
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, { ...row, profiles: prof }];
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [channelId]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setText("");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("messages")
      .insert({
        channel_id: channelId,
        workspace_id: workspaceId,
        user_id: userId,
        content,
      })
      .select("*, profiles(*)")
      .single();
    if (error || !data) {
      setText(content);
      return;
    }
    setMessages((prev) => {
      if (prev.some((m) => m.id === data.id)) return prev;
      return [...prev, data as Message];
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
        {messages.length === 0 ? (
          <div className="flex h-full min-h-64 items-center justify-center">
            <p className="max-w-sm text-center text-sm leading-relaxed text-mist">
              Este canal está en silencio. Escribe el primer mensaje para el equipo.
            </p>
          </div>
        ) : null}
        {messages.map((m) => {
          const name = m.profiles?.full_name || "Miembro";
          const mine = m.user_id === userId;
          return (
            <div key={m.id} className="flex gap-3">
              <Avatar src={m.profiles?.avatar_url} fallback={name} />
              <div className="min-w-0">
                <p className="text-sm">
                  <span className={mine ? "font-medium text-spark" : "font-medium"}>{name}</span>{" "}
                  <span className="text-xs text-mist">
                    {format(new Date(m.created_at), "HH:mm", { locale: es })}
                  </span>
                </p>
                <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-paper/90">
                  {m.content}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      <form onSubmit={send} className="border-t border-line bg-shell p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
        <div className="flex gap-2 rounded-xl border border-line bg-raised p-1.5 transition-colors focus-within:border-spark/60">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escribe un mensaje"
            aria-label="Mensaje"
            className="min-w-0 border-0 bg-transparent focus-visible:ring-0"
          />
          <Button type="submit" className="shrink-0">
            Enviar
          </Button>
        </div>
      </form>
      <span className="sr-only">{profile?.full_name}</span>
    </div>
  );
}
