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
      <div className="table-scroll" role="region" aria-label="Settlement amounts">
        {/* explicit roles: the phone layout changes the rows' display, which can drop native table semantics */}
        <table className="settlement-table" role="table">
          <thead role="rowgroup">
            <tr role="row">
              <th scope="col" role="columnheader">Person</th>
              <th scope="col" role="columnheader">Allocated share</th>
              <th scope="col" role="columnheader">Amount paid</th>
              <th scope="col" role="columnheader">Settlement</th>
            </tr>
          </thead>
          <tbody role="rowgroup">
            {settlement.people.map((row, index) => (
              <tr role="row" key={row.person.id}>
                <th scope="row" role="rowheader">
                  <span
                    className={`initial initial-${index % 6}`}
                    aria-hidden="true"
                  >
                    {row.person.displayName[0].toUpperCase()}
                  </span>
                  <span>{row.person.displayName}</span>
                </th>
                <td role="cell" data-label="Share" className="tabular">{money(row.allocated, currency)}</td>
                <td role="cell" data-label="Paid" className="tabular">{money(row.paid, currency)}</td>
                <td role="cell" data-label="Balance" className={`tabular ${row.net < 0 ? "receivable" : ""}`}>
                  {row.net < 0
                    ? `Receives ${money(-row.net, currency)}`
                    : row.net > 0
                      ? `Owes ${money(row.net, currency)}`
                      : "Settled up"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot role="rowgroup">
            <tr role="row">
              <th scope="row" role="rowheader">Total</th>
              <td role="cell" className="tabular">{money(settlement.total, currency)}</td>
              <td role="cell" className="tabular">{money(settlement.total, currency)}</td>
              <td role="cell" className="tabular">
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
