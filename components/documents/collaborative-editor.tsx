"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import Placeholder from "@tiptap/extension-placeholder";
import NextLink from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  YSupabaseProvider,
  colorForUser,
} from "@/lib/collab/y-supabase-provider";
import { Button } from "@/components/ui/button";
import { EditorToolbar } from "@/components/documents/editor-toolbar";
import { cn } from "@/lib/utils";
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
  const editorRef = useRef<Editor | null>(null);

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
        StarterKit.configure({
          undoRedo: false,
          link: { openOnClick: false },
        }),
        Placeholder.configure({ placeholder: "La primera línea…" }),
        Collaboration.configure({ document: ydoc }),
        CollaborationCaret.configure({
          provider,
          user: { name: user.name, color: user.color },
        }),
      ],
      editorProps: {
        attributes: {
          class: "tiptap",
        },
      },
    },
    [provider],
  );

  editorRef.current = editor;

  const persistAndIndex = (text: string, title: string) => {
    void provider.persistNow(text, title).then(() => {
      void fetch("/api/index-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, workspaceId }),
      });
    });
  };

  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!editor) return;
    const bump = () => setTick((n) => n + 1);
    editor.on("transaction", bump);
    editor.on("selectionUpdate", bump);
    return () => {
      editor.off("transaction", bump);
      editor.off("selectionUpdate", bump);
    };
  }, [editor]);

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
      persistAndIndex(text, titleRef.current);
      provider.destroy();
    };
  }, [provider, documentId, workspaceId]);

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
      }, 8000);
    };
    editor.on("update", persist);
    return () => {
      editor.off("update", persist);
      if (indexTimer.current) clearTimeout(indexTimer.current);
    };
  }, [editor, provider, documentId, workspaceId]);

  const statusLabel =
    status === "connected" ? "En vivo" : status === "connecting" ? "Conectando…" : "Sin conexión";

  return (
    <div className="flex h-full min-h-0 flex-col bg-ink">
      <header className="shrink-0 border-b border-line">
        <div className="flex items-center gap-2 px-3 py-1.5 sm:gap-3 sm:px-4 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:px-6 lg:py-2">
          <NextLink
            href={`/${slug}/documents`}
            className="inline-flex h-11 min-w-11 items-center gap-1.5 justify-self-start text-sm text-mist hover:text-paper lg:h-auto"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Documentos</span>
          </NextLink>
          <div className="hidden min-w-0 overflow-x-auto lg:block">
            <EditorToolbar editor={editor} />
          </div>
          <div className="ml-auto flex items-center gap-2 justify-self-end sm:gap-3 lg:ml-0">
            <span
              className="inline-flex items-center gap-1.5 text-[11px] text-mist"
              data-revision={tick}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  status === "connected"
                    ? "bg-ok"
                    : status === "connecting"
                      ? "bg-spark"
                      : "bg-danger",
                )}
                aria-hidden
              />
              <span className="hidden sm:inline">{statusLabel}</span>
            </span>
            <div className="hidden -space-x-2 sm:flex">
              {users.map((u, i) => (
                <span
                  key={`${u.name}-${i}`}
                  title={u.name}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-medium text-ink ring-2 ring-ink"
                  style={{ background: u.color }}
                >
                  {u.name.slice(0, 1)}
                </span>
              ))}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => persistAndIndex(editor?.getText() ?? "", title)}
            >
              Guardar
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto border-t border-line px-2 py-1 lg:hidden">
          <EditorToolbar editor={editor} />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-8">
          <article className="doc-page py-8 sm:py-12">
            <label className="sr-only" htmlFor="document-title">
              Título del documento
            </label>
            <input
              id="document-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                provider.schedulePersist(editor?.getText() ?? "", e.target.value);
              }}
              placeholder="Sin título"
              className="doc-title w-full bg-transparent outline-none placeholder:text-[#6f675d] focus-visible:ring-0"
            />
            <EditorContent editor={editor} />
          </article>
        </div>
      </div>
    </div>
  );
}
