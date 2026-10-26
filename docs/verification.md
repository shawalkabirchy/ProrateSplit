# Verification evidence

This file separates executed checks from targets. This is a self-initiated project using synthetic records.

## Environment

- Windows; Node.js 24.14.0; npm 11.14.1; Intel Core i7-1355U; 16 GiB RAM.
- Next.js 16.4.3; React 19.3.1; Tailwind CSS 4.3.3; Zod 4.6.7.
- Playwright 1.64.1; axe integration 4.14.0.
- The Browser plugin is not installed. The Codex in-app browser was used for visual smoke checks, alongside the requested Playwright suite for repeatable browser verification.
- Next's CSS worker could not connect inside the restricted execution sandbox. The same production build passed with local worker execution allowed, without a source/build-mode workaround.

## Commands and executed results

Reproducible commands: `npm run lint`, `npm run typecheck`, `npm test`, `npm run benchmark`, `npm run build`, and `npm run test:e2e`. Browser tests serve `out/`, not the development server. CI uses the same checks on Ubuntu and Node 24.

- Lint: passed with no warnings. TypeScript: passed. Unit/benchmark suite: **32 passed**.
- Eight main scenarios passed in Chromium, Firefox and WebKit: **24 browser checks**.
- The full-workspace sample entry-point and maximum-data preview scenarios passed in all three: **6 additional browser checks**.
- Installed Chrome and Edge each passed the landing/responsive/accessibility and complete scenario/report/backup workflow: **4 additional browser checks**.
- Dependency audit: **0 vulnerabilities**. The preview server's compression dependency is explicitly pinned to its patched 1.8.2 release.
- Production build: passed; `/`, `/app/`, and the not-found page are static exports.
- Canonical PDFs: one A4 page and one Letter page, with the complete notes/credit, clear totals, and no printed skip link. Both were rendered to PNG and visually inspected.

| Browser                    | Version       | Coverage                                                |
| -------------------------- | ------------- | ------------------------------------------------------- |
| Playwright Chromium        | 156.0.8078.4  | All 10 scenarios                                        |
| Playwright Firefox         | 157.0         | All 10 scenarios                                        |
| Playwright WebKit          | 27.2          | All 10 scenarios                                        |
| Installed Google Chrome    | 156.0.8078.47 | Main workflow, responsive layout, axe, focus and report |
| Installed Microsoft Edge   | 155.0.4283.62 | Main workflow, responsive layout, axe, focus and report |
| Actual Safari/macOS/iPhone | Not available | Not run                                                 |

The first passes found low-contrast landing step numbers, WebKit focus return, and print-only viewport/skip-link issues. These were fixed and rechecked. Alert assertions were scoped to avoid Next's separate route announcer. Slower accessibility scans receive an appropriate test timeout; checks were not removed. The full-workspace test follows the actual landing-page sample link instead of a same-document fragment jump.

## Acceptance results

| Check                     | Method and evidence                                                                                | Result                                           |
| ------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| P01-A1 Dates              | `tests/domain.test.ts`: real/leap dates, UTC day ordinals, end boundary, 1/366-day bounds          | Passed                                           |
| P01-A2 Daily allocation   | Unit and browser fixture: 300.00 becomes 225.00/75.00                                              | Passed                                           |
| P01-A3 Vacancy            | Uncovered October 1-15 identified; zero-amount vacancy invalid; invalid occupancy edit cannot save | Passed                                           |
| P01-A4 Exact money        | 0.34/0.33/0.33 stable order; varied amounts/20 occupants; clone preserves tied shares              | Passed                                           |
| P01-A5 Settlement         | -75.00/+75.00; aggregate net zero; payer totals visible                                            | Passed                                           |
| P01-A6 Persistence/report | Backup round trip, reload, stale tabs, independent copies, A4/Letter inspection                    | Passed                                           |
| G-A1 Usability            | 360/1440 px, field labels, focus return, reduced motion, axe on landing/workspace/editor/report    | Passed in tested browsers; actual Safari Not run |
| G-A2 Truthful state       | Transaction completion before Saved; failed storage retains pending records and export             | Passed                                           |
| G-A3 Reliable records     | Stale tabs, atomic abort/quota recovery, import cancel/replace, cascade deletion                   | Passed                                           |
| G-A4 Privacy              | Local-origin-only requests; private filename/household marker absent during import                 | Passed                                           |
| G-A5 Bounded work         | Record/amount/date/byte limits; full-workspace sample preserves data; maximum preview              | Passed                                           |
| G-A6 Evidence/performance | Production export, versioned browser coverage, actual timings below                                | Passed for documented environment                |

## Measured performance

`npm run benchmark`: 100 year-long, maximum-amount bills for 20 people, seven samples on the laptop above. Median **22.74 ms**, minimum **14.82 ms**, maximum **31.28 ms**. This measures the Node calculation engine, not browser rendering or general device performance.

The maximum-household browser test restores 20 people and 100 bills, edits one bill, and measures the real input event to the updated preview DOM. Observed values were **11.1 ms Chromium**, **11 ms Firefox**, and **17 ms WebKit**, each below the 200 ms target. These are individual observed updates, not percentile or paint-time guarantees. Measurements are attached to the Playwright results.

