import { describe, expect, it } from "vitest";
import {
  allocateBill,
  calculateSettlement,
  parseMoney,
} from "../src/lib/calculations";
import { dayNumber, isCalendarDate } from "../src/lib/dates";
import { emptyWorkspace, LIMITS, type Bill } from "../src/lib/models";
import {
  appendSample,
  duplicateHousehold,
  putHousehold,
  putPerson,
  removeHousehold,
  removePerson,
} from "../src/lib/operations";
import { exportBackup, parseBackup } from "../src/lib/backup";
import { validateWorkspace } from "../src/lib/validation";

const sample = () => appendSample(emptyWorkspace());

describe("calendar dates", () => {
  it("validates leap years and real dates, including years below 100", () => {
    expect(isCalendarDate("2024-02-29")).toBe(true);
    expect(isCalendarDate("2000-02-29")).toBe(true);
    for (const value of [
      "1900-02-29",
      "2023-02-29",
      "2026-04-31",
      "2026-2-01",
      "0000-01-01",
    ])
      expect(isCalendarDate(value)).toBe(false);
    expect(dayNumber("0099-03-01") - dayNumber("0099-02-28")).toBe(1);
  });
  it("counts calendar days without DST shifts", () => {
    expect(dayNumber("2024-03-12") - dayNumber("2024-03-09")).toBe(3);
    expect(dayNumber("2024-03-01") - dayNumber("2024-02-01")).toBe(29);
  });
});

describe("exact money and allocations", () => {
  it.each([
    ["0", 0],
    ["0.29", 29],
    ["123.45", 12345],
    ["0001.1", 110],
    ["10000000.00", LIMITS.amountMinor],
  ])("parses %s exactly", (input, amount) =>
    expect(parseMoney(input)).toBe(amount),
  );
  it.each([
    "-1",
    "NaN",
    "1e2",
    "0.001",
    "",
    ".5",
    "1,000",
    "10000000.01",
    "1.2.3",
  ])("rejects malformed amount %s", (value) =>
    expect(() => parseMoney(value)).toThrow(),
  );
  it("matches the 225/75 occupied-day example and payer balances", () => {
    const data = sample();
    const result = calculateSettlement(data.households[0].id, data);
    expect(result.people.map((p) => p.allocated)).toEqual([22500, 7500]);
    expect(result.people.map((p) => p.net)).toEqual([-7500, 7500]);
    expect(result.bills[0].segments.map((s) => s.dayCount)).toEqual([15, 15]);
  });
  it("excludes an arrival on the billing end date", () => {
    const data = sample();
    data.people[1].arrivedOn = "2026-10-31";
    const result = allocateBill(data.bills[0], data.people);
    expect(Object.values(result.allocations)).toEqual([30000, 0]);
  });
  it("rejects and identifies vacancy even for zero-amount bills", () => {
    const data = sample();
    data.people[0].arrivedOn = "2026-10-16";
    expect(() => allocateBill(data.bills[0], data.people)).toThrow(
      /Oct 1, 2026.*Oct 15, 2026/,
    );
    expect(() =>
      allocateBill({ ...data.bills[0], amountMinor: 0 }, data.people),
    ).toThrow(/No eligible occupants/);
  });
  it("rounds equal shares once using stable IDs, regardless of input order", () => {
    const data = sample();
    const third = {
      ...data.people[0],
      id: crypto.randomUUID(),
      displayName: "Chris",
    };
    const people = [...data.people, third].sort((a, b) =>
      a.id < b.id ? -1 : 1,
    );
    const bill: Bill = {
      ...data.bills[0],
      amountMinor: 100,
      method: "equal",
      eligiblePersonIds: [...people].reverse().map((p) => p.id),
    };
    expect(Object.values(allocateBill(bill, people).allocations)).toEqual([
      34, 33, 33,
    ]);
  });
  it("conserves minor units across varied occupancy counts and amounts", () => {
    const data = sample();
    const people = Array.from({ length: 20 }, (_, i) => ({
      ...data.people[0],
      id: crypto.randomUUID(),
      displayName: `Person ${i}`,
      arrivedOn: `2026-10-${String(i + 1).padStart(2, "0")}`,
    }));
    for (const amountMinor of [0, 1, 2, 17, 100, 30101, LIMITS.amountMinor]) {
      const bill: Bill = {
        ...data.bills[0],
        amountMinor,
        payerId: people[0].id,
        eligiblePersonIds: people.map((p) => p.id),
      };
      const result = allocateBill(bill, people);
      expect(Object.values(result.allocations).reduce((a, b) => a + b, 0)).toBe(
        amountMinor,
      );
      expect(
        Object.values(result.allocations).every(Number.isSafeInteger),
      ).toBe(true);
    }
  });
  it("equal split ignores occupancy and rejects invalid payer/participants", () => {
    const data = sample();
    data.people.forEach((p) => {
      p.arrivedOn = "2027-01-01";
    });
    expect(
      Object.values(
        allocateBill({ ...data.bills[0], method: "equal" }, data.people)
          .allocations,
      ),
    ).toEqual([15000, 15000]);
    expect(() =>
      allocateBill(
        { ...data.bills[0], payerId: crypto.randomUUID() },
        data.people,
      ),
    ).toThrow(/payer/);
    expect(() =>
      allocateBill(
        { ...data.bills[0], eligiblePersonIds: [crypto.randomUUID()] },
        data.people,
      ),
    ).toThrow(/participant/);
  });
});

