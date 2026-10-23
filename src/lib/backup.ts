import { BackupSchema, LIMITS, type WorkspaceData } from "./models";
import { AppError } from "./errors";
import { parseSchema, validateWorkspace } from "./validation";

export function exportBackup(data: WorkspaceData): string {
  const json = JSON.stringify(
    {
      appId: "P01",
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      payload: validateWorkspace(data),
    },
    null,
    2,
  );
  if (new TextEncoder().encode(json).byteLength > LIMITS.backupBytes)
    throw new AppError(
      "FILE_TOO_LARGE",
      "This backup exceeds the 10 MiB limit.",
    );
  return json;
}

export function parseBackup(text: string): WorkspaceData {
  if (new TextEncoder().encode(text).byteLength > LIMITS.backupBytes)
    throw new AppError(
      "FILE_TOO_LARGE",
      "Choose a JSON backup no larger than 10 MiB.",
    );
  try {
    const envelope = parseSchema(BackupSchema, JSON.parse(text.trim()));
    return validateWorkspace(envelope.payload);
  } catch (error) {
    throw new AppError(
      "IMPORT_INVALID",
      `This backup was not imported. ${error instanceof Error ? error.message : "Choose a valid ProrateSplit v1 JSON backup."}`,
    );
  }
}

export function downloadBackup(data: WorkspaceData) {
  const blob = new Blob([exportBackup(data)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `proratesplit-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
