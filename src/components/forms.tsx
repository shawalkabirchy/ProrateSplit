"use client";

import { useState, type FormEvent, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import {
  allocateBill,
  money,
  moneyInput,
  parseMoney,
} from "@/lib/calculations";
import { AppError } from "@/lib/errors";
import {
  BillInputSchema,
  type Bill,
  type Currency,
  type Household,
  type Person,
  type WorkspaceData,
} from "@/lib/models";
import { putBill, putHousehold, putPerson } from "@/lib/operations";
import { parseSchema } from "@/lib/validation";

type FormProps = {
  data: WorkspaceData;
  busy: boolean;
  onSave: (data: WorkspaceData) => Promise<void>;
  onClose: () => void;
};

function problem(error: unknown): AppError {
  return error instanceof AppError
    ? error
    : new AppError("VALIDATION_ERROR", "Check the form and try again.");
}

function fieldError(error: AppError | null, key: string) {
  return (
    error?.fieldErrors[key]?.[0] ??
    Object.entries(error?.fieldErrors ?? {}).find(([path]) =>
      path.endsWith(`.${key}`),
    )?.[1][0]
  );
}

function TextField({
  label,
  description,
  error,
  id,
  ...props
}: ComponentProps<typeof Input> & {
  label: string;
  description?: string;
  error?: string;
  id: string;
}) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        {...props}
        id={id}
        aria-invalid={!!error}
        aria-describedby={
          [description ? `${id}-description` : "", error ? `${id}-error` : ""]
            .filter(Boolean)
            .join(" ") || undefined
        }
      />
      {description && (
        <FieldDescription id={`${id}-description`}>
          {description}
        </FieldDescription>
      )}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </Field>
  );
}

function FormError({ error }: { error: AppError | null }) {
  return error ? (
    <div className="form-error" role="alert">
      {error.message}
    </div>
  ) : null;
}

export function FormActions({
  busy,
  onClose,
  label = "Save changes",
}: {
  busy: boolean;
  onClose: () => void;
  label?: string;
}) {
  return (
    <div className="form-actions">
      <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
        Cancel
      </Button>
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : label}
      </Button>
    </div>
  );
}

export function HouseholdForm({
  data,
  household,
  busy,
  onSave,
  onClose,
}: FormProps & { household?: Household }) {
  const [error, setError] = useState<AppError | null>(null);
  const [currency, setCurrency] = useState<Currency>(
    household?.currency ?? "USD",
  );
  const locked =
    !!household && data.bills.some((b) => b.householdId === household.id);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const values = new FormData(event.currentTarget);
    try {
      await onSave(
        putHousehold(
          data,
          { name: values.get("name"), currency },
          household?.id,
        ),
      );
      onClose();
    } catch (failure) {
      setError(problem(failure));
    }
  }
  return (
    <form onSubmit={submit} noValidate>
      <FieldGroup>
        <TextField
          id="household-name"
          name="name"
          label="Household name"
          placeholder="e.g. Cedar House"
          defaultValue={household?.name ?? ""}
          maxLength={80}
          autoComplete="off"
          required
          error={fieldError(error, "name")}
        />
        <Field>
          <FieldLabel htmlFor="household-currency">Currency</FieldLabel>
          <select
            id="household-currency"
            className="form-control"
            value={currency}
            onChange={(event) => setCurrency(event.target.value as Currency)}
            disabled={locked}
            aria-describedby="currency-help"
          >
            <option value="USD">USD — US dollar</option>
            <option value="BDT">BDT — Bangladeshi taka</option>
          </select>
          <FieldDescription id="currency-help">
            {locked
              ? "Currency is locked while this household contains bills."
              : "Choose before adding bills. Amounts are never converted."}
          </FieldDescription>
        </Field>
      </FieldGroup>
      <FormError error={error} />
      <FormActions
        busy={busy}
        onClose={onClose}
        label={household ? "Save household" : "Create household"}
      />
    </form>
  );
}

