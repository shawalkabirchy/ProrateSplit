"use client";
import {
  CalendarDays,
  Copy,
  Plus,
  ReceiptText,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BillBreakdown } from "./bill-breakdown";
import { SettlementTable, type SettlementResult } from "./settlement";
import type { Modal } from "./workspace";
import { dateLabel } from "@/lib/dates";
import { money } from "@/lib/calculations";
import { LIMITS, type Household } from "@/lib/models";

type SectionProps = {
  settlement: SettlementResult;
  busy: boolean;
  openModal: (modal: Modal, trigger?: HTMLElement) => void;
};

export function OverviewSection({
  household,
  settlement,
  busy,
  openModal,
  canDuplicate,
}: SectionProps & { household: Household; canDuplicate: boolean }) {
  return (
    <>
      <section className="summary-band" aria-label="Household summary">
        <div>
          <ReceiptText aria-hidden="true" />
          <span>
            <small>Total bills</small>
            <strong className="tabular">
              {money(settlement.total, household.currency)}
            </strong>
          </span>
        </div>
        <div>
          <Users aria-hidden="true" />
          <span>
            <strong>
              {settlement.people.length}{" "}
              {settlement.people.length === 1 ? "person" : "people"}
            </strong>
            <small>In this household</small>
          </span>
        </div>
        <div>
          <CalendarDays aria-hidden="true" />
          <span>
            <strong>
              {settlement.bills.length === 1
                ? `${settlement.bills[0].days}-day bill`
                : `${settlement.bills.length} bills`}
            </strong>
            <small>
              {settlement.bills.length === 1
                ? "Start included · end excluded"
                : "In this scenario"}
            </small>
          </span>
        </div>
      </section>
      <section className="content-panel settlement-panel">
        <div className="section-heading">
          <div>
            <h2>Everyone’s share</h2>
            <p>
              Allocated costs, amounts paid, and who owes or receives the
              difference.
            </p>
          </div>
        </div>
        {settlement.people.length ? (
          <SettlementTable
            settlement={settlement}
            currency={household.currency}
          />
        ) : (
          <div className="inline-empty">
            <p>Add the people who live here to start calculating.</p>
            <Button
              onClick={(event) =>
                openModal({ type: "person" }, event.currentTarget)
              }
              disabled={busy}
            >
              <Plus data-icon="inline-start" />
              Add a person
            </Button>
          </div>
        )}
      </section>
      <section className="content-panel">
        <div className="section-heading">
          <h2>Bill breakdown</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={(event) =>
              openModal({ type: "bill" }, event.currentTarget)
            }
            disabled={
              busy ||
              !settlement.people.length ||
              settlement.bills.length >= LIMITS.bills
            }
          >
            <Plus data-icon="inline-start" />
            Add bill
          </Button>
        </div>
        {settlement.bills.length ? (
          settlement.bills.map((result) => (
            <BillBreakdown
              key={result.bill.id}
              bill={result.bill}
              result={result}
              people={settlement.people.map((p) => p.person)}
              currency={household.currency}
            />
          ))
        ) : (
          <p className="muted-copy">
            {settlement.people.length
              ? "Add your first bill to see everyone’s share. Nothing is allocated until you save a bill."
              : "Add people first, then record a bill and who paid it."}
          </p>
        )}
      </section>
      <div className="overview-notes">
        <div>
          <span className="note-icon">
            <CalendarDays aria-hidden="true" />
          </span>
          <div>
            <h3>Date rules</h3>
            <p>Arrival included. Departure excluded.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={(event) =>
            openModal({ type: "duplicate" }, event.currentTarget)
          }
          disabled={busy || !canDuplicate}
        >
          <span className="note-icon purple-note">
            <Copy aria-hidden="true" />
          </span>
          <span>
            <strong>Save a what-if copy</strong>
            <small>
              Try another move-out date without changing this household.
            </small>
          </span>
        </button>
      </div>
    </>
  );
}

export function PeopleSection({ settlement, busy, openModal }: SectionProps) {
  return (
    <>
      <section className="content-panel">
        <div className="section-heading">
          <div>
            <h2>People & occupancy</h2>
            <p>
              One stay per person. Arrival is included; departure is excluded.
            </p>
          </div>
          <Button
            onClick={(event) =>
              openModal({ type: "person" }, event.currentTarget)
            }
            disabled={busy || settlement.people.length >= LIMITS.people}
          >
            <Plus data-icon="inline-start" />
            Add person
          </Button>
        </div>
        {settlement.people.length ? (
          <div className="people-list">
            {settlement.people.map(({ person }, index) => (
              <div className="person-row" key={person.id}>
                <span
                  className={`initial initial-${index % 6}`}
                  aria-hidden="true"
                >
                  {person.displayName[0].toUpperCase()}
                </span>
                <div className="person-details">
                  <h3>{person.displayName}</h3>
                  <p>
                    {dateLabel(person.arrivedOn)}{" "}
                    <span aria-hidden="true">→</span>{" "}
                    {person.departedOn
                      ? `${dateLabel(person.departedOn)} (excluded)`
                      : "Ongoing stay"}
                  </p>
                </div>
                <div className="row-actions">
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={`Edit ${person.displayName}`}
                    onClick={(event) =>
                      openModal(
                        { type: "person", record: person },
                        event.currentTarget,
                      )
                    }
                    disabled={busy}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${person.displayName}`}
                    onClick={(event) =>
                      openModal(
                        { type: "delete-person", record: person },
                        event.currentTarget,
                      )
                    }
                    disabled={busy}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted-copy">
            No people yet. Add the first person above.
          </p>
        )}
      </section>
    </>
  );
}

export function BillsSection({
  household,
  settlement,
  busy,
  openModal,
}: SectionProps & { household: Household }) {
  return (
    <>
      <section className="content-panel">
        <div className="section-heading">
          <div>
            <h2>Shared bills</h2>
            <p>Record the full amount, who paid, and how it should be split.</p>
          </div>
          <Button
            onClick={(event) =>
              openModal({ type: "bill" }, event.currentTarget)
            }
            disabled={
              busy ||
              !settlement.people.length ||
              settlement.bills.length >= LIMITS.bills
            }
          >
            <Plus data-icon="inline-start" />
            Add bill
          </Button>
        </div>
        {!settlement.people.length && (
          <p className="muted-copy">
            Add a person in the People tab before creating a bill.
          </p>
        )}
        {settlement.bills.map((result) => (
          <div className="editable-bill" key={result.bill.id}>
            <BillBreakdown
              bill={result.bill}
              result={result}
              people={settlement.people.map((p) => p.person)}
              currency={household.currency}
            />
            <div className="bill-row-actions">
              <Button
                variant="outline"
                size="sm"
                onClick={(event) =>
                  openModal(
                    { type: "bill", record: result.bill },
                    event.currentTarget,
                  )
                }
                disabled={busy}
                aria-label={`Edit ${result.bill.title}`}
              >
                Edit bill
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(event) =>
                  openModal(
                    { type: "delete-bill", record: result.bill },
                    event.currentTarget,
                  )
                }
                disabled={busy}
                aria-label={`Delete ${result.bill.title}`}
              >
                <Trash2 data-icon="inline-start" />
                Delete
              </Button>
            </div>
          </div>
        ))}
        {!settlement.bills.length && !!settlement.people.length && (
          <p className="muted-copy">
            No bills yet. Add a bill to preview and save its allocation.
          </p>
        )}
      </section>
    </>
  );
}
