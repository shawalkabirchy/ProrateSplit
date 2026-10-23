import type { Bill, Currency, Person, WorkspaceData } from "./models";
import { LIMITS } from "./models";
import { AppError } from "./errors";
import { dayNumber, dayString, periodLabel } from "./dates";

const formatters = {
  USD: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }),
  BDT: new Intl.NumberFormat("en-US", { style: "currency", currency: "BDT" }),
};

export function parseMoney(text: string): number {
  const value = text.trim();
  if (value.length > 15 || !/^\d+(?:\.\d{1,2})?$/.test(value)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Enter an amount with at most two decimal places, for example 125.50.",
      {
        amountMinor: [
          "Enter a non-negative amount with at most two decimal places.",
        ],
      },
    );
  }
  const [whole, fraction = ""] = value.split(".");
  const amount = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (amount > BigInt(LIMITS.amountMinor))
    throw new AppError(
      "VALIDATION_ERROR",
      "The maximum bill amount is 10,000,000.00.",
      { amountMinor: ["The maximum bill amount is 10,000,000.00."] },
    );
  return Number(amount);
}

export function moneyInput(amount: number): string {
  return `${Math.floor(amount / 100)}.${String(amount % 100).padStart(2, "0")}`;
}

export function money(amount: number, currency: Currency): string {
  return formatters[currency].format(amount / 100);
}

export type DaySegment = {
  startOn: string;
  endOn: string;
  dayCount: number;
  personIds: string[];
};
export type BillAllocation = {
  allocations: Record<string, number>;
  segments: DaySegment[];
  days: number;
};

export function allocateBill(bill: Bill, people: Person[]): BillAllocation {
  const start = dayNumber(bill.startOn),
    end = dayNumber(bill.endOn),
    days = end - start;
  if (
    days < 1 ||
    days > 366 ||
    !Number.isSafeInteger(bill.amountMinor) ||
    bill.amountMinor < 0 ||
    bill.amountMinor > LIMITS.amountMinor
  )
    throw new AppError(
      "VALIDATION_ERROR",
      "Check the bill amount and its 1–366 day period.",
    );
  const householdPeople = people.filter(
    (p) => p.householdId === bill.householdId,
  );
  if (!householdPeople.some((p) => p.id === bill.payerId))
    throw new AppError(
      "VALIDATION_ERROR",
      "The payer must belong to this household.",
      { payerId: ["Choose a person in this household."] },
    );
  if (
    !bill.eligiblePersonIds.length ||
    new Set(bill.eligiblePersonIds).size !== bill.eligiblePersonIds.length ||
    bill.eligiblePersonIds.length > LIMITS.people
  )
    throw new AppError("VALIDATION_ERROR", "Choose 1–20 unique participants.");
  const selected = bill.eligiblePersonIds
    .map((id) => {
      const person = householdPeople.find((p) => p.id === id);
      if (!person)
        throw new AppError(
          "VALIDATION_ERROR",
          "Every selected participant must belong to this household.",
          { eligiblePersonIds: ["Choose people in this household."] },
        );
      return person;
    })
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const segments: DaySegment[] = [];
  let denominator: bigint;
  let numerators: bigint[];
  if (bill.method === "equal") {
    denominator = BigInt(selected.length);
    numerators = selected.map(() => BigInt(bill.amountMinor));
  } else if (bill.method === "occupied-day") {
    const occupancy = selected.map((p) => ({
      start: dayNumber(p.arrivedOn),
      end: p.departedOn ? dayNumber(p.departedOn) : Infinity,
    }));
    const boundaries = [
      ...new Set([
        start,
        end,
        ...occupancy
          .flatMap((p) => [p.start, p.end])
          .filter((d) => d > start && d < end),
      ]),
    ].sort((a, b) => a - b);
    // LCM(1..20) makes every possible daily split exact without floating point.
    const common = 232_792_560n;
    const weights = selected.map(() => 0n);
    const uncovered: string[] = [];
    for (let i = 0; i < boundaries.length - 1; i++) {
      const from = boundaries[i],
        to = boundaries[i + 1];
      const present = occupancy.flatMap((p, index) =>
        p.start <= from && p.end > from ? [index] : [],
      );
      if (!present.length) {
        uncovered.push(
          `${periodLabel(dayString(from), dayString(to))} (${to - from} days)`,
        );
        continue;
      }
      const weight = BigInt(to - from) * (common / BigInt(present.length));
      present.forEach((index) => {
        weights[index] += weight;
      });
      segments.push({
        startOn: dayString(from),
        endOn: dayString(to),
        dayCount: to - from,
        personIds: present.map((index) => selected[index].id),
      });
    }
    if (uncovered.length)
      throw new AppError(
        "VALIDATION_ERROR",
        `No eligible occupants on ${uncovered.join("; ")}. Change the dates, participants, or split method.`,
        { startOn: [`Uncovered dates: ${uncovered.join("; ")}.`] },
      );
    denominator = BigInt(days) * common;
    numerators = weights.map((weight) => weight * BigInt(bill.amountMinor));
  } else
    throw new AppError("VALIDATION_ERROR", "Choose a supported split method.");

  const shares = selected.map((person, i) => ({
    id: person.id,
    amount: Number(numerators[i] / denominator),
    remainder: numerators[i] % denominator,
  }));
  const leftover =
    bill.amountMinor - shares.reduce((sum, share) => sum + share.amount, 0);
  const remainderOrder = [...shares].sort((a, b) =>
    a.remainder === b.remainder
      ? a.id < b.id
        ? -1
        : a.id > b.id
          ? 1
          : 0
      : a.remainder > b.remainder
        ? -1
        : 1,
  );
  for (let i = 0; i < leftover; i++) remainderOrder[i].amount++;
  return {
    allocations: Object.fromEntries(shares.map((s) => [s.id, s.amount])),
    segments,
    days,
  };
}

export function calculateSettlement(householdId: string, data: WorkspaceData) {
  const people = data.people.filter((p) => p.householdId === householdId);
  const bills = data.bills
    .filter((b) => b.householdId === householdId)
    .map((bill) => ({ bill, ...allocateBill(bill, people) }));
  const totals = people.map((person) => {
    const allocated = bills.reduce(
      (sum, b) => sum + (b.allocations[person.id] ?? 0),
      0,
    );
    const paid = bills.reduce(
      (sum, b) => sum + (b.bill.payerId === person.id ? b.bill.amountMinor : 0),
      0,
    );
    return { person, allocated, paid, net: allocated - paid };
  });
  return {
    people: totals,
    bills,
    total: bills.reduce((sum, b) => sum + b.bill.amountMinor, 0),
  };
}