export function PersonForm({
  data,
  household,
  person,
  busy,
  onSave,
  onClose,
}: FormProps & { household: Household; person?: Person }) {
  const [error, setError] = useState<AppError | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const values = new FormData(event.currentTarget);
    try {
      await onSave(
        putPerson(
          data,
          {
            householdId: household.id,
            displayName: values.get("displayName"),
            arrivedOn: values.get("arrivedOn"),
            ...(values.get("departedOn")
              ? { departedOn: values.get("departedOn") }
              : {}),
          },
          person?.id,
        ),
      );
      onClose();
    } catch (failure) {
      setError(problem(failure));
    }
  }
  return (
    <form onSubmit={submit} noValidate>
      <FieldGroup>
        <TextField
          id="person-name"
          name="displayName"
          label="Person’s name"
          defaultValue={person?.displayName ?? ""}
          placeholder="e.g. Alice Morgan"
          maxLength={80}
          autoComplete="off"
          required
          error={fieldError(error, "displayName")}
        />
        <div className="form-columns">
          <TextField
            id="arrived-on"
            name="arrivedOn"
            label="Arrival date"
            type="date"
            min="0001-01-01"
            max="9999-12-31"
            defaultValue={person?.arrivedOn ?? ""}
            required
            description="This day is included."
            error={fieldError(error, "arrivedOn")}
          />
          <TextField
            id="departed-on"
            name="departedOn"
            label="Departure date (optional)"
            type="date"
            min="0001-01-01"
            max="9999-12-31"
            defaultValue={person?.departedOn ?? ""}
            description="This day is excluded. Leave empty for an ongoing stay."
            error={fieldError(error, "departedOn")}
          />
        </div>
        <p className="form-hint">
          Moving out on October 17 means the last occupied day is October 16.
          Changes must keep existing bills fully covered.
        </p>
      </FieldGroup>
      <FormError error={error} />
      <FormActions
        busy={busy}
        onClose={onClose}
        label={person ? "Save person" : "Add person"}
      />
    </form>
  );
}

function defaultPeriod() {
  const now = new Date();
  const format = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return {
    startOn: format(new Date(now.getFullYear(), now.getMonth(), 1)),
    endOn: format(new Date(now.getFullYear(), now.getMonth() + 1, 1)),
  };
}

