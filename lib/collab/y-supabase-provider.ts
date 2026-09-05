import * as Y from "yjs";
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from "y-protocols/awareness";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

function toBase64(bytes: Uint8Array) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function fromBase64(b64: string) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

type ProviderUser = {
  id: string;
  name: string;
  color: string;
};

type Options = {
  supabase: SupabaseClient;
  documentId: string;
  doc: Y.Doc;
  user: ProviderUser;
  onStatus?: (status: "connecting" | "connected" | "disconnected") => void;
};

export class YSupabaseProvider {
  awareness: Awareness;
  private channel: RealtimeChannel | null = null;
  private destroyed = false;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly supabase: SupabaseClient;
  private readonly documentId: string;
  private readonly doc: Y.Doc;
  private readonly user: ProviderUser;
  private readonly onStatus?: Options["onStatus"];

  constructor(options: Options) {
    this.supabase = options.supabase;
    this.documentId = options.documentId;
    this.doc = options.doc;
    this.user = options.user;
    this.onStatus = options.onStatus;
    this.awareness = new Awareness(this.doc);
    this.awareness.setLocalStateField("user", {
      name: this.user.name,
      color: this.user.color,
      id: this.user.id,
    });
    this.doc.on("update", this.handleDocUpdate);
    this.awareness.on("update", this.handleAwarenessUpdate);
  }

  async connect() {
    this.destroyed = false;
    this.onStatus?.("connecting");
    const { data, error } = await this.supabase.rpc("get_document_state", {
      p_id: this.documentId,
    });
    if (error) {
      console.error(error);
    } else if (typeof data === "string" && data.length > 0) {
      Y.applyUpdate(this.doc, fromBase64(data), "remote");
    }

    this.channel = this.supabase.channel(`doc:${this.documentId}`, {
      config: { private: true, broadcast: { ack: false } },
    });

    this.channel.on("broadcast", { event: "yjs-update" }, ({ payload }) => {
      if (payload?.sender === this.user.id) return;
      if (typeof payload?.update !== "string") return;
      Y.applyUpdate(this.doc, fromBase64(payload.update), "remote");
    });

    this.channel.on("broadcast", { event: "awareness" }, ({ payload }) => {
      if (payload?.sender === this.user.id) return;
      if (typeof payload?.update !== "string") return;
      applyAwarenessUpdate(this.awareness, fromBase64(payload.update), "remote");
    });

    this.channel.on("broadcast", { event: "sync-request" }, ({ payload }) => {
      if (payload?.sender === this.user.id) return;
      if (typeof payload?.stateVector !== "string") return;
      const diff = Y.encodeStateAsUpdate(this.doc, fromBase64(payload.stateVector));
      void this.channel?.send({
        type: "broadcast",
        event: "yjs-update",
        payload: { sender: this.user.id, update: toBase64(diff) },
      });
    });

    await new Promise<void>((resolve) => {
      this.channel!.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          this.onStatus?.("connected");
          const sv = Y.encodeStateVector(this.doc);
          void this.channel?.send({
            type: "broadcast",
            event: "sync-request",
            payload: { sender: this.user.id, stateVector: toBase64(sv) },
          });
          resolve();
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          this.onStatus?.("disconnected");
        }
      });
    });
  }

  async persistNow(plainText: string, title: string) {
    const update = Y.encodeStateAsUpdate(this.doc);
    const { error } = await this.supabase.rpc("persist_document_state", {
      p_id: this.documentId,
      p_state: toBase64(update),
      p_plain_text: plainText,
      p_title: title,
    });
    if (error) console.error(error);
  }

  schedulePersist(plainText: string, title: string) {
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => {
      void this.persistNow(plainText, title);
    }, 1800);
  }

  destroy() {
    this.destroyed = true;
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = null;
    if (this.channel) {
      void this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.onStatus?.("disconnected");
  }

  private handleDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (this.destroyed || origin === "remote") return;
    void this.channel?.send({
      type: "broadcast",
      event: "yjs-update",
      payload: { sender: this.user.id, update: toBase64(update) },
    });
  };

  private handleAwarenessUpdate = (
    { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown,
  ) => {
    if (this.destroyed || origin === "remote") return;
    const changed = [...added, ...updated, ...removed];
    if (changed.length === 0) return;
    const encoded = encodeAwarenessUpdate(this.awareness, changed);
    void this.channel?.send({
      type: "broadcast",
      event: "awareness",
      payload: { sender: this.user.id, update: toBase64(encoded) },
    });
  };
}

export const CURSOR_COLORS = [
  "#D4A054",
  "#6B9E8A",
  "#C45C4A",
  "#7A8FCF",
  "#C47A9A",
  "#8A6B4A",
];

export function colorForUser(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return CURSOR_COLORS[hash % CURSOR_COLORS.length];
}
