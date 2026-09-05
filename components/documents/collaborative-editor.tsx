"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { createClient } from "@/lib/supabase/client";
import {
  YSupabaseProvider,
  colorForUser,
} from "@/lib/collab/y-supabase-provider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/types/database";

type Props = {
  documentId: string;
  workspaceId: string;
  slug: string;
  initialTitle: string;
  profile: Profile | null;
  userId: string;
};

export function CollaborativeEditor({
  documentId,
  workspaceId,
  slug,
  initialTitle,
  profile,
  userId,
}: Props) {
  const ydoc = useMemo(() => new Y.Doc(), []);
  const [title, setTitle] = useState(initialTitle);
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected">(
    "connecting",
  );
  const [users, setUsers] = useState<{ name: string; color: string }[]>([]);
  const indexTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef(title);
  titleRef.current = title;

  const user = useMemo(
    () => ({
      id: userId,
      name: profile?.full_name || "Alguien",
      color: colorForUser(userId),
    }),
    [profile?.full_name, userId],
  );

  const provider = useMemo(() => {
    const supabase = createClient();
    return new YSupabaseProvider({
      supabase,
      documentId,
      doc: ydoc,
      user,
      onStatus: setStatus,
    });
  }, [documentId, ydoc, user]);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({ undoRedo: false }),
        Placeholder.configure({ placeholder: "Empieza a escribir…" }),
        Link.configure({ openOnClick: false }),
        Collaboration.configure({ document: ydoc }),
        CollaborationCaret.configure({
          provider,
          user: { name: user.name, color: user.color },
        }),
      ],
    },
    [provider],
  );

  const editorRef = useRef<Editor | null>(null);
  editorRef.current = editor;

  useEffect(() => {
    void provider.connect();
    const syncUsers = () => {
      const states: { name: string; color: string }[] = [];
      provider.awareness.getStates().forEach((state) => {
        if (state.user) states.push(state.user as { name: string; color: string });
      });
      setUsers(states);
    };
    provider.awareness.on("update", syncUsers);
    return () => {
      const text = editorRef.current?.getText() ?? "";
      void provider.persistNow(text, titleRef.current);
      provider.destroy();
    };
  }, [provider]);

  useEffect(() => {
    if (!editor) return;
    const persist = () => {
      const text = editor.getText();
      provider.schedulePersist(text, titleRef.current);
      if (indexTimer.current) clearTimeout(indexTimer.current);
      indexTimer.current = setTimeout(() => {
        void fetch("/api/index-document", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId, workspaceId }),
        });
      }, 30000);
    };
    editor.on("update", persist);
    return () => {
      editor.off("update", persist);
      if (indexTimer.current) clearTimeout(indexTimer.current);
    };
  }, [editor, provider, documentId, workspaceId]);

  return (
    <div className="flex min-h-screen flex-col bg-ink">
      <header className="flex items-center gap-4 border-b border-line px-6 py-3">
        <a href={`/${slug}/documents`} className="text-sm text-mist hover:text-paper">
          Documentos
        </a>
        <Input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            provider.schedulePersist(editor?.getText() ?? "", e.target.value);
          }}
          className="max-w-md border-transparent bg-transparent text-lg font-medium"
        />
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-mist">
            {status === "connected"
              ? "En vivo"
              : status === "connecting"
                ? "Conectando…"
                : "Sin conexión"}
          </span>
          <div className="flex -space-x-2">
            {users.map((u, i) => (
              <span
                key={`${u.name}-${i}`}
                title={u.name}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-medium text-ink"
                style={{ background: u.color }}
              >
                {u.name.slice(0, 1)}
              </span>
            ))}
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => provider.persistNow(editor?.getText() ?? "", title)}
          >
            Guardar
          </Button>
        </div>
      </header>
      <div className="flex-1 overflow-auto bg-ink px-4 py-8">
        <div className="mx-auto min-h-[70vh] max-w-3xl rounded-sm bg-paper px-12 py-14 text-ink-text shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
