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
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
        {messages.length === 0 ? (
          <p className="text-sm text-mist">Sé la primera persona en escribir aquí.</p>
        ) : null}
        {messages.map((m) => {
          const name = m.profiles?.full_name || "Miembro";
          return (
            <div key={m.id} className="flex gap-3">
              <Avatar src={m.profiles?.avatar_url} fallback={name} />
              <div>
                <p className="text-sm">
                  <span className="font-medium">{name}</span>{" "}
                  <span className="text-xs text-mist">
                    {format(new Date(m.created_at), "HH:mm", { locale: es })}
                  </span>
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-paper/90">
                  {m.content}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-line p-4">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe un mensaje"
          aria-label="Mensaje"
        />
        <Button type="submit">Enviar</Button>
      </form>
      <span className="sr-only">{profile?.full_name}</span>
    </div>
  );
}
