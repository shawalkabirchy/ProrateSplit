import { money, type calculateSettlement } from "@/lib/calculations";
import type { Currency } from "@/lib/models";

export type SettlementResult = ReturnType<typeof calculateSettlement>;

export function SettlementTable({
  settlement,
  currency,
}: {
  settlement: SettlementResult;
  currency: Currency;
}) {
  return (
    <>
      <p className="table-scroll-hint no-print">
        Scroll for paid amounts and balances →
      </p>
      <div
        className="table-scroll"
        role="region"
        aria-label="Settlement amounts"
        tabIndex={0}
      >
        <table className="settlement-table">
          <thead>
            <tr>
              <th scope="col">Person</th>
              <th scope="col">Allocated share</th>
              <th scope="col">Amount paid</th>
              <th scope="col">Settlement</th>
            </tr>
          </thead>
          <tbody>
            {settlement.people.map((row, index) => (
              <tr key={row.person.id}>
                <th scope="row">
                  <span
                    className={`initial initial-${index % 6}`}
                    aria-hidden="true"
                  >
                    {row.person.displayName[0].toUpperCase()}
                  </span>
                  <span>{row.person.displayName}</span>
                </th>
                <td className="tabular">{money(row.allocated, currency)}</td>
                <td className="tabular">{money(row.paid, currency)}</td>
                <td className={`tabular ${row.net < 0 ? "receivable" : ""}`}>
                  {row.net < 0
                    ? `Receives ${money(-row.net, currency)}`
                    : row.net > 0
                      ? `Owes ${money(row.net, currency)}`
                      : "Settled up"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              <td className="tabular">{money(settlement.total, currency)}</td>
              <td className="tabular">{money(settlement.total, currency)}</td>
              <td className="tabular">
                Net{" "}
                {money(
                  settlement.people.reduce((sum, p) => sum + p.net, 0),
                  currency,
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}
