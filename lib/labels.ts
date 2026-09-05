import type { FileStatus, WorkspaceRole } from "@/types/database";

export const ROLE_LABEL: Record<WorkspaceRole, string> = {
  owner: "Propietario",
  admin: "Admin",
  member: "Miembro",
};

export const FILE_STATUS_LABEL: Record<FileStatus, string> = {
  ready: "Listo",
  error: "Error",
  processing: "Procesando",
};
