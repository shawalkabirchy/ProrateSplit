export type ErrorCode =
  | "VALIDATION_ERROR"
  | "STORAGE_UNAVAILABLE"
  | "STORAGE_FULL"
  | "STALE_LOCAL_STATE"
  | "IMPORT_INVALID"
  | "FILE_TOO_LARGE";

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function explainError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof DOMException && error.name === "QuotaExceededError") {
    return new AppError(
      "STORAGE_FULL",
      "Browser storage is full. Your pending changes are still here. Download a backup before closing this page.",
    );
  }
  return new AppError(
    "STORAGE_UNAVAILABLE",
    "Browser storage is unavailable. Keep this page open and download a backup of your pending changes. You can also retry or allow site storage in your browser settings.",
  );
}
