import { z } from "zod";
import { dayNumber, isCalendarDate } from "./dates";

export const LIMITS = {
  households: 20,
  people: 20,
  bills: 100,
  amountMinor: 1_000_000_000,
  backupBytes: 10 * 1024 * 1024,
} as const;
export const CurrencySchema = z.enum(["USD", "BDT"]);
const name = z
  .string()
  .trim()
  .min(1, "Enter a name.")
  .max(80, "Use 80 characters or fewer.");
const date = z
  .string()
  .refine(isCalendarDate, "Enter a real date in YYYY-MM-DD format.");
const metadata = {
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
};

export const HouseholdInputSchema = z.object({
  name,
  currency: CurrencySchema,
});
export const HouseholdSchema = HouseholdInputSchema.extend(metadata).strict();
export const PersonInputSchema = z
  .object({
    householdId: z.string().uuid(),
    displayName: name,
    arrivedOn: date,
    departedOn: date.optional(),
  })
  .refine(
    (p) =>
      !p.departedOn ||
      !isCalendarDate(p.arrivedOn) ||
      !isCalendarDate(p.departedOn) ||
      dayNumber(p.departedOn) > dayNumber(p.arrivedOn),
    {
      message: "Departure must be after arrival (departure day is excluded).",
      path: ["departedOn"],
    },
  );
export const PersonSchema = PersonInputSchema.safeExtend(metadata).strict();
export const BillInputSchema = z
  .object({
    householdId: z.string().uuid(),
    title: name,
    amountMinor: z.number().int().min(0).max(LIMITS.amountMinor),
    startOn: date,
    endOn: date,
    payerId: z.string().uuid(),
    eligiblePersonIds: z
      .array(z.string().uuid())
      .min(1, "Choose at least one person.")
      .max(LIMITS.people)
      .refine(
        (ids) => new Set(ids).size === ids.length,
        "Choose each person only once.",
      ),
    method: z.enum(["equal", "occupied-day"]),
  })
  .refine(
    (b) =>
      !isCalendarDate(b.startOn) ||
      !isCalendarDate(b.endOn) ||
      (dayNumber(b.endOn) - dayNumber(b.startOn) >= 1 &&
        dayNumber(b.endOn) - dayNumber(b.startOn) <= 366),
    {
      message: "A bill must cover 1–366 days. The end date is excluded.",
      path: ["endOn"],
    },
  );
export const BillSchema = BillInputSchema.safeExtend(metadata).strict();
export const WorkspaceSchema = z
  .object({
    households: z.array(HouseholdSchema).max(LIMITS.households),
    people: z.array(PersonSchema).max(LIMITS.households * LIMITS.people),
    bills: z.array(BillSchema).max(LIMITS.households * LIMITS.bills),
  })
  .strict();
export const BackupSchema = z
  .object({
    appId: z.literal("P01"),
    formatVersion: z.literal(1),
    exportedAt: z.string().datetime(),
    payload: WorkspaceSchema,
  })
  .strict();

export type Currency = z.infer<typeof CurrencySchema>;
export type Household = z.infer<typeof HouseholdSchema>;
export type Person = z.infer<typeof PersonSchema>;
export type Bill = z.infer<typeof BillSchema>;
export type WorkspaceData = z.infer<typeof WorkspaceSchema>;
export type StoredWorkspace = { revision: number; data: WorkspaceData };
export const emptyWorkspace = (): WorkspaceData => ({
  households: [],
  people: [],
  bills: [],
});