## Visual and print evidence

Portfolio captures are in `docs/screenshots/`; the actual walkthrough is generated by `npm run capture`. Print fixtures come from the canonical browser workflow. The print CSS repeats table headers, wraps long names, retains totals, and excludes navigation/recovery controls.

The visual comparison checks the white/slate backgrounds, blue accent, system typography, header/household rail, settlement hierarchy, bill rows, date/scenario notes, landing workflow sections, and responsive continuation. Functional differences from concept art are intentional: only real household records appear; save/recovery status, totals, confirmations, and record limits are explicit. Decorative step numbers were darkened for accessibility.

## Cloudflare deployment — 2026-10-26

- Production: [proratesplit.pages.dev](https://proratesplit.pages.dev/). The initial application release `0d2a951` was built and published successfully in deployment [`ebf24466`](https://ebf24466.proratesplit.pages.dev/).
- Cloudflare Pages serves the existing `out` static export. The API confirms `uses_functions: false`; no paid upgrade, runtime server, database service, or custom-domain/DNS change was made.
- The GitHub source is `shawalkabirchy/ProrateSplit`, production branch `main`, with automatic production deployments enabled. Preview branch deployments and PR comments are disabled. Build command: `npm run build`; output: `out`; build variables: `NODE_VERSION=24` and `NEXT_TELEMETRY_DISABLED=1`.
- The initial push did not trigger a build because the Cloudflare GitHub app was authorized only for `consolelog-studio`. After GitHub verification and explicit owner approval, `ProrateSplit` was added to that existing app installation. The existing repository stayed selected, access to all repositories was not enabled, and the disconnected-account warning cleared. The documentation update itself exercises the automatic `main` deployment path; its commit can be matched to the Cloudflare deployment history and GitHub build check.
- The existing Playwright suite ran against the public HTTPS origin using `PLAYWRIGHT_BASE_URL`: **30 passed**, covering all ten scenarios in Chromium, Firefox and WebKit. Each test used an isolated synthetic browser workspace. No household records were uploaded to Cloudflare.
- The live suite verified the canonical allocations, occupancy edits, independent copies, reload persistence, USD/BDT editing, deletion guards, stale tabs, quota/abort/unavailable-storage recovery, backup validation/replacement/cancellation, local-origin-only requests, accessibility scans, and 360/1440 px layouts. Chromium also generated both report PDF sizes.
- Direct HTTP checks passed: `/` and `/app/` returned 200; `/app` redirected to `/app/` with 308; an unknown path returned 404. Desktop/mobile workspace screenshots were visually inspected with no new layout issue found.
- Live maximum-household input-to-preview observations: **2.2 ms Chromium**, **13 ms Firefox**, **10 ms WebKit**. These are individual local browser measurements of the client calculation, not network or general-device performance guarantees.
- Local lint and type checking passed after enabling remote-origin tests. Without `PLAYWRIGHT_BASE_URL`, the same suite continues to serve the local production export. GitHub Actions remains a separate verification workflow; Cloudflare deployments do not wait for its result.
- Browser plugin not available; validation used the existing Playwright installation. Actual Safari/macOS/iPhone remains **Not run**. Local and production origins keep separate workspaces; moving data requires an explicit JSON backup/restore.

## Important limits

### Design comparison ledger

| Reference point | Final render and resolution |
| --- | --- |
| White header/panels, pale slate background, blue accents | Preserved in desktop and mobile captures. |
| Brand and utility controls | Divide icon and product wordmark retained. Narrow screens use labelled icon buttons to prevent overlap. |
| Household rail | Shows actual records; extra mock households from the concept were omitted deliberately. |
| Settlement hierarchy | Summary band, person rows, paid/allocated amounts and receivable emphasis retained; totals added for auditability. |
| Typography | System-font hierarchy retained; heading weights and table legibility strengthened during comparison. |
| Bill/detail and date/scenario motifs | Implemented as real expandable allocations and an independent-copy action. |
| Landing composition | Split hero, code-native timeline preview, open three-step section and privacy band retained. |
| Mobile continuation | Stacked regions, explicit horizontal-table scroll hint, no page overflow; header crowding fixed and rechecked. |

Both concept references and final browser captures were visually inspected. The main automated matrix is supplemented by an in-app keyboard pass: Enter opens the editor, Tab skips the locked currency control to Cancel, Enter closes it, focus returns to the opener, and arrow keys change tabs.

- Quota, unavailable-storage and transaction-abort conditions are fault-injected browser tests, not evidence of filling this laptop's disk.
- WebKit automation is not actual Safari on macOS/iPhone. That environment is Not run on this Windows host.
- Automated accessibility scans and focus checks are not accessibility certification.
- Cloudflare Pages is the selected host. No Vercel deployment or paid hosting upgrade has been performed. Custom domains and actual Safari devices remain untested.
- No customer outcomes, market-demand validation, revenue, or business savings are claimed.
