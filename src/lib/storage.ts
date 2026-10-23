import { AppError, explainError } from "./errors";
import {
  emptyWorkspace,
  type StoredWorkspace,
  type WorkspaceData,
} from "./models";
import { validateWorkspace } from "./validation";

const DB_NAME = "proratesplit";
const STORE = "workspace";
const KEY = "current";
let connection: Promise<IDBDatabase> | undefined;

function database(): Promise<IDBDatabase> {
  if (connection) return connection;
  connection = new Promise<IDBDatabase>((resolve, reject) => {
    let settled = false;
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE))
        request.result.createObjectStore(STORE);
    };
    request.onblocked = () => {
      settled = true;
      reject(
        new AppError(
          "STORAGE_UNAVAILABLE",
          "Close other ProrateSplit tabs, then reload. Existing data has been preserved.",
        ),
      );
    };
    request.onerror = () => reject(explainError(request.error));
    request.onsuccess = () => {
      if (settled) {
        request.result.close();
        return;
      }
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        connection = undefined;
      };
      resolve(db);
    };
  }).catch((error) => {
    connection = undefined;
    throw explainError(error);
  });
  return connection;
}

function validateStored(value: unknown): StoredWorkspace {
  if (value === undefined) return { revision: 0, data: emptyWorkspace() };
  const record = value as Partial<StoredWorkspace>;
  if (
    !record ||
    !Number.isSafeInteger(record.revision) ||
    record.revision! < 0 ||
    !record.data
  )
    throw new AppError(
      "STORAGE_UNAVAILABLE",
      "Stored data could not be read. It has been preserved; do not clear site storage. Restore a known-good backup when ready.",
    );
  return { revision: record.revision!, data: validateWorkspace(record.data) };
}

export async function loadWorkspace(): Promise<StoredWorkspace> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(KEY);
    tx.oncomplete = () => {
      try {
        resolve(validateStored(request.result));
      } catch (error) {
        reject(error);
      }
    };
    tx.onerror = () => reject(explainError(tx.error));
    tx.onabort = () => reject(explainError(tx.error));
  });
}

export async function saveWorkspace(
  expectedRevision: number,
  nextData: WorkspaceData,
): Promise<StoredWorkspace> {
  const data = validateWorkspace(nextData);
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    let failure: unknown;
    let result: StoredWorkspace;
    const request = tx.objectStore(STORE).get(KEY);
    request.onsuccess = () => {
      try {
        const current = validateStored(request.result);
        if (current.revision !== expectedRevision)
          throw new AppError(
            "STALE_LOCAL_STATE",
            "Another tab saved a newer workspace. Download or copy your unsaved changes, then reload before editing again.",
          );
        if (current.revision >= Number.MAX_SAFE_INTEGER)
          throw new AppError(
            "STORAGE_UNAVAILABLE",
            "The workspace revision limit was reached. Export a backup before continuing.",
          );
        result = { revision: current.revision + 1, data };
        tx.objectStore(STORE).put(result, KEY);
      } catch (error) {
        failure = error;
        tx.abort();
      }
    };
    tx.oncomplete = () => resolve(result);
    tx.onabort = () => reject(failure ?? explainError(tx.error));
    tx.onerror = () => {
      failure ??= explainError(tx.error);
    };
  });
}
