import { z } from "zod";
import { AppError } from "./errors";
import { allocateBill } from "./calculations";
import { LIMITS, WorkspaceSchema, type WorkspaceData } from "./models";

export function parseSchema<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (parsed.success) return parsed.data;
  const fields: Record<string, string[]> = {};
  for (const issue of parsed.error.issues) {
    const path = issue.path.join(".");
    (fields[path] ??= []).push(issue.message);
  }
  throw new AppError(
    "VALIDATION_ERROR",
    parsed.error.issues
      .map((i) => `${i.path.join(".") || "Data"}: ${i.message}`)
      .slice(0, 4)
      .join(" "),
    fields,
  );
}

export function validateWorkspace(input: unknown): WorkspaceData {
  const data = parseSchema(WorkspaceSchema, input);
  const ids = new Set<string>();
  for (const record of [...data.households, ...data.people, ...data.bills]) {
    if (ids.has(record.id))
      throw new AppError(
        "VALIDATION_ERROR",
        "Duplicate record identifiers are not allowed.",
      );
    ids.add(record.id);
  }
  const householdIds = new Set(data.households.map((h) => h.id));
  for (const record of [...data.people, ...data.bills])
    if (!householdIds.has(record.householdId))
      throw new AppError(
        "VALIDATION_ERROR",
        "A person or bill references a household that does not exist.",
      );
  for (const household of data.households) {
    const people = data.people.filter((p) => p.householdId === household.id);
    const bills = data.bills.filter((b) => b.householdId === household.id);
    if (people.length > LIMITS.people || bills.length > LIMITS.bills)
      throw new AppError(
        "VALIDATION_ERROR",
        "Each household can contain at most 20 people and 100 bills.",
      );
    for (const bill of bills) {
      try {
        allocateBill(bill, people);
      } catch (error) {
        if (error instanceof AppError)
          throw new AppError(
            error.code,
            `${bill.title}: ${error.message}`,
            error.fieldErrors,
          );
        throw error;
      }
    }
  }
  return data;
}
