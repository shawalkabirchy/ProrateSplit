"use client";

import { useEffect, useState } from "react";
import { AppError, explainError } from "@/lib/errors";
import {
  emptyWorkspace,
  type StoredWorkspace,
  type WorkspaceData,
} from "@/lib/models";
import { appendSample } from "@/lib/operations";
import { loadWorkspace, saveWorkspace } from "@/lib/storage";

export function useWorkspace() {
  const [workspace, setWorkspace] = useState<StoredWorkspace>({
    revision: 0,
    data: emptyWorkspace(),
  });
  const [phase, setPhase] = useState<
    "loading" | "ready" | "saving" | "saved" | "unsaved" | "conflict"
  >("loading");
  const [error, setError] = useState<AppError | null>(null);
  const [initialHouseholdId, setInitialHouseholdId] = useState("");

  useEffect(() => {
    let cancelled = false;
    loadWorkspace()
      .then(async (stored) => {
        if (cancelled) return;
        setWorkspace(stored);
        if (window.location.hash === "#sample") {
          window.history.replaceState(null, "", window.location.pathname);
          let data: WorkspaceData;
          try {
            data = appendSample(stored.data);
          } catch (failure) {
            setError(explainError(failure));
            setPhase(stored.revision ? "saved" : "ready");
            return;
          }
          setInitialHouseholdId(data.households[data.households.length - 1].id);
          try {
            const saved = await saveWorkspace(stored.revision, data);
            if (!cancelled) {
              setWorkspace(saved);
              setPhase("saved");
            }
          } catch (failure) {
            if (!cancelled) {
              const problem = explainError(failure);
              setWorkspace({ revision: stored.revision, data });
              setError(problem);
              setPhase(
                problem.code === "STALE_LOCAL_STATE" ? "conflict" : "unsaved",
              );
            }
          }
        } else {
          setWorkspace(stored);
          setPhase(stored.revision ? "saved" : "ready");
        }
      })
      .catch((failure) => {
        if (!cancelled) {
          setError(explainError(failure));
          setPhase("unsaved");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function commit(data: WorkspaceData) {
    setPhase("saving");
    try {
      const saved = await saveWorkspace(workspace.revision, data);
      setWorkspace(saved);
      setError(null);
      setPhase("saved");
    } catch (failure) {
      const problem = explainError(failure);
      setWorkspace({ revision: workspace.revision, data });
      setError(problem);
      setPhase(problem.code === "STALE_LOCAL_STATE" ? "conflict" : "unsaved");
    }
  }

  async function reload() {
    setPhase("loading");
    try {
      const stored = await loadWorkspace();
      setWorkspace(stored);
      setError(null);
      setPhase(stored.revision ? "saved" : "ready");
    } catch (failure) {
      setError(explainError(failure));
      setPhase("unsaved");
    }
  }

  return {
    ...workspace,
    phase,
    error,
    initialHouseholdId,
    commit,
    reload,
    busy: phase === "loading" || phase === "saving",
  };
}
