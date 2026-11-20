import type { CSSProperties, ReactNode } from "react";
import { allocateBill, calculateSettlement, money } from "@/lib/calculations";
import { dayNumber, dayString } from "@/lib/dates";
import { emptyWorkspace, type Bill, type WorkspaceData } from "@/lib/models";
import {
  appendSample,
  putBill,
  putHousehold,
  putPerson,
} from "@/lib/operations";

/*
  type: software (page type software, site-kind software)
  deal (taste-skill 2.5): hero centred · type outfit (Outfit + DM Mono) · palette: the client's own
  (start.mjs brand: #ffffff / #182239 / #4263eb) · nav nav-centre · footer footer-dark · close
  close-word · rhythm space · buttons solid · ground sage · mark: the client's ÷ logo
  effect: silk-folds in the hero window (gradient-mesh was dealt first and dealt again: at this
  frame's 4:1 its colour islands leave the corners black) · card ground: fluted-glass, the
  material family, held still (the setup cards)
  grounds: privacy bg-dots, questions bg-band
  moments: liquid-type on the #rounding statement. The centred hero's cursor-spotlight was dropped:
  liquid-type lists it in avoidWith and a page holds one pointer effect.
  Every amount below is computed at build time by the app's own calculation code
  (src/lib/calculations.ts) from synthetic households, never typed in by hand.
*/

const style = (vars: Record<string, string>) => vars as CSSProperties;

function Arrow() {
  return (
    <svg className="m-arrow" viewBox="0 0 12 12" aria-hidden="true">
      <path className="m-arrow__stem" d="M1 6h8" />
      <path className="m-arrow__head" d="M4.5 2.5 8 6l-3.5 3.5" />
    </svg>
  );
}

