import { appendSample } from "../src/lib/operations";
import { emptyWorkspace, type WorkspaceData } from "../src/lib/models";

export function maximumHousehold(): WorkspaceData {
  const data = appendSample(emptyWorkspace());
  data.people = Array.from({ length: 20 }, (_, index) => ({
    ...data.people[0],
    id: crypto.randomUUID(),
    displayName: `Person ${index + 1}`,
    arrivedOn: `2026-01-${String(index + 1).padStart(2, "0")}`,
  }));
  data.bills = Array.from({ length: 100 }, (_, index) => ({
    ...data.bills[0],
    id: crypto.randomUUID(),
    title: `Bill ${index + 1}`,
    amountMinor: 1_000_000_000,
    startOn: "2026-01-01",
    endOn: "2027-01-01",
    payerId: data.people[index % 20].id,
    eligiblePersonIds: data.people.map((p) => p.id),
  }));
  return data;
}