describe("workspace invariants and scenario copies", () => {
  it("accepts 1 and 366 days and rejects reversed or longer periods", () => {
    const data = sample();
    for (const [startOn, endOn] of [
      ["2024-01-01", "2024-01-02"],
      ["2024-01-01", "2025-01-01"],
    ]) {
      data.bills[0] = { ...data.bills[0], method: "equal", startOn, endOn };
      expect(() => validateWorkspace(data)).not.toThrow();
    }
    for (const [startOn, endOn] of [
      ["2024-01-01", "2025-01-02"],
      ["2024-01-01", "2024-01-01"],
      ["2024-01-02", "2024-01-01"],
    ]) {
      data.bills[0] = { ...data.bills[0], startOn, endOn };
      expect(() => validateWorkspace(data)).toThrow();
    }
  });
  it("rejects edits invalidating bills and deletion of referenced people", () => {
    const data = sample(),
      p = data.people[0];
    expect(() =>
      putPerson(
        data,
        {
          householdId: p.householdId,
          displayName: p.displayName,
          arrivedOn: "2026-10-16",
        },
        p.id,
      ),
    ).toThrow(/No eligible/);
    expect(() => removePerson(data, p.id)).toThrow(/Electricity/);
    expect(data.people[0].arrivedOn).toBe("2026-10-01");
  });
  it("locks currency while financial records exist", () => {
    const data = sample(),
      h = data.households[0];
    expect(() =>
      putHousehold(data, { name: h.name, currency: "BDT" }, h.id),
    ).toThrow(/locked/);
  });
  it("copies all references independently while preserving tied rounded results", () => {
    const data = sample();
    data.people.push({
      ...data.people[0],
      id: crypto.randomUUID(),
      displayName: "Chris",
    });
    data.bills[0] = {
      ...data.bills[0],
      amountMinor: 100,
      method: "equal",
      eligiblePersonIds: data.people.map((p) => p.id),
    };
    const clone = duplicateHousehold(
      data,
      data.households[0].id,
      "Alternative",
    );
    const copied = calculateSettlement(clone.households[1].id, clone),
      original = calculateSettlement(clone.households[0].id, clone);
    const byName = (people: typeof copied.people) =>
      Object.fromEntries(
        people.map((p) => [p.person.displayName, p.allocated]),
      );
    expect(byName(copied.people)).toEqual(byName(original.people));
    expect(
      copied.people.every(
        (p) => !data.people.some((old) => old.id === p.person.id),
      ),
    ).toBe(true);
    expect(clone.bills[1].payerId).not.toBe(data.bills[0].payerId);
  });
  it("deletes a household and its records together", () => {
    const data = appendSample(sample());
    const next = removeHousehold(data, data.households[0].id);
    expect([
      next.households.length,
      next.people.length,
      next.bills.length,
    ]).toEqual([1, 2, 1]);
    expect(data.households.length).toBe(2);
  });
  it("enforces household and per-household count limits", () => {
    let data = emptyWorkspace();
    for (let i = 0; i < 20; i++) data = appendSample(data);
    expect(() => appendSample(data)).toThrow();
    const tooMany = sample();
    tooMany.people = Array.from({ length: 21 }, () => ({
      ...tooMany.people[0],
      id: crypto.randomUUID(),
    }));
    tooMany.bills = [];
    expect(() => validateWorkspace(tooMany)).toThrow(/at most/);
  });
});

describe("backup trust boundary", () => {
  it("round-trips all records, including BDT", () => {
    const data = appendSample(emptyWorkspace(), "BDT");
    expect(parseBackup(exportBackup(data))).toEqual(data);
  });
  it("rejects malformed, wrong-app, future-version, duplicate and broken-reference backups without changing the original", () => {
    const data = sample(),
      before = JSON.stringify(data),
      envelope = JSON.parse(exportBackup(data));
    for (const invalid of [
      "{",
      JSON.stringify({ ...envelope, appId: "P05" }),
      JSON.stringify({ ...envelope, formatVersion: 2 }),
      JSON.stringify({
        ...envelope,
        payload: { ...data, people: [data.people[0], data.people[0]] },
      }),
      JSON.stringify({
        ...envelope,
        payload: {
          ...data,
          bills: [{ ...data.bills[0], payerId: crypto.randomUUID() }],
        },
      }),
      JSON.stringify({
        ...envelope,
        payload: { ...data, bills: [{ ...data.bills[0], amountMinor: -1 }] },
      }),
    ])
      expect(() => parseBackup(invalid)).toThrow(/not imported/);
    expect(JSON.stringify(data)).toBe(before);
  });
  it("checks the byte limit before JSON parsing", () =>
    expect(() => parseBackup(" ".repeat(LIMITS.backupBytes + 1))).toThrow(
      /10 MiB/,
    ));
});