function Mark({ className = "ps-mark" }: { className?: string }) {
  return (
    <span className={className} aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="6" r="1.4" />
        <path d="M5 12h14" />
        <circle cx="12" cy="18" r="1.4" />
      </svg>
    </span>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="m4.5 8.2 2.3 2.3 4.7-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const usd = (minor: number) => money(minor, "USD");
const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("");
const first = (name: string) => name.split(" ")[0];
const short = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const day = (iso: string) => short.format(new Date(dayNumber(iso) * 86_400_000));
const lastDay = (endOn: string) => day(dayString(dayNumber(endOn) - 1));

/* Cedar House: the app's own sample (README, "Date and money policy") */
function cedarHouse() {
  const data = appendSample(emptyWorkspace());
  const result = calculateSettlement(data.households[0].id, data);
  const bill = result.bills[0];
  const rows = result.people.map((row) => {
    const arrived = dayNumber(row.person.arrivedOn);
    const start = Math.max(arrived, dayNumber(bill.bill.startOn));
    const days = dayNumber(bill.bill.endOn) - start;
    return {
      name: row.person.displayName,
      from: day(row.person.arrivedOn),
      days,
      offset: (start - dayNumber(bill.bill.startOn)) / bill.days,
      share: row.allocated,
      net: row.net,
    };
  });
  const payer = rows.find((r) => r.net < 0)!;
  const debtor = rows.find((r) => r.net > 0)!;
  return { bill, rows, payer, debtor, total: result.total };
}

/* Maple Flat: a second synthetic household for the workspace window, built through the app's own
   validated operations, so every share is the app's real output */
function mapleFlat() {
  let data: WorkspaceData = putHousehold(emptyWorkspace(), {
    name: "Maple Flat",
    currency: "USD",
  });
  const householdId = data.households[0].id;
  const person = (displayName: string, arrivedOn: string, departedOn?: string) => {
    data = putPerson(data, { householdId, displayName, arrivedOn, departedOn });
    return data.people.at(-1)!.id;
  };
  const priya = person("Priya Shah", "2026-09-01");
  const tom = person("Tom Reyes", "2026-09-01", "2026-11-15");
  const lena = person("Lena Ortiz", "2026-11-15");
  const months = [
    ["Sep", "2026-09-01", "2026-10-01"],
    ["Oct", "2026-10-01", "2026-11-01"],
    ["Nov", "2026-11-01", "2026-12-01"],
  ] as const;
  const bill = (
    title: string,
    amountMinor: number,
    [startOn, endOn]: readonly [string, string],
    payerId: string,
    method: Bill["method"],
    eligiblePersonIds: string[],
  ) => {
    data = putBill(data, {
      householdId,
      title,
      amountMinor,
      startOn,
      endOn,
      payerId,
      method,
      eligiblePersonIds,
    });
  };
  for (const [, startOn, endOn] of months) {
    const nov = startOn === "2026-11-01";
    const all = nov ? [priya, tom, lena] : [priya, tom];
    const power: number =
      ({ "2026-09-01": 9_600, "2026-10-01": 10_400 } as Record<string, number>)[startOn] ?? 9_000;
    bill("Rent", 240_000, [startOn, endOn], priya, "occupied-day", all);
    bill("Electricity", power, [startOn, endOn], nov ? priya : tom, "occupied-day", all);
    bill("Internet", 10_000, [startOn, endOn], priya, "equal", all);
  }
  const people = data.people;
  const name = (id: string) => people.find((p) => p.id === id)!.displayName;
  const label = (b: Bill) =>
    months.find(([, s]) => s === b.startOn)![0];
  const list = [...data.bills]
    .sort((a, b) => (a.startOn < b.startOn ? 1 : a.startOn > b.startOn ? -1 : 0))
    .map((b) => ({
      id: b.id,
      payer: name(b.payerId),
      title: `${b.title} · ${label(b)}`,
      method: b.method === "equal" ? "Equal" : "By days",
      amount: usd(b.amountMinor),
    }));
  const open = data.bills.find(
    (b) => b.title === "Rent" && b.startOn === "2026-11-01",
  )!;
  const allocation = allocateBill(open, people);
  const span = dayNumber(open.endOn) - dayNumber(open.startOn);
  const shares = people.map((p) => {
    const from = Math.max(dayNumber(p.arrivedOn), dayNumber(open.startOn));
    const to = Math.min(
      p.departedOn ? dayNumber(p.departedOn) : Infinity,
      dayNumber(open.endOn),
    );
    return {
      name: p.displayName,
      days: to - from,
      offset: (from - dayNumber(open.startOn)) / span,
      period: `${day(dayString(from))} – ${day(dayString(to - 1))}`,
      share: allocation.allocations[p.id] ?? 0,
      payer: p.id === open.payerId,
    };
  });
  const segments = allocation.segments.map((s) => ({
    period: `${day(s.startOn)} – ${day(dayString(dayNumber(s.endOn) - 1))}`,
    days: s.dayCount,
    who: s.personIds.map((id) => first(name(id))).join(" and "),
    perDay: usd(open.amountMinor / span),
  }));
  /* the rounding rule on November's internet: $100.00 shared equally by three, each share rounded
     once, the one cent left over to the largest remainder (ties by stable id), as the app does it */
  const internet = data.bills.find(
    (b) => b.title === "Internet" && b.startOn === "2026-11-01",
  )!;
  const split = allocateBill(internet, people);
  const each = internet.amountMinor / internet.eligiblePersonIds.length;
  const rounding = {
    amount: internet.amountMinor,
    payer: name(internet.payerId),
    exact: `$${(each / 100).toFixed(4)}${Number.isInteger(each) ? "" : "…"}`,
    rows: internet.eligiblePersonIds.map((id) => ({
      name: name(id),
      share: split.allocations[id],
      extra: split.allocations[id] > Math.floor(each),
    })),
  };
  const counts = {
    households: 3,
    bills: data.bills.length,
  };
  return {
    list,
    open,
    span,
    shares,
    segments,
    payer: name(open.payerId),
    counts,
    openId: open.id,
    rounding,
  };
}

const cedar = cedarHouse();
const maple = mapleFlat();

/* October 2026 starts on a Thursday: three September days lead the grid, November 1 closes it */
const october = [
  ...[28, 29, 30].map((d) => ({ d, out: true })),
  ...Array.from({ length: 31 }, (_, i) => ({ d: i + 1, out: false })),
  { d: 1, out: true },
];

const files: [string, string, string][] = [
  "2026-09-07", "2026-09-21", "2026-09-30", "2026-10-07", "2026-10-15",
  "2026-10-31", "2026-11-07", "2026-11-14", "2026-11-21", "2026-11-30",
].flatMap((date, i) => [
  [`proratesplit-backup-${date}.json`, "Backup", "json"],
  [
    `${["Maple Flat", "Maple Flat", "Maple Flat", "Cedar House", "Cedar House", "Cedar House", "Maple Flat", "Maple Flat", "Cedar House", "Maple Flat"][i]} ${short.format(new Date(dayNumber(date) * 86_400_000))}.pdf`,
    "Report",
    "pdf",
  ],
]) as [string, string, string][];

const nav = [
  ["Workspace", "#workspace"],
  ["Dates", "#dates"],
  ["Setup", "#setup"],
  ["Privacy", "#privacy"],
  ["Questions", "#questions"],
] as const;

const faq: [string, ReactNode][] = [
  [
    "Is the bill splitter free, and is there an account?",
    "It is free, with no account to make.",
  ],
  [
    "Where are my households stored?",
    "In this browser on this device. Clearing site data removes them.",
  ],
  [
    "How are move-out days counted on a bill?",
    "They are not. Someone leaving on October 17 last stayed on October 16.",
  ],
  [
    "Which currencies can a household use?",
    "US dollars or Bangladeshi taka, locked once the household has bills.",
  ],
  [
    "How do I move my households to another browser?",
    "Download a backup, then choose Restore in the other browser.",
  ],
  [
    "Can I try a what-if without changing my household?",
    "Yes. Duplicate the household and change dates in the copy.",
  ],
  [
    "Does the bill splitter collect or send payments?",
    "No. It shows who owes whom, and you settle up the way you usually do.",
  ],
];

export default function HomePage() {
  const { bill, rows, payer, debtor } = cedar;
  return (
    <>
      <header className="nav nav--centre">
        <div className="wrap nav__bar">
          <a className="skip-link" href="#top">
            Skip to content
          </a>
          <a className="nav__logo" href="#top">
            <Mark />
            <span className="ps-logo-word">ProrateSplit</span>
          </a>
          <nav className="nav__links" aria-label="Main">
            <div className="nav__item">
              <a className="nav__link" href="#workspace">
                Workspace{" "}
                <svg className="chev" viewBox="0 0 12 12" aria-hidden="true">
                  <path
                    d="M3 4.5l3 3 3-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
              <div className="nav__menu">
                <div className="wrap grid">
                  <div className="menu-col span-3">
                    <p className="t-label">Splitting</p>
                    <a href="#workspace">
                      Bills and shares<span>Every bill split by day</span>
                    </a>
                    <a href="#dates">
                      Move-in dates<span>Arrival counted, departure not</span>
                    </a>
                    <a href="#rounding">
                      Rounding<span>Shares always add up</span>
                    </a>
                  </div>
                  <div className="menu-col span-3">
                    <p className="t-label">Your data</p>
                    <a href="#privacy">
                      Backups<span>A JSON file you keep</span>
                    </a>
                    <a href="#privacy">
                      Reports<span>Print or save as PDF</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
            {nav.slice(1).map(([word, href]) => (
              <div className="nav__item" key={href}>
                <a className="nav__link" href={href}>
                  {word}
                </a>
              </div>
            ))}
          </nav>
          <div className="nav__actions">
            <a className="btn btn--primary" href="/app/#sample">
              Try a sample household
            </a>
          </div>
          <button
            className="nav__toggle"
            type="button"
            aria-expanded="false"
            aria-label="Menu"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path
                d="M2 5h14M2 13h14"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </header>

      <main id="top">
        <section className="hero hero--centred" aria-labelledby="hero-h">
          <div className="wrap">
            <div className="hero-text">
              <div className="hero__c">
                <a className="pill" href="#dates">
                  <span>
                    {first(debtor.name)} moves in {debtor.from}
                  </span>
                  <span className="muted ps-pill-more">
                    pays {usd(debtor.share)} of {usd(bill.bill.amountMinor)}
                  </span>
                </a>
                <h1 id="hero-h">Bill splitter for shared homes</h1>
                <p className="hero__lead">
                  Add who lived there and when, add each bill, and see who owes
                  whom, split to the day.
                </p>
                <div className="btn-row">
                  <a className="btn btn--primary" href="/app/#sample">
                    Try a sample household
                    <Arrow />
                  </a>
                  <a className="btn btn--secondary" href="/app/">
                    Create a household
                  </a>
                </div>
              </div>
              <div
                className="hero__window"
                data-fx="silk-folds"
                data-fx-seed="7"
              >
                <div className="ly-piece ui ui-pswin ps-win">
                  <p className="ps-sr">{`ProrateSplit splitting a ${usd(bill.bill.amountMinor)} electricity bill by the days each person was home: ${rows
                  .map((r) => `${r.name} ${usd(r.share)}`)
                  .join(", ")}. ${first(debtor.name)} owes ${first(payer.name)} ${usd(debtor.net)}.`}</p>
                  <div className="ps-win__bar" aria-hidden="true">
                    <span className="ps-win__dots">
                      <i />
                      <i />
                      <i />
                    </span>
                    <span>
                      <b>Cedar House</b> · Add bill
                    </span>
                    <span className="ps-sp" />
                    <span>USD</span>
                  </div>
                  <div className="ps-win__body">
                    <div className="ps-people" aria-hidden="true">
                      <span className="ps-people__head">People</span>
                      {rows.map((r, i) => (
                        <span className="ps-person" key={r.name}>
                          <i className={`ps-init ps-init--${i}`}>{initials(r.name)}</i>
                          <b>{r.name}</b>
                          <span>From {r.from}</span>
                        </span>
                      ))}
                    </div>
                    <div className="ps-split" data-ly-steps="900" aria-hidden="true">
                      <div className="ps-billrow">
                        <span className="ps-billrow__ico">
                          <svg viewBox="0 0 16 16" aria-hidden="true">
                            <path d="M9 1.5 3.5 9H8l-1 5.5L12.5 7H8z" />
                          </svg>
                        </span>
                        <span>
                          <b>{bill.bill.title}</b>
                          {day(bill.bill.startOn)} – {lastDay(bill.bill.endOn)} · {bill.days} days
                        </span>
                        <strong>{usd(bill.bill.amountMinor)}</strong>
                      </div>
                      <div className="ps-alloc" data-step>
                        {rows.map((r, i) => (
                          <div className="ps-alloc__row" key={r.name}>
                            <span>
                              {first(r.name)} <small>{r.days} days</small>
                            </span>
                            <span className="ps-track">
                              <i
                                className={`ps-bar ps-bar--${i}`}
                                style={style({
                                  "--from": `${r.offset * 100}%`,
                                })}
                              />
                            </span>
                            <b>{usd(r.share)}</b>
                          </div>
                        ))}
                      </div>
                      <div className="ps-acts" data-step>
                        <span>Save bill</span>
                        <span>Edit</span>
                        <em>
                          {first(debtor.name)} owes {first(payer.name)}{" "}
                          {usd(debtor.net)}
                        </em>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="workspace" aria-labelledby="workspace-h">
          <div className="wrap">
            <div className="grid">
              <h2 className="span-6" id="workspace-h">
                Bills and shares for each household
              </h2>
              <div className="span-6 start-7 stack-4">
                <p className="t-lead">
                  Pick a household and its bills line up by month. Open one to
                  see who was home on which days and the share that follows.
                </p>
                <a className="link" href="#dates">
                  See the dates
                </a>
              </div>
            </div>
            <div
              className="ui app fill"
              role="img"
              aria-label={`The Maple Flat household in ProrateSplit: ${maple.counts.bills} bills from September to November 2026. November rent of ${usd(maple.open.amountMinor)} is open, split by occupied days: ${maple.shares
                .map((s) => `${s.name} ${usd(s.share)} for ${s.days} days`)
                .join(", ")}.`}
              data-ui-pause-host
            >
              <div className="app__pane app__pane--list" aria-hidden="true">
                <div
                  className="ui ui-panel ui-win"
                  data-ui="window"
                  data-open="Unsplit"
                  data-work="Splitting"
                  data-done="Split"
                >
                  <div className="ui-win__bar">
                    <span className="ui-dots" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </span>
                    <span className="ui-win__crumb">
                      <Mark className="ps-mark ps-mark--crumb" />
                      Maple Flat <i>/</i> <b>Bills</b>
                    </span>
                    <span className="ui-spacer" />
                    <span className="ui-win__search" aria-hidden="true">
                      <svg className="ui-icon" viewBox="0 0 16 16">
                        <circle cx="7" cy="7" r="4.5" />
                        <path d="m10.5 10.5 3 3" />
                      </svg>
                      <span className="ui-win__ph">Search bills</span>
                    </span>
                  </div>
                  <div className="ui-win__body">
                    <nav className="ui-win__side" aria-hidden="true">
                      <span className="ui-win__nav is-on">
                        Bills<em>{maple.counts.bills}</em>
                      </span>
                      <span className="ui-win__nav">
                        People<em>{maple.shares.length}</em>
                      </span>
                      <span className="ui-win__nav">Overview</span>
                      <span className="ui-win__nav">Report</span>
                      <span className="ui-win__label">Households</span>
                      <span className="ui-win__nav">
                        <span className="ui-win__hash">#</span>Cedar
                      </span>
                      <span className="ui-win__nav">
                        <span className="ui-win__hash">#</span>Maple
                      </span>
                    </nav>
                    <div className="ui-win__main">
                      <div className="ui-win__cols" aria-hidden="true">
                        <span>Paid by</span>
                        <span>Bill</span>
                        <span>Split</span>
                        <span>Amount</span>
                      </div>
                      <ul className="ui-win__rows">
                        {maple.list.map((row) => (
                          <li
                            className={`ui-win__row${row.id === maple.openId ? " is-sel" : ""}`}
                            data-row
                            key={row.id}
                          >
                            <span
                              className="ui-avatar"
                              data-tone={
                                row.payer.startsWith("Priya")
                                  ? "1"
                                  : row.payer.startsWith("Tom")
                                    ? "3"
                                    : "4"
                              }
                            >
                              {initials(row.payer)}
                            </span>
                            <span className="ui-win__who">{row.payer}</span>
                            <span className="ui-win__sub">{row.title}</span>
                            <span
                              className={`ui-win__st${row.method === "Equal" ? " is-done" : ""}`}
                              data-st
                            >
                              {row.method}
                            </span>
                            <span className="ui-win__age">{row.amount}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              <div className="app__pane app__pane--open" aria-hidden="true">
                <div className="ui ui-panel ps-bill">
                  <div className="ps-bill__head">
                    <div>
                      <span className="ps-bill__eyebrow">Maple Flat · Nov 2026</span>
                      <b>Rent</b>
                    </div>
                    <strong>{usd(maple.open.amountMinor)}</strong>
                  </div>
                  <div className="ps-bill__meta">
                    <span>Nov 1 – 30</span>
                    <span>{maple.span} days</span>
                    <span>Split by occupied days</span>
                    <span>Paid by {maple.payer}</span>
                  </div>
                  <div className="ps-bill__scale" aria-hidden="true">
                    <span>Nov 1</span>
                    <span>Nov 15</span>
                    <span>Nov 30</span>
                  </div>
                  <ul className="ps-bill__people">
                    {maple.shares.map((s, i) => (
                      <li key={s.name}>
                        <span className={`ui-avatar`} data-tone={["1", "3", "4"][i]}>
                          {initials(s.name)}
                        </span>
                        <span className="ps-bill__who">
                          <b>{s.name}</b>
                          <small>
                            {s.period} · {s.days} days
                          </small>
                        </span>
                        <span className="ps-track ps-track--wide">
                          <i
                            className={`ps-bar ps-bar--m${i}`}
                            style={style({
                              "--from": `${s.offset * 100}%`,
                              "--to": `${(1 - s.offset - s.days / maple.span) * 100}%`,
                            })}
                          />
                        </span>
                        <b className="ps-bill__share">{usd(s.share)}</b>
                      </li>
                    ))}
                  </ul>
                  <div className="ps-bill__segs">
                    <span className="ps-bill__label">Day by day</span>
                    {maple.segments.map((s) => (
                      <div key={s.period}>
                        <span>{s.period}</span>
                        <span>
                          {s.who} · {s.days} days at {s.perDay} a day
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="ps-bill__owe">
                    <span className="ps-bill__label">Balances on this bill</span>
                    {maple.shares
                      .filter((s) => !s.payer)
                      .map((s) => (
                        <div key={s.name}>
                          <span>
                            {first(s.name)} owes {first(maple.payer)}
                          </span>
                          <b>{usd(s.share)}</b>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section g2m" id="dates" aria-labelledby="dates-h">
          <div className="wrap grid">
              <div className="span-6 stack-6">
                <h2 id="dates-h">Counts the days each person was home</h2>
                <p className="t-lead">
                  The day someone moves in counts and the day they leave does
                  not, so an October bill runs from October 1 to November 1.
                </p>
                <ul className="ps-facts">
                  <li>Bills of 1 to 366 days</li>
                  <li>Up to 20 people in a household</li>
                  <li>Equal shares when the days don’t matter</li>
                </ul>
                <a className="link" href="#rounding">
                  See the rounding
                </a>
              </div>
              <div className="frame frame--split frame--lit frame--fill span-6 start-7">
                <div className="stage">
                  <div
                    className="at-rise fit"
                    style={style({
                      "--fit-max": "440px",
                      "--ax": "max(48px, 50% - 220px)",
                      "--ay": "48px",
                    })}
                    data-ui-loop
                  >
                    <div
                      className="ui ui-panel ui-calendar"
                      data-ui="calendar"
                      data-start="16"
                      data-end="30"
                      data-month="Oct"
                      role="img"
                      aria-label="October 2026: Alice is home all month, Ben from October 16 to 30. The bill ends on October 31, which is not counted."
                    >
                      <div className="ui-cal__head">
                        <div className="ui-cal__month">
                          October <span>2026</span>
                        </div>
                        <span className="ui-spacer" />
                        <span
                          className="ui-chip ui-chip--plain ui-chip--ink"
                          data-cal-range
                        >
                          Oct 16 – 30
                        </span>
                      </div>
                      <div className="ui-cal__dow" aria-hidden="true">
                        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
                          <span key={d}>{d}</span>
                        ))}
                      </div>
                      <div className="ui-cal__days" aria-hidden="true">
                        {october.map(({ d, out }, i) => (
                          <span
                            key={i}
                            className={[
                              "ui-cal__d",
                              out && "is-out",
                              !out && d === 16 && "is-start",
                              !out && d > 16 && d < 30 && "is-in",
                              !out && d === 30 && "is-end",
                              !out && d === 1 && "is-mark",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            data-d={out ? undefined : String(d)}
                          >
                            <b>{d}</b>
                          </span>
                        ))}
                      </div>
                      <div className="ui-cal__events" aria-hidden="true">
                        <div className="ui-cal__ev" data-ev="1">
                          <span className="ui-cal__date">
                            <b>1</b>
                            <i>Oct</i>
                          </span>
                          <span className="ui-cal__evtext">
                            <span className="ui-cal__evtitle">Alice moves in</span>
                            <span className="ui-cal__evsub">
                              Counted from her first day
                            </span>
                          </span>
                        </div>
                        <div className="ui-cal__ev" data-ev="16">
                          <span className="ui-cal__date">
                            <b>16</b>
                            <i>Oct</i>
                          </span>
                          <span className="ui-cal__evtext">
                            <span className="ui-cal__evtitle">Ben moves in</span>
                            <span className="ui-cal__evsub">
                              {rows[1].days} days on the electricity bill
                            </span>
                          </span>
                        </div>
                        <div className="ui-cal__ev" data-ev="31">
                          <span className="ui-cal__date">
                            <b>31</b>
                            <i>Oct</i>
                          </span>
                          <span className="ui-cal__evtext">
                            <span className="ui-cal__evtitle">Bill period ends</span>
                            <span className="ui-cal__evsub">
                              The end date is not counted
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
          </div>
        </section>

        <section
          className="section ps-statement"
          id="rounding"
          aria-labelledby="rounding-h"
        >
          <div className="wrap">
            <div className="section-head">
              <h2 id="rounding-h" data-moment="liquid-type">
                Every bill shared to the cent
              </h2>
              <p className="t-lead">
                Each day’s cost is shared first, then rounded once per person,
                so the shares always add up to the bill.
              </p>
            </div>
            <div className="frame frame--lit fill">
              <div className="stage stage--fade-b">
                <div
                  className="at-rise fit"
                  style={style({
                    "--fit-max": "720px",
                    "--ax": "max(32px, 50% - 360px)",
                    "--ay": "48px",
                    "--ay-sm": "32px",
                  })}
                >
                  <div
                    className="ui ui-panel ps-round"
                    role="img"
                    aria-label={`Maple Flat's November internet bill of ${usd(maple.rounding.amount)} shared equally by three: ${maple.rounding.rows
                      .map((r) => `${r.name} ${usd(r.share)}`)
                      .join(", ")}. The cent left over goes to one person, so the shares add up to the bill.`}
                  >
                    <div className="ps-round__head" aria-hidden="true">
                      <b>Internet · Nov</b>
                      <span>
                        {usd(maple.rounding.amount)} · equal split · paid by{" "}
                        {first(maple.rounding.payer)}
                      </span>
                    </div>
                    <div className="ps-round__cols" aria-hidden="true">
                      <span>Person</span>
                      <span>Exact share</span>
                      <span>Rounded</span>
                    </div>
                    <ul className="ps-round__rows" aria-hidden="true">
                      {maple.rounding.rows.map((r, i) => (
                        <li key={r.name}>
                          <span className="ui-avatar" data-tone={["1", "3", "4"][i]}>
                            {initials(r.name)}
                          </span>
                          <b>{r.name}</b>
                          <span className="ps-round__exact">{maple.rounding.exact}</span>
                          <span className="ps-round__share">
                            {r.extra && <em>+1¢</em>}
                            {usd(r.share)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="ps-round__total" aria-hidden="true">
                      <span>Total</span>
                      <b>{usd(maple.rounding.rows.reduce((t, r) => t + r.share, 0))}</b>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="setup" aria-labelledby="setup-h">
          <div className="wrap">
            <div className="section-head">
              <h2 id="setup-h">Set up a household in 3 steps</h2>
            </div>
            <div className="grid ps-steps">
              <article className="card card--row card--open span-4 m-nolift">
                <span className="step-num">1</span>
                <h3>Add the people and dates</h3>
                <p>
                  Enter each person with the day they moved in, and the day
                  they left if they did.
                </p>
                <div
                  className="panel"
                  data-fx="fluted-glass"
                  data-fx-seed="21"
                  data-fx-palette='{"bg":"#cdd6c6","surface":"#dce3d6","ink":"#262d24","accent":"#6c8e63"}'
                  data-fx-params='{"speed":0,"calmY":0.9}'
                >
                  <div className="stage stage--fade-b">
                    <div
                      className="at-rise fit"
                      style={style({ "--fit-max": "340px", "--ax": "32px", "--ay": "40px" })}
                      data-ui-loop
                    >
                      <div className="ui ui-panel ui-checks" data-ui="checklist">
                        <div className="ui-checks__head">
                          <div className="ui-title">Cedar House setup</div>
                          <span className="ui-spacer" />
                          <div className="ui-meta" data-checks-count>
                            2 of 4
                          </div>
                        </div>
                        <div className="ui-checks__bar">
                          <i data-checks-bar style={style({ "--k": "0.5" })} />
                        </div>
                        <ul className="ui-checks__list">
                          {[
                            ["Name the household", true],
                            ["Choose USD or BDT", true],
                            ["Add Alice Morgan, from Oct 1", false],
                            ["Add Ben Parker, from Oct 16", false],
                          ].map(([label, done]) => (
                            <li
                              className={`ui-check${done ? " is-done" : ""}`}
                              key={String(label)}
                            >
                              <span className="ui-check__box">
                                <svg viewBox="0 0 16 16">
                                  <path d="m4.5 8.2 2.3 2.3 4.7-5" />
                                </svg>
                              </span>
                              <span className="ui-check__label">{label}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
              <article className="card card--row card--open span-4 m-nolift">
                <span className="step-num">2</span>
                <h3>Add each bill and its split</h3>
                <p>
                  Choose who shares it and whether it splits by days at home or
                  in equal parts.
                </p>
                <div
                  className="panel"
                  data-fx="fluted-glass"
                  data-fx-seed="34"
                  data-fx-palette='{"bg":"#cdd6c6","surface":"#dce3d6","ink":"#262d24","accent":"#6c8e63"}'
                  data-fx-params='{"speed":0,"calmY":0.9}'
                >
                  <div className="stage stage--fade-b">
                    <div
                      className="at-right to-edge"
                      style={style({ "--ax": "32px", "--ay": "56px" })}
                    >
                      <div className="ui ui-panel ui-toggles" data-ui="toggles">
                        <div className="ui-head">
                          <svg
                            className="ui-icon ui-toggles__ico"
                            viewBox="0 0 16 16"
                            aria-hidden="true"
                          >
                            <path d="M9 1.5 3.5 9H8l-1 5.5L12.5 7H8z" />
                          </svg>
                          <div className="ui-title">Electricity, October</div>
                          <span className="ui-spacer" />
                          <div className="ui-meta" data-tg-count>
                            3 of 3 on
                          </div>
                        </div>
                        <ul className="ui-toggles__list">
                          {[
                            ["Split by days at home", "Off: equal shares", true],
                            ["Alice Morgan shares it", "Home Oct 1 – 30", true],
                            ["Ben Parker shares it", "Home Oct 16 – 30", true],
                          ].map(([label, sub, on]) => (
                            <li className="ui-tg" key={String(label)}>
                              <span className="ui-tg__text">
                                <span className="ui-tg__label">{label}</span>
                                <span className="ui-tg__sub">{sub}</span>
                              </span>
                              <button
                                className={`ui-switch${on ? " is-on" : ""}`}
                                type="button"
                                role="switch"
                                aria-checked={on ? "true" : "false"}
                                aria-label={String(label)}
                                tabIndex={-1}
                              >
                                <i />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
              <article className="card card--row card--open span-4 m-nolift">
                <span className="step-num">3</span>
                <h3>Read each share and balance</h3>
                <p>
                  See each person’s share, what they paid and the balance, ready
                  to print.
                </p>
                <div
                  className="panel"
                  data-fx="fluted-glass"
                  data-fx-seed="55"
                  data-fx-palette='{"bg":"#cdd6c6","surface":"#dce3d6","ink":"#262d24","accent":"#6c8e63"}'
                  data-fx-params='{"speed":0,"calmY":0.9}'
                >
                  <div className="stage stage--fade-b">
                    <div
                      className="at-rise fit"
                      style={style({
                        "--fit-max": "380px",
                        "--ax": "32px",
                        "--ay": "calc(100% - 180px)",
                        "--ay-sm": "calc(100% - 180px)",
                      })}
                    >
                      <div className="ui ui-notify" data-ui="notify">
                        <ul className="ui-notify__list" data-notify-list>
                          <li className="ui-note">
                            <span className="ui-avatar ui-note__av" data-tone="3">
                              BP
                            </span>
                            <span className="ui-note__text">
                              <span className="ui-note__title">
                                Ben owes Alice {usd(debtor.net)}
                                <time>now</time>
                              </span>
                              <span className="ui-note__body">
                                Electricity, Oct 1 – 30
                              </span>
                            </span>
                          </li>
                          <li className="ui-note">
                            <span className="ui-note__ico">
                              <svg className="ui-icon" viewBox="0 0 16 16">
                                <path d="m3.5 8.4 2.8 2.8 6.2-6.4" />
                              </svg>
                            </span>
                            <span className="ui-note__text">
                              <span className="ui-note__title">
                                Saved on this device<time>1m</time>
                              </span>
                              <span className="ui-note__body">
                                Cedar House, 2 people, 1 bill
                              </span>
                            </span>
                          </li>
                          <li className="ui-note">
                            <span className="ui-avatar ui-note__av" data-tone="1">
                              AM
                            </span>
                            <span className="ui-note__text">
                              <span className="ui-note__title">
                                Alice receives {usd(-payer.net)}
                                <time>1m</time>
                              </span>
                              <span className="ui-note__body">
                                Paid {usd(bill.bill.amountMinor)}, share{" "}
                                {usd(payer.share)}
                              </span>
                            </span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="section bg-dots" id="privacy" aria-labelledby="privacy-h">
          <div className="wrap">
            <div className="grid fill">
              <div className="span-6 stack-6">
                <h2 id="privacy-h">Your households stay in this browser</h2>
                <p className="t-lead">
                  Nothing is uploaded and there is no account. Download a
                  backup file whenever you like, restore it in another browser,
                  or print a report.
                </p>
                <ul className="ps-facts">
                  <li>Restore checks a backup before it replaces anything</li>
                  <li>Print or save a PDF from the Report tab</li>
                  <li>No analytics and no cloud sync</li>
                </ul>
                <a className="link" href="#questions">
                  Read the questions
                </a>
              </div>
              <div className="frame frame--split frame--lit frame--fill span-6 start-7">
                <div className="stage stage--fade-br">
                  <div
                    className="at-corner wide"
                    style={style({ "--w": "680px", "--ax": "56px", "--ay": "56px" })}
                  >
                    <div
                      className="ui ui-files"
                      data-ui="files"
                      data-reading="Checking {n} of {total}"
                      role="img"
                      aria-label="Backup files in JSON and reports in PDF, saved on this device"
                    >
                      <div className="ui-files__status">
                        <span className="ui-dot" />
                        <span data-files-status>{files.length} files saved on this device</span>
                      </div>
                      <ul className="ui-files__grid" aria-hidden="true">
                        {files.map(([file, kind, icon]) => (
                          <li className="ui-file is-done" key={file}>
                            <span className="ui-file__icon">
                              {/* eslint-disable-next-line @next/next/no-img-element -- a 1 KB local SVG icon */}
                              <img
                                data-icon={icon}
                                src={`/assets/icons/${icon}.svg`}
                                alt=""
                                width={40}
                                height={40}
                                loading="lazy"
                                decoding="async"
                              />
                            </span>
                            <span className="ui-file__name">{file}</span>
                            <span className="ui-file__kind">{kind}</span>
                            <span className="ui-file__bar">
                              <i />
                            </span>
                            <span className="ui-file__check">
                              <Check />
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section bg-band" id="questions" aria-labelledby="questions-h">
          <div className="wrap">
            <div className="grid grid--top">
              <div className="span-6 stack-4">
                <h2 id="questions-h">Questions</h2>
                <p className="t-lead">About data, dates and money.</p>
                <a className="link" href="#privacy">
                  See the backups
                </a>
              </div>
              <div className="faq span-6 start-7">
                {faq.map(([q, a]) => (
                  <div className="faq__item" key={q}>
                    <h3>{q}</h3>
                    <p>{a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer
        className="footer closing footer--dark ground-inverse"
        id="contact"
        aria-labelledby="close-h"
      >
        <div className="wrap">
          <div className="closing__cta close--word">
            <div className="section-head--split">
              <div>
                <h2 id="close-h">Split this month’s shared bills</h2>
                <p className="t-lead">
                  Load the sample household and change a date to watch the
                  shares move.
                </p>
              </div>
              <a className="btn btn--primary" href="/app/#sample">
                Try a sample household
                <Arrow />
              </a>
            </div>
            <p className="close__word" aria-hidden="true">
              ProrateSplit
            </p>
          </div>
          <div className="closing__links">
            <div className="grid">
              <div className="span-6 stack-5">
                <a className="nav__logo" href="#top">
                  <Mark />
                  ProrateSplit
                </a>
                <p className="footer__lede">A fair split. Down to the day.</p>
              </div>
              <div className="span-3 start-7 footer__col">
                <h3 className="ps-foot-h">Product</h3>
                <ul>
                  {nav.slice(0, 3).map(([word, href]) => (
                    <li key={href}>
                      <a href={href}>{word}</a>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="span-3 footer__col">
                <h3 className="ps-foot-h">Data</h3>
                <ul>
                  {nav.slice(3).map(([word, href]) => (
                    <li key={href}>
                      <a href={href}>{word}</a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="footer__legal">
              <span>© 2026 ProrateSplit</span>
              <span>
                A self-initiated studio project by{" "}
                <a href="https://consolelog.studio/">ConsoleLog Studio</a>
              </span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
