"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BillBreakdown } from "./bill-breakdown";
import { SettlementTable, type SettlementResult } from "./settlement";
import { dateLabel } from "@/lib/dates";
import { money } from "@/lib/calculations";
import type { Household } from "@/lib/models";

export function Report({
  household,
  settlement,
  unsaved,
}: {
  household: Household;
  settlement: SettlementResult;
  unsaved: boolean;
}) {
  const [generatedAt] = useState(() => new Date().toISOString());
  return (
    <section className="report-view">
      <div className="section-heading no-print">
        <div>
          <h2>Your household report</h2>
          <p>Ready to share as a printout or PDF.</p>
        </div>
        <Button onClick={() => window.print()}>
          <Printer data-icon="inline-start" />
          Print / Save PDF
        </Button>
      </div>
      <article className="report-paper">
        <header className="report-header">
          <span className="report-wordmark">ProrateSplit</span>
          <p>Household settlement report</p>
          <h2>{household.name}</h2>
          <p>
            {settlement.bills.length}{" "}
            {settlement.bills.length === 1 ? "bill" : "bills"}{" "}
            <span aria-hidden="true">·</span> {household.currency}{" "}
            <span aria-hidden="true">·</span>{" "}
            {money(settlement.total, household.currency)} total
          </p>
          <p className="report-generated">
            Generated{" "}
            {new Date(generatedAt).toLocaleString("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
            })}{" "}
            ({Intl.DateTimeFormat().resolvedOptions().timeZone})
          </p>
          {unsaved && (
            <p className="unsaved-report">
              Not saved — this report includes changes held only in this tab.
            </p>
          )}
        </header>
        <h3>People and occupancy</h3>
        <div className="table-scroll">
          <table className="report-people">
            <thead>
              <tr>
                <th scope="col">Person</th>
                <th scope="col">Arrival (included)</th>
                <th scope="col">Departure (excluded)</th>
              </tr>
            </thead>
            <tbody>
              {settlement.people.map(({ person }) => (
                <tr key={person.id}>
                  <th scope="row">{person.displayName}</th>
                  <td>{dateLabel(person.arrivedOn)}</td>
                  <td>
                    {person.departedOn
                      ? dateLabel(person.departedOn)
                      : "Ongoing"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3>Settlement</h3>
        <SettlementTable
          settlement={settlement}
          currency={household.currency}
        />
        <h3>Bill calculations</h3>
        {settlement.bills.map((result) => (
          <BillBreakdown
            key={result.bill.id}
            bill={result.bill}
            result={result}
            people={settlement.people.map((p) => p.person)}
            currency={household.currency}
            expanded
          />
        ))}
        <footer className="report-notes">
          <p>
            <strong>Calculation policy:</strong> Arrival and billing starts are
            included. Departure and billing ends are excluded. Occupied-day
            bills split each day’s equal portion among selected people present
            that day. Equal splits ignore occupancy. Shares are rounded once
            using largest remainder, with stable person ID as the tie-break.
          </p>
          <p>
            All saved bills in this household are included in full; no
            partial-period filtering. Net owed = allocated costs − bills paid.
            Negative balances are receivable. This report explains an allocation
            and is not a legal settlement certificate.
          </p>
          <p>
            Self-initiated studio project by ConsoleLog Studio. Data stays in
            this browser; export a backup to keep a copy.
          </p>
        </footer>
      </article>
    </section>
  );
}
