export type WorkspaceRole = "owner" | "admin" | "member";
export type WorkspacePlan = "free" | "pro" | "team";
export type FileStatus = "processing" | "ready" | "error";
export type SourceType = "file" | "document";

export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  plan: WorkspacePlan;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  embedding_dim?: number | null;
};

export type WorkspaceMember = {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  joined_at: string;
  profiles?: Profile | null;
};

export type WorkspaceInvitation = {
  id: string;
  workspace_id: string;
  email: string;
  role: Exclude<WorkspaceRole, "owner">;
  invited_by: string | null;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};

export type DocumentRow = {
  id: string;
  workspace_id: string;
  title: string;
  plain_text: string;
  created_by: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export type FileRow = {
  id: string;
  workspace_id: string;
  name: string;
  path: string;
  mime_type: string | null;
  size: number | null;
  status: FileStatus;
  error_message: string | null;
  uploaded_by: string | null;
  created_at: string;
};

export type Channel = {
  id: string;
  workspace_id: string;
  name: string;
  is_private: boolean;
  created_by: string | null;
  created_at: string;
};

export type Message = {
  id: string;
  channel_id: string;
  workspace_id: string;
  user_id: string | null;
  content: string;
  created_at: string;
  profiles?: Profile | null;
};

export type AiConversation = {
  id: string;
  workspace_id: string;
  user_id: string;
  title: string | null;
  created_at: string;
};

export type AiSource = {
  source_type: SourceType;
  source_id: string;
  title?: string;
  chunk_index?: number;
};

export type AiMessage = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  sources: AiSource[] | null;
  created_at: string;
};

export type McpToken = {
  id: string;
  name: string;
  last4: string;
  workspace_id: string | null;
  last_used_at: string | null;
  created_at: string;
};

export type SearchHit = {
  id: string;
  content: string;
  source_type: SourceType;
  source_id: string;
  chunk_index: number;
  metadata: Record<string, unknown>;
  score: number;
};
