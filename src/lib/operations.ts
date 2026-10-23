import { AppError } from "./errors";
import {
  BillInputSchema,
  HouseholdInputSchema,
  PersonInputSchema,
  type Bill,
  type Currency,
  type Household,
  type Person,
  type WorkspaceData,
} from "./models";
import { parseSchema, validateWorkspace } from "./validation";

function metadata(existing?: { id: string; createdAt: string }) {
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? crypto.randomUUID(),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export function putHousehold(
  data: WorkspaceData,
  input: unknown,
  id?: string,
): WorkspaceData {
  const values = parseSchema(HouseholdInputSchema, input);
  const existing = data.households.find((h) => h.id === id);
  if (id && !existing)
    throw new AppError(
      "VALIDATION_ERROR",
      "This household no longer exists. Reload the workspace.",
    );
  if (
    existing &&
    existing.currency !== values.currency &&
    data.bills.some((b) => b.householdId === id)
  )
    throw new AppError(
      "VALIDATION_ERROR",
      "Currency is locked while this household contains bills.",
      { currency: ["Currency is locked while bills exist."] },
    );
  const household: Household = { ...values, ...metadata(existing) };
  return validateWorkspace({
    ...data,
    households: existing
      ? data.households.map((h) => (h.id === id ? household : h))
      : [...data.households, household],
  });
}

export function putPerson(
  data: WorkspaceData,
  input: unknown,
  id?: string,
): WorkspaceData {
  const values = parseSchema(PersonInputSchema, input);
  const existing = data.people.find((p) => p.id === id);
  if (id && (!existing || existing.householdId !== values.householdId))
    throw new AppError(
      "VALIDATION_ERROR",
      "This person no longer belongs to this household.",
    );
  const person: Person = { ...values, ...metadata(existing) };
  return validateWorkspace({
    ...data,
    people: existing
      ? data.people.map((p) => (p.id === id ? person : p))
      : [...data.people, person],
  });
}

export function putBill(
  data: WorkspaceData,
  input: unknown,
  id?: string,
): WorkspaceData {
  const values = parseSchema(BillInputSchema, input);
  const existing = data.bills.find((b) => b.id === id);
  if (id && (!existing || existing.householdId !== values.householdId))
    throw new AppError(
      "VALIDATION_ERROR",
      "This bill no longer belongs to this household.",
    );
  const bill: Bill = { ...values, ...metadata(existing) };
  return validateWorkspace({
    ...data,
    bills: existing
      ? data.bills.map((b) => (b.id === id ? bill : b))
      : [...data.bills, bill],
  });
}

export function removeHousehold(
  data: WorkspaceData,
  id: string,
): WorkspaceData {
  return validateWorkspace({
    households: data.households.filter((h) => h.id !== id),
    people: data.people.filter((p) => p.householdId !== id),
    bills: data.bills.filter((b) => b.householdId !== id),
  });
}

export function removePerson(data: WorkspaceData, id: string): WorkspaceData {
  const affected = data.bills.filter(
    (b) => b.payerId === id || b.eligiblePersonIds.includes(id),
  );
  if (affected.length)
    throw new AppError(
      "VALIDATION_ERROR",
      `Reassign this person in these bills before deleting: ${affected.map((b) => b.title).join(", ")}.`,
    );
  return validateWorkspace({
    ...data,
    people: data.people.filter((p) => p.id !== id),
  });
}

export function removeBill(data: WorkspaceData, id: string): WorkspaceData {
  return validateWorkspace({
    ...data,
    bills: data.bills.filter((b) => b.id !== id),
  });
}

export function duplicateHousehold(
  data: WorkspaceData,
  id: string,
  name: string,
): WorkspaceData {
  const source = data.households.find((h) => h.id === id);
  if (!source)
    throw new AppError(
      "VALIDATION_ERROR",
      "Choose an existing household to duplicate.",
    );
  const household: Household = {
    ...parseSchema(HouseholdInputSchema, { name, currency: source.currency }),
    ...metadata(),
  };
  const sourcePeople = data.people
    .filter((p) => p.householdId === id)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  // Keep the ID tie-break order so a copy starts with identical rounded shares.
  const newIds = sourcePeople.map(() => crypto.randomUUID()).sort();
  const mapping = new Map(sourcePeople.map((p, i) => [p.id, newIds[i]]));
  const people = sourcePeople.map((p) => ({
    ...p,
    ...metadata(),
    id: mapping.get(p.id)!,
    householdId: household.id,
  }));
  const bills = data.bills
    .filter((b) => b.householdId === id)
    .map((b) => ({
      ...b,
      ...metadata(),
      householdId: household.id,
      payerId: mapping.get(b.payerId)!,
      eligiblePersonIds: b.eligiblePersonIds.map((personId) =>
        mapping.get(personId)!,
      ),
    }));
  return validateWorkspace({
    households: [...data.households, household],
    people: [...data.people, ...people],
    bills: [...data.bills, ...bills],
  });
}

export function appendSample(
  data: WorkspaceData,
  currency: Currency = "USD",
): WorkspaceData {
  const household: Household = { ...metadata(), name: "Cedar House", currency };
  const [aliceId, benId] = [crypto.randomUUID(), crypto.randomUUID()].sort();
  const people: Person[] = [
    {
      ...metadata(),
      id: aliceId,
      householdId: household.id,
      displayName: "Alice Morgan",
      arrivedOn: "2026-10-01",
    },
    {
      ...metadata(),
      id: benId,
      householdId: household.id,
      displayName: "Ben Parker",
      arrivedOn: "2026-10-16",
    },
  ];
  const bill: Bill = {
    ...metadata(),
    householdId: household.id,
    title: "Electricity",
    amountMinor: 30_000,
    startOn: "2026-10-01",
    endOn: "2026-10-31",
    payerId: aliceId,
    eligiblePersonIds: people.map((p) => p.id),
    method: "occupied-day",
  };
  return validateWorkspace({
    households: [...data.households, household],
    people: [...data.people, ...people],
    bills: [...data.bills, bill],
  });
}
