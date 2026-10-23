import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  FileCheck2,
  House,
  LockKeyhole,
  Zap,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { calculateSettlement, money } from "@/lib/calculations";
import { emptyWorkspace } from "@/lib/models";
import { appendSample } from "@/lib/operations";
import "./landing.css";

export default function HomePage() {
  const example = appendSample(emptyWorkspace());
  const result = calculateSettlement(example.households[0].id, example);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="site-container header-inner">
          <Brand />
          <nav aria-label="Main navigation">
            <a className="quiet-link how-link" href="#how-it-works">
              How it works
            </a>
            <Link className="action-link" href="/app/">
              Open workspace <ArrowRight aria-hidden="true" size={17} />
            </Link>
          </nav>
        </div>
      </header>
      <main id="main">
        <section className="site-container hero">
          <div className="hero-copy">
            <h1>
              A fair split.
              <br />
              Down to the day.
            </h1>
            <p>
              Moving in halfway through the month? Split shared bills by the
              days everyone was there. Every date, every share, clearly
              explained.
            </p>
            <div className="hero-actions">
              <Link className="action-link" href="/app/#sample">
                Try a sample household{" "}
                <ArrowRight aria-hidden="true" size={18} />
              </Link>
              <Link className="action-link secondary-action" href="/app/">
                Start from scratch
              </Link>
            </div>
            <p className="hero-note">
              No account. No uploads. Your numbers stay with you.
            </p>
          </div>
          <div
            className="hero-visual"
            aria-label="Example: a 300 dollar bill split into 225 dollars for Alice and 75 dollars for Ben"
          >
            <div className="calendar-grid" />
            <div className="move-in-note">
              <CalendarDays aria-hidden="true" />
              <span>
                Ben moves in<strong>October 16</strong>
              </span>
            </div>
            <div className="product-preview">
              <div className="preview-browser">
                <i />
                <i />
                <i />
              </div>
              <div className="preview-body">
                <div className="preview-heading">
                  <div>
                    <h2>Cedar House</h2>
                    <p>October 2026</p>
                  </div>
                  <span className="preview-date">Oct 1 – 30</span>
                </div>
                <div className="preview-bill">
                  <span>
                    <Zap size={17} aria-hidden="true" /> Electricity
                  </span>
                  <strong>{money(result.total, "USD")}</strong>
                </div>
                <div className="preview-timeline-label">
                  <span>Person</span>
                  <span>Days at home</span>
                  <span>Share</span>
                </div>
                {result.people.map((row, index) => (
                  <div className="preview-person" key={row.person.id}>
                    <div className="preview-person-name">
                      <span className={`initial initial-${index}`}>
                        {row.person.displayName[0]}
                      </span>
                      <div>
                        <strong>{row.person.displayName.split(" ")[0]}</strong>
                        <small>Oct {index ? "16" : "1"} – 30</small>
                      </div>
                    </div>
                    <div className="timeline-track">
                      <span className={`timeline-bar timeline-${index}`} />
                    </div>
                    <strong className="tabular">
                      {money(row.allocated, "USD")}
                    </strong>
                  </div>
                ))}
                <div className="preview-foot">
                  <FileCheck2 size={16} aria-hidden="true" />
                  30 days. Every cent accounted for.
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="site-container workflow" id="how-it-works">
          <h2>From shared bills to a clear answer.</h2>
          <div className="workflow-steps">
            {[
              ["01", "Add your household", "Who’s staying, and when."],
              ["02", "Choose how to split", "Equal shares or occupied days."],
              [
                "03",
                "See the whole picture",
                "Review, save, and print your report.",
              ],
            ].map(([number, title, description]) => (
              <div className="workflow-step" key={number}>
                <div className="step-number">
                  <span>{number}</span>
                  <i />
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="privacy-band">
          <div className="site-container privacy-inner">
            <div>
              <h2>
                Your household.
                <br />
                Your device.
              </h2>
              <p>
                Households and bills are saved in this browser.
                <br className="desktop-break" /> Download a JSON backup whenever
                you need a copy.
              </p>
            </div>
            <div className="privacy-visual" aria-hidden="true">
              <div className="privacy-browser">
                <div className="privacy-browser-top">
                  <i />
                  <i />
                  <i />
                </div>
                <div className="privacy-browser-body">
                  <div className="privacy-mini-sidebar">
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className="privacy-mini-rows">
                    {[0, 1, 2].map((i) => (
                      <span key={i}>
                        <House size={15} />
                        <i />
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <LockKeyhole className="privacy-lock" />
            </div>
          </div>
        </section>
      </main>
      <footer className="site-container site-footer">
        <Brand />
        <p>
          Self-initiated studio project <span aria-hidden="true">·</span>{" "}
          <a href="https://consolelog.studio/">ConsoleLog Studio</a>
        </p>
      </footer>
    </>
  );
}