export function BillForm({
  data,
  household,
  bill,
  busy,
  onSave,
  onClose,
}: FormProps & { household: Household; bill?: Bill }) {
  const people = data.people.filter((p) => p.householdId === household.id);
  const [values, setValues] = useState(() => ({
    title: bill?.title ?? "",
    amount: bill ? moneyInput(bill.amountMinor) : "",
    ...defaultPeriod(),
    ...(bill ? { startOn: bill.startOn, endOn: bill.endOn } : {}),
    payerId: bill?.payerId ?? people[0]?.id ?? "",
    eligiblePersonIds: bill?.eligiblePersonIds ?? people.map((p) => p.id),
    method: bill?.method ?? ("occupied-day" as Bill["method"]),
  }));
  const [error, setError] = useState<AppError | null>(null);
  const update = (key: keyof typeof values, value: string) =>
    setValues((current) => ({ ...current, [key]: value }));
  function billValues() {
    return {
      householdId: household.id,
      title: values.title,
      amountMinor: parseMoney(values.amount),
      startOn: values.startOn,
      endOn: values.endOn,
      payerId: values.payerId,
      eligiblePersonIds: values.eligiblePersonIds,
      method: values.method,
    };
  }
  let preview: ReturnType<typeof allocateBill> | undefined;
  let previewError: AppError | null = null;
  try {
    const parsed = parseSchema(BillInputSchema, billValues());
    preview = allocateBill(
      {
        ...parsed,
        id: bill?.id ?? "00000000-0000-4000-8000-000000000000",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      people,
    );
  } catch (failure) {
    if (values.amount) previewError = problem(failure);
  }
  const shownError = error ?? previewError;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await onSave(putBill(data, billValues(), bill?.id));
      onClose();
    } catch (failure) {
      setError(problem(failure));
    }
  }
  return (
    <form onSubmit={submit} noValidate>
      <FieldGroup>
        <div className="form-columns bill-top-fields">
          <TextField
            id="bill-title"
            label="Bill name"
            value={values.title}
            onChange={(event) => update("title", event.target.value)}
            placeholder="e.g. Electricity"
            maxLength={80}
            required
            error={fieldError(shownError, "title")}
          />
          <TextField
            id="bill-amount"
            label={`Amount (${household.currency})`}
            value={values.amount}
            onChange={(event) => update("amount", event.target.value)}
            inputMode="decimal"
            placeholder="0.00"
            maxLength={15}
            required
            error={fieldError(shownError, "amountMinor")}
          />
        </div>
        <div className="form-columns">
          <TextField
            id="bill-start"
            label="Period start (included)"
            type="date"
            min="0001-01-01"
            max="9999-12-31"
            value={values.startOn}
            onChange={(event) => update("startOn", event.target.value)}
            required
            error={fieldError(shownError, "startOn")}
          />
          <TextField
            id="bill-end"
            label="Period end (excluded)"
            type="date"
            min="0001-01-01"
            max="9999-12-31"
            value={values.endOn}
            onChange={(event) => update("endOn", event.target.value)}
            description="For all of October, use November 1."
            required
            error={fieldError(shownError, "endOn")}
          />
        </div>
        <Field>
          <FieldLabel htmlFor="bill-payer">Who paid the bill?</FieldLabel>
          <select
            id="bill-payer"
            className="form-control"
            value={values.payerId}
            onChange={(event) => update("payerId", event.target.value)}
            aria-invalid={!!fieldError(shownError, "payerId")}
            aria-describedby={
              fieldError(shownError, "payerId") ? "payer-error" : undefined
            }
          >
            {!people.length && <option value="">Add people first</option>}
            {people.map((p) => (
              <option value={p.id} key={p.id}>
                {p.displayName}
              </option>
            ))}
          </select>
          {fieldError(shownError, "payerId") && (
            <FieldError id="payer-error">
              {fieldError(shownError, "payerId")}
            </FieldError>
          )}
        </Field>
        <FieldSet>
          <FieldLegend>People sharing this bill</FieldLegend>
          <div className="participant-options">
            {people.map((p) => (
              <label
                className="person-option"
                key={p.id}
                htmlFor={`participant-${p.id}`}
              >
                <Checkbox
                  id={`participant-${p.id}`}
                  checked={values.eligiblePersonIds.includes(p.id)}
                  onCheckedChange={(checked) =>
                    setValues((current) => ({
                      ...current,
                      eligiblePersonIds:
                        checked === true
                          ? [...current.eligiblePersonIds, p.id]
                          : current.eligiblePersonIds.filter(
                              (id) => id !== p.id,
                            ),
                    }))
                  }
                />
                <span>{p.displayName}</span>
              </label>
            ))}
          </div>
          {fieldError(shownError, "eligiblePersonIds") && (
            <FieldError>
              {fieldError(shownError, "eligiblePersonIds")}
            </FieldError>
          )}
        </FieldSet>
        <Field>
          <FieldLabel>Split method</FieldLabel>
          <ToggleGroup
            type="single"
            variant="outline"
            value={values.method}
            onValueChange={(method) => {
              if (method) update("method", method);
            }}
            aria-label="Split method"
          >
            <ToggleGroupItem value="occupied-day">
              Occupied days
            </ToggleGroupItem>
            <ToggleGroupItem value="equal">Equal shares</ToggleGroupItem>
          </ToggleGroup>
          <FieldDescription>
            {values.method === "equal"
              ? "Split equally among selected people. Occupancy dates are ignored."
              : "Split each day’s equal portion among selected people present that day."}
          </FieldDescription>
        </Field>
      </FieldGroup>
      <div className="live-preview" aria-live="polite">
        <h3>Live allocation preview</h3>
        {preview ? (
          <>
            {people
              .filter((p) => values.eligiblePersonIds.includes(p.id))
              .map((p) => (
                <div className="preview-allocation-row" key={p.id}>
                  <span>{p.displayName}</span>
                  <strong className="tabular">
                    {money(preview!.allocations[p.id] ?? 0, household.currency)}
                  </strong>
                </div>
              ))}
            <p>
              {preview.days} days · Total{" "}
              {money(parseMoney(values.amount), household.currency)} · Every
              cent accounted for.
            </p>
          </>
        ) : (
          <p>
            {previewError?.message ??
              "Complete the bill to see everyone’s share before saving."}
          </p>
        )}
      </div>
      <FormError error={error} />
      <FormActions
        busy={busy || !people.length}
        onClose={onClose}
        label={bill ? "Save bill" : "Add bill"}
      />
    </form>
  );
}
