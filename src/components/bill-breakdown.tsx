import { Zap } from "lucide-react";
import { money, type BillAllocation } from "@/lib/calculations";
import { periodLabel } from "@/lib/dates";
import type { Bill, Currency, Person } from "@/lib/models";

export function BillBreakdown({
  bill,
  result,
  people,
  currency,
  expanded = false,
}: {
  bill: Bill;
  result: BillAllocation;
  people: Person[];
  currency: Currency;
  expanded?: boolean;
}) {
  const payer = people.find((p) => p.id === bill.payerId);
  return (
    <details className="bill-breakdown" open={expanded || undefined}>
      <summary>
        <span className="bill-symbol">
          <Zap aria-hidden="true" size={19} />
        </span>
        <span className="bill-summary-copy">
          <strong>{bill.title}</strong>
          <small>
            {periodLabel(bill.startOn, bill.endOn)}{" "}
            <span aria-hidden="true">·</span>{" "}
            {bill.method === "equal" ? "Equal split" : "Occupied-day split"}
          </small>
        </span>
        <strong className="bill-summary-amount tabular">
          {money(bill.amountMinor, currency)}
        </strong>
        <span className="bill-expand">
          Details <span aria-hidden="true">⌄</span>
        </span>
      </summary>
      <div className="bill-details">
        <p>
          Paid by <strong>{payer?.displayName}</strong>. {result.days} calendar{" "}
          {result.days === 1 ? "day" : "days"}; start included, end excluded.
        </p>
        {bill.method === "equal" ? (
          <p>
            Equal shares among selected people. Occupancy dates do not affect
            this bill.
          </p>
        ) : (
          <div className="allocation-segments">
            {result.segments.map((segment) => (
              <p key={segment.startOn}>
                <strong>{periodLabel(segment.startOn, segment.endOn)}</strong>
                <span>
                  {segment.dayCount} {segment.dayCount === 1 ? "day" : "days"}{" "}
                  shared by{" "}
                  {segment.personIds
                    .map((id) => people.find((p) => p.id === id)?.displayName)
                    .join(", ")}
                </span>
              </p>
            ))}
          </div>
        )}
        <div className="allocation-shares">
          {people
            .filter((p) => bill.eligiblePersonIds.includes(p.id))
            .map((p) => (
              <span key={p.id}>
                {p.displayName}
                <strong className="tabular">
                  {money(result.allocations[p.id] ?? 0, currency)}
                </strong>
              </span>
            ))}
        </div>
        <p className="rounding-note">
          Exact shares are rounded once per person. Remaining cents go to the
          largest fractional shares, with ties resolved by stable person ID.
        </p>
      </div>
    </details>
  );
}
