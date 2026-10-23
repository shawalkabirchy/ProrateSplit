"use client";

import {
  OverviewSection,
  PeopleSection,
  BillsSection,
} from "./household-views";

import Link from "next/link";
import { useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  FileText,
  House,
  Plus,
  ReceiptText,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Brand } from "./brand";
import { BillForm, HouseholdForm, PersonForm } from "./forms";
import { Report } from "./report";
import { useWorkspace } from "./use-workspace";
import { calculateSettlement } from "@/lib/calculations";
import { downloadBackup, exportBackup, parseBackup } from "@/lib/backup";
import { periodLabel } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import {
  LIMITS,
  type Bill,
  type Household,
  type Person,
  type WorkspaceData,
} from "@/lib/models";
import {
  appendSample,
  duplicateHousehold,
  removeBill,
  removeHousehold,
  removePerson,
} from "@/lib/operations";

export type Modal =
  | { type: "household"; record?: Household }
  | { type: "person"; record?: Person }
  | { type: "bill"; record?: Bill }
  | { type: "delete-household" | "duplicate" | "reload" | "restore" | "copy" }
  | { type: "delete-person"; record: Person }
  | { type: "delete-bill"; record: Bill };

export function Workspace() {
  const store = useWorkspace();
  const { data, busy, phase } = store;
  const [activeId, setActiveId] = useState("");
  const [view, setView] = useState("overview");
  const [modal, setModal] = useState<Modal | null>(null);
  const [modalError, setModalError] = useState("");
  const [notice, setNotice] = useState<{
    error: boolean;
    message: string;
  } | null>(null);
  const [copyName, setCopyName] = useState("");
  const [restoreData, setRestoreData] = useState<WorkspaceData | null>(null);
  const [readingFile, setReadingFile] = useState(false);
  const [copied, setCopied] = useState(false);
  const restoreInput = useRef<HTMLInputElement>(null);
  const restoreButton = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const fallbackFocus = useRef<HTMLButtonElement>(null);
  const household =
    data.households.find(
      (h) => h.id === (activeId || store.initialHouseholdId),
    ) ?? data.households[0];
  const settlement = useMemo(
    () => (household ? calculateSettlement(household.id, data) : null),
    [household, data],
  );
  const unsaved = phase === "unsaved" || phase === "conflict";

  function openModal(next: Modal, trigger?: HTMLElement) {
    previousFocus.current = trigger ?? (document.activeElement as HTMLElement);
    setModalError("");
    setCopied(false);
    if (next.type === "duplicate")
      setCopyName(`${household?.name.slice(0, 65)} (what-if)`);
    setModal(next);
  }
  function reportError(error: unknown) {
    setNotice({
      error: true,
      message:
        error instanceof Error
          ? error.message
          : "That action could not be completed. Your existing data is unchanged.",
    });
  }
  function backup() {
    try {
      downloadBackup(data);
    } catch (error) {
      reportError(error);
    }
  }
  async function save(next: WorkspaceData) {
    const added = next.households.find(
      (h) => !data.households.some((old) => old.id === h.id),
    );
    await store.commit(next);
    setNotice(null);
    if (added) {
      setActiveId(added.id);
      setView("overview");
    }
  }
  async function loadSample() {
    try {
      await save(appendSample(data));
    } catch (error) {
      reportError(error);
    }
  }
  async function readBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setReadingFile(true);
    try {
      if (file.size > LIMITS.backupBytes)
        throw new AppError(
          "FILE_TOO_LARGE",
          "Choose a JSON backup no larger than 10 MiB.",
        );
      const parsed = parseBackup(await file.text());
      setRestoreData(parsed);
      openModal({ type: "restore" }, restoreButton.current ?? undefined);
      setNotice(null);
    } catch (error) {
      reportError(error);
    } finally {
      setReadingFile(false);
    }
  }
  async function confirmAction() {
    setModalError("");
    try {
      if (modal?.type === "delete-household" && household) {
        await save(removeHousehold(data, household.id));
        setActiveId("");
        setView("overview");
      }
      if (modal?.type === "delete-person")
        await save(removePerson(data, modal.record.id));
      if (modal?.type === "delete-bill")
        await save(removeBill(data, modal.record.id));
      if (modal?.type === "duplicate" && household)
        await save(duplicateHousehold(data, household.id, copyName));
      if (modal?.type === "restore" && restoreData) {
        await save(restoreData);
        setActiveId(restoreData.households[0]?.id ?? "");
        setView("overview");
        setRestoreData(null);
      }
      if (modal?.type === "reload") await store.reload();
      setModal(null);
    } catch (error) {
      setModalError(
        error instanceof Error
          ? error.message
          : "Please check this action and try again.",
      );
    }
  }
  const modalTitle =
    modal?.type === "household"
      ? modal.record
        ? "Edit household"
        : "Create a household"
      : modal?.type === "person"
        ? modal.record
          ? "Edit person"
          : "Add a person"
        : modal?.type === "bill"
          ? modal.record
            ? "Edit bill"
            : "Add a bill"
          : modal?.type === "duplicate"
            ? "Save a what-if copy"
            : modal?.type === "restore"
              ? "Replace workspace from backup?"
              : modal?.type === "reload"
                ? "Reload the saved workspace?"
                : modal?.type === "copy"
                  ? "Copy unsaved workspace"
                  : modal?.type === "delete-household"
                    ? "Delete this household?"
                    : modal?.type === "delete-person"
                      ? "Delete this person?"
                      : "Delete this bill?";
  const modalDescription =
    modal?.type === "bill"
      ? "Review everyone’s share before saving. Amounts stay in this household’s currency."
      : modal?.type === "person"
        ? "Arrival is included; departure is excluded. Leave departure empty for an ongoing stay."
        : modal?.type === "household"
          ? "A household keeps its people, bills, and calculations together on this device."
          : modal?.type === "duplicate"
            ? "Create an independent scenario. Your original household stays intact."
            : modal?.type === "restore"
              ? "This replaces all households, people, and bills in this browser workspace. It does not merge them."
              : modal?.type === "reload"
                ? "Pending changes in this tab will be discarded. Export or copy them first if you need to keep them."
                : modal?.type === "copy"
                  ? "Select and copy this JSON, or download a backup. Keep it before reloading or closing this tab."
                  : modal?.type === "delete-household"
                    ? `“${household?.name}” and all of its people and bills will be removed together. This cannot be undone.`
                    : modal?.type === "delete-person"
                      ? `“${modal.record.displayName}” can only be removed after all bill references are reassigned.`
                      : modal?.type === "delete-bill"
                        ? `“${modal.record.title}” will be removed and balances will recalculate. This cannot be undone.`
                        : "";
  const period = settlement?.bills.length
    ? periodLabel(
        settlement.bills.map((b) => b.bill.startOn).sort()[0],
        settlement.bills
          .map((b) => b.bill.endOn)
          .sort()
          .at(-1)!,
      )
    : "Add people and bills to get started";
  const formProps = { data, busy, onSave: save, onClose: () => setModal(null) };

  return (
    <div className="workspace-root">
      <a className="skip-link" href="#workspace-main">
        Skip to workspace
      </a>
      <header className="app-header no-print">
        <Brand />
        <nav aria-label="Workspace utilities">
          <Link href="/" className="back-link" aria-label="Back to website">
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Back to website</span>
          </Link>
          <Button
            variant="ghost"
            aria-label="Backup"
            onClick={backup}
            disabled={busy || !data.households.length}
          >
            <Download data-icon="inline-start" />
            <span>Backup</span>
          </Button>
          <Button
            variant="ghost"
            aria-label="Restore"
            ref={restoreButton}
            onClick={() => restoreInput.current?.click()}
            disabled={busy || readingFile}
          >
            <Upload data-icon="inline-start" />
            <span>{readingFile ? "Reading…" : "Restore"}</span>
          </Button>
          <input
            ref={restoreInput}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            aria-label="Restore JSON backup"
            onChange={readBackup}
            tabIndex={-1}
          />
        </nav>
      </header>
      <div className="workspace-layout">
        <aside
          className="household-rail no-print"
          aria-label="Household navigation"
        >
          <div className="rail-heading">
            <h2>Households</h2>
            <span>
              {data.households.length}/{LIMITS.households}
            </span>
          </div>
          <Button
            className="new-household"
            ref={fallbackFocus}
            onClick={(event) =>
              openModal({ type: "household" }, event.currentTarget)
            }
            disabled={busy || data.households.length >= LIMITS.households}
          >
            <Plus data-icon="inline-start" />
            New household
          </Button>
          <div className="household-links">
            {data.households.map((h) => (
              <button
                type="button"
                className={`household-link ${household?.id === h.id ? "is-selected" : ""}`}
                key={h.id}
                aria-current={household?.id === h.id ? "true" : undefined}
                onClick={() => {
                  setActiveId(h.id);
                  setView("overview");
                }}
                disabled={busy}
              >
                <House size={20} aria-hidden="true" />
                <span>
                  <strong>{h.name}</strong>
                  <small>
                    {data.people.filter((p) => p.householdId === h.id).length}{" "}
                    people <span aria-hidden="true">·</span> {h.currency}
                  </small>
                </span>
              </button>
            ))}
          </div>
          <div className="rail-bottom">
            <Button
              variant="ghost"
              onClick={loadSample}
              disabled={busy || data.households.length >= LIMITS.households}
            >
              <Plus data-icon="inline-start" />
              Load sample household
            </Button>
            <p>Synthetic data. Your existing households stay intact.</p>
          </div>
          <div className="rail-privacy">
            <ShieldCheck size={16} aria-hidden="true" />
            <span>
              Private by design.
              <br />
              Saved in this browser.
            </span>
          </div>
        </aside>
        <main className="workspace-main" id="workspace-main">
          <div className="save-status no-print" role="status">
            {phase === "loading" ? (
              "Opening local workspace…"
            ) : phase === "saving" ? (
              "Saving…"
            ) : phase === "saved" ? (
              <>
                <Check size={13} aria-hidden="true" />
                Saved on this device
              </>
            ) : unsaved ? (
              "Not saved — changes are in this tab"
            ) : (
              "Local workspace"
            )}
          </div>
          {store.error && (
            <Alert
              className="storage-alert no-print"
              variant="destructive"
              role="alert"
            >
              <AlertTitle>
                {store.error.code === "VALIDATION_ERROR"
                  ? "Sample not loaded"
                  : unsaved
                    ? "Not saved"
                    : "Storage needs attention"}
              </AlertTitle>
              <AlertDescription>
                <p>{store.error.message}</p>
                <div className="recovery-actions">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={backup}
                    disabled={!data.households.length}
                  >
                    Export pending changes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(event) =>
                      openModal({ type: "copy" }, event.currentTarget)
                    }
                  >
                    Copy unsaved text
                  </Button>
                  {phase !== "conflict" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => store.commit(data)}
                      disabled={busy}
                    >
                      Retry save
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(event) =>
                      openModal({ type: "reload" }, event.currentTarget)
                    }
                    disabled={busy}
                  >
                    Reload saved workspace
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
          {notice && (
            <Alert
              className="notice no-print"
              variant={notice.error ? "destructive" : "default"}
              role={notice.error ? "alert" : "status"}
            >
              <AlertTitle>
                {notice.error ? "Action not completed" : "Workspace update"}
              </AlertTitle>
              <AlertDescription>{notice.message}</AlertDescription>
            </Alert>
          )}
          {phase === "loading" ? (
            <div className="loading-state" aria-label="Loading workspace">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-6 w-80 max-w-full" />
              <Skeleton className="h-72 w-full" />
            </div>
          ) : !household || !settlement ? (
            <Empty className="workspace-empty">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <House />
                </EmptyMedia>
                <EmptyTitle>
                  <h1>A fair split starts here.</h1>
                </EmptyTitle>
                <EmptyDescription>
                  Create your household, add the people staying there, and let
                  the dates do the math.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  onClick={(event) =>
                    openModal({ type: "household" }, event.currentTarget)
                  }
                  disabled={busy}
                >
                  <Plus data-icon="inline-start" />
                  Create your first household
                </Button>
                <Button variant="outline" onClick={loadSample} disabled={busy}>
                  Try a sample household
                </Button>
                <p>No account needed. Export backups to keep a copy.</p>
              </EmptyContent>
            </Empty>
          ) : (
            <>
              <div className="household-heading no-print">
                <div>
                  <h1>{household.name}</h1>
                  <p>
                    {period} <span aria-hidden="true">·</span>{" "}
                    {household.currency}
                  </p>
                </div>
                <div className="household-actions">
                  <Button
                    variant="outline"
                    onClick={(event) =>
                      openModal(
                        { type: "household", record: household },
                        event.currentTarget,
                      )
                    }
                    disabled={busy}
                  >
                    Edit household
                  </Button>
                  <Button
                    variant="outline"
                    onClick={(event) =>
                      openModal({ type: "duplicate" }, event.currentTarget)
                    }
                    disabled={
                      busy || data.households.length >= LIMITS.households
                    }
                  >
                    <Copy data-icon="inline-start" />
                    Duplicate scenario
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete household"
                    title="Delete household"
                    onClick={(event) =>
                      openModal(
                        { type: "delete-household" },
                        event.currentTarget,
                      )
                    }
                    disabled={busy}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
              <Tabs
                value={view}
                onValueChange={setView}
                className="workspace-tabs"
              >
                <TabsList
                  variant="line"
                  className="workspace-tab-list no-print"
                  aria-label="Household sections"
                >
                  <TabsTrigger value="overview">
                    <House data-icon="inline-start" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="people">
                    <Users data-icon="inline-start" />
                    People
                  </TabsTrigger>
                  <TabsTrigger value="bills">
                    <ReceiptText data-icon="inline-start" />
                    Bills
                  </TabsTrigger>
                  <TabsTrigger value="report">
                    <FileText data-icon="inline-start" />
                    Report
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="tab-content">
                  <OverviewSection
                    settlement={settlement}
                    busy={busy}
                    openModal={openModal}
                    household={household}
                    canDuplicate={data.households.length < LIMITS.households}
                  />
                </TabsContent>
                <TabsContent value="people" className="tab-content">
                  <PeopleSection
                    settlement={settlement}
                    busy={busy}
                    openModal={openModal}
                  />
                </TabsContent>
                <TabsContent value="bills" className="tab-content">
                  <BillsSection
                    settlement={settlement}
                    busy={busy}
                    openModal={openModal}
                    household={household}
                  />
                </TabsContent>
                <TabsContent value="report" className="tab-content report-tab">
                  <Report
                    key={`${household.id}-${store.revision}`}
                    household={household}
                    settlement={settlement}
                    unsaved={unsaved}
                  />
                </TabsContent>
              </Tabs>
            </>
          )}
          <footer className="workspace-footer no-print">
            <span>
              All calculations stay in your browser. Export a backup to keep a
              copy.
            </span>
            <a href="https://consolelog.studio/">by ConsoleLog Studio</a>
          </footer>
        </main>
      </div>
      <Dialog
        open={!!modal}
        onOpenChange={(open) => {
          if (!open && !busy) setModal(null);
        }}
      >
        <DialogContent
          className={`app-dialog ${modal?.type === "bill" || modal?.type === "copy" ? "wide-dialog" : ""}`}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const target = previousFocus.current;
            if (target?.isConnected && !target.hasAttribute("disabled"))
              target.focus();
            else fallbackFocus.current?.focus();
          }}
          onInteractOutside={(event) => {
            if (busy) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>{modalTitle}</DialogTitle>
            <DialogDescription>{modalDescription}</DialogDescription>
          </DialogHeader>
          {modal?.type === "household" && (
            <HouseholdForm {...formProps} household={modal.record} />
          )}
          {modal?.type === "person" && household && (
            <PersonForm
              {...formProps}
              household={household}
              person={modal.record}
            />
          )}
          {modal?.type === "bill" && household && (
            <BillForm
              {...formProps}
              household={household}
              bill={modal.record}
            />
          )}
          {modal?.type === "duplicate" && (
            <Field>
              <FieldLabel htmlFor="scenario-name">Scenario name</FieldLabel>
              <Input
                id="scenario-name"
                value={copyName}
                onChange={(event) => setCopyName(event.target.value)}
                maxLength={80}
              />
            </Field>
          )}
          {modal?.type === "restore" && restoreData && (
            <>
              <div className="restore-counts">
                <strong>{restoreData.households.length} households</strong>
                <span>{restoreData.people.length} people</span>
                <span>{restoreData.bills.length} bills</span>
              </div>
              <Button
                variant="outline"
                onClick={backup}
                disabled={!data.households.length}
              >
                <Download data-icon="inline-start" />
                Download current workspace first
              </Button>
              <p className="form-hint">
                Existing records remain intact until you choose Replace
                workspace below.
              </p>
            </>
          )}
          {modal?.type === "copy" && (
            <>
              <Field>
                <FieldLabel htmlFor="unsaved-json">Workspace JSON</FieldLabel>
                <textarea
                  id="unsaved-json"
                  className="copy-textarea"
                  readOnly
                  value={exportBackup(data)}
                  onFocus={(event) => event.currentTarget.select()}
                />
              </Field>
              <div className="form-actions">
                <Button variant="outline" onClick={backup}>
                  Download backup
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(exportBackup(data));
                      setCopied(true);
                    } catch {
                      setModalError(
                        "Clipboard access is unavailable. Select the text and copy it manually, or download a backup.",
                      );
                    }
                  }}
                >
                  {copied ? "Copied" : "Copy JSON"}
                </Button>
              </div>
            </>
          )}
          {modalError && (
            <p className="form-error" role="alert">
              {modalError}
            </p>
          )}
          {modal &&
            !["household", "person", "bill", "copy"].includes(modal.type) && (
              <div className="form-actions">
                <Button
                  variant="outline"
                  onClick={() => setModal(null)}
                  disabled={busy}
                >
                  Cancel
                </Button>
                <Button
                  variant={
                    modal.type.startsWith("delete") || modal.type === "restore"
                      ? "destructive"
                      : "default"
                  }
                  onClick={confirmAction}
                  disabled={
                    busy || (modal.type === "duplicate" && !copyName.trim())
                  }
                >
                  {busy
                    ? "Working…"
                    : modal.type === "duplicate"
                      ? "Create scenario"
                      : modal.type === "restore"
                        ? "Replace workspace"
                        : modal.type === "reload"
                          ? "Reload saved workspace"
                          : modal.type === "delete-household"
                            ? "Delete household"
                            : modal.type === "delete-person"
                              ? "Delete person"
                              : "Delete bill"}
                </Button>
              </div>
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
