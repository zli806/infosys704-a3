# Domino's Investment Governance Hub

**INFOSYS 704 · Assignment 3 · Functional prototype · Financial problem domain**

> **From investment evidence to accountable continuation decisions.** This application operationalises the group's selected A2 Stage-Gated Portfolio Continuation Review for Domino's Pizza Enterprises Limited (DPE). It helps a governance reviewer examine project/financial evidence, record a structured human assessment, choose a continuation outcome and retain the resulting decision history. It does **not** decide for the reviewer.

**Start here:** [A3 assessment alignment](#a3-assessment-alignment) · [Five-minute pitch](#five-minute-pitch-scr) · [Run locally](#run-locally-windows-macos-and-linux) · [Marker walkthrough](#recommended-marker-walkthrough) · [Project structure](#project-structure) · [Known limitations](#security-integrity-and-known-limitations)

## A3 assessment alignment

This section is a **navigation guide to observable implementation evidence**, not a self-awarded grade. It maps the five categories in the published A3 rubric (200 marks) to what a marker can inspect.

| A3 criterion | Marks | Implementation evidence | Where to inspect |
| --- | ---: | --- | --- |
| **App Rationale** | **10** | Implements the team's selected **Financial-domain** A2 solution: a bounded continuation-review process targeting avoidable further investment exposure, rather than an unrelated generic dashboard. Human accountability is retained. | [Why this solution](#business-need-and-solution-rationale), [selection record](DECISIONS.md), [project context](PROJECT_CONTEXT.md) |
| **App Design** | **30** | Business-specific work areas, stage-gated assessment/decision flow, distinct evidence provenance, consistent executive UI and responsive layouts. The design decisions can be traced to the five Design Thinking stages; no unperformed research is claimed. | [Design Thinking](#design-thinking-applied), [How It Works](#recommended-marker-walkthrough), [design system](DESIGN.md) |
| **App Functionality** | **60** | Working Dashboard, Portfolio, project/WBS and linked G/L/PO evidence, synthetic Showcase, explicit review initiation, six judgements, five outcomes, conditional follow-up, local persistence and multiple immutable completed review cycles. | [Marker walkthrough](#recommended-marker-walkthrough), [functional coverage](#implemented-functional-scope), [tests](#verification-and-tests) |
| **Usability / Ease of Use** | **50** | End-to-end navigation with progress/readiness feedback, accessible native controls, field-level validation, error recovery, preserved drafts, progressive disclosure and responsive design. | [Usability heuristics](#usability-by-design), [workspace demonstration](#recommended-marker-walkthrough), [UI contract](docs/UI_CONTRACT.md) |
| **App Presentation** | **50** | A demonstrable Situation–Complication–Resolution (SCR) story and a repeatable five-minute product journey. **Speaking quality, pace and delivery are assessed in the lab, not demonstrated by this README.** | [Five-minute pitch](#five-minute-pitch-scr), [showcase reset](#reset-showcase-and-persistence) |

The published A3 brief also refers to **an app ZIP, a separate five-minute Lab 12 pitch, pitch slides and a groupwork-management disclaimer slide**. This source repository and README help demonstrate the product; they do not replace those submission and presentation deliverables.

## Business need and solution rationale

**Situation.** DPE's capitalised IT investments are approved against assumptions about strategy, benefits, delivery, cost and risk. Those assumptions can change during delivery.

**Complication.** Continuing without a timely, structured reassessment can expose DPE to avoidable additional expenditure. SAP project and transaction records provide only *part* of the decision context: they do not independently establish strategic relevance, benefits credibility or future economic value.

**Resolution.** A **Stage-Gated Portfolio Continuation Review** combines three bounded sources of SAP-type evidence with six explicit human assessments and an accountable governance decision:

```text
Dashboard / Portfolio
        ↓
Investment Overview (source-labelled evidence)
        ↓
Human Review Trigger (scheduled stage gate or material trigger)
        ↓
Six-dimension Assessment → Review Summary → Governance Decision
                                                ↓
                            Immutable completed Decision Record / History
```

The five available outcomes are **Continue**, **Continue with Conditions**, **Modify**, **Pause** and **Stop**. No outcome is preselected, scored or recommended by the application.

**Why this solution was selected.** The group selected the Financial-domain A2 proposal (recorded in [DECISIONS.md](DECISIONS.md)). The implementation has a favourable **qualitative effort–impact fit**: a complete, high-value governance journey can be demonstrated using existing read-only SAP APIs and a lightweight local review record, while non-SAP judgements stay with accountable people. The team deliberately prioritised an end-to-end usable process over broad but shallow enterprise-system features. This explains the trade-off; it is **not a fabricated numerical Effort–Impact Matrix score**. The original team-selection evidence should be presented separately where required.

**Intended value, not a measured ROI:** earlier attention to changing investment assumptions, explicit decision ownership, fewer open-ended reviews and traceability of rationale/follow-up. These are prototype value propositions; no DPE production benefit or financial saving is claimed.

## Five-minute pitch (SCR)

The sequence below is a **suggested demonstration plan**, not a claim about an already-recorded presentation.

| Segment | Target time | What to say/show |
| --- | --- | --- |
| **Situation** | 0:00–0:35 | DPE commits funds to technology investments whose business assumptions can evolve. |
| **Complication** | 0:35–1:05 | Project activity alone cannot answer whether an investment should still continue. Delayed reassessment creates avoidable exposure. |
| **Resolution** | 1:05–1:35 | Introduce the Hub: SAP evidence **informs**, structured human judgement **decides**, the record **preserves accountability**. |
| **Functional demonstration** | 1:35–4:20 | Dashboard → Portfolio → Overview evidence → Review Trigger → six-dimensional Assessment → Review Summary → human Decision → History. Use seeded Showcase data for reliability. |
| **Value and boundary** | 4:20–5:00 | Show recorded rationale/owner/follow-up, then state that the prototype is read-only with respect to SAP and does not automate the final decision. |

For the live pitch, rehearse within the five-minute limit and ensure the separately submitted slides include the required groupwork disclaimer. SCR demonstrates **why this feature exists**, not merely how many screens were built.

## Run locally — Windows, macOS and Linux

### Prerequisites

- A modern browser (Edge, Chrome, Firefox or Safari).
- **Python 3** to serve the static files over HTTP. It serves files only; it is **not** an application backend.
- **Git** only if cloning the repository; it is not needed when using the submitted ZIP.
- **Node.js 24** only for automated tests, **not** to run the app.
- **No npm install, bundler, database or SAP key** is required for the synthetic Showcase journey.

Obtain the project either by **extracting the submitted ZIP**, or (with repository access) by running:

```bash
git clone https://github.com/zli806/infosys704-a3.git
cd infosys704-a3
```

If using a ZIP, open a terminal **inside the extracted directory containing `index.html`** instead of cloning. Execute **one** of the following operating-system instructions.

### Windows — PowerShell (recommended)

```powershell
# Run from the project root. Do not overwrite an existing private config.
if (-not (Test-Path .\config.local.js)) {
    Copy-Item .\config.example.js .\config.local.js
}
py -3 -m http.server 8786 --bind 127.0.0.1
```

If the Python launcher `py` is unavailable but Python 3 is installed as `python`, replace the last command with `python -m http.server 8786 --bind 127.0.0.1`.

### Windows — Command Prompt (cmd.exe)

```bat
if not exist config.local.js copy config.example.js config.local.js
py -3 -m http.server 8786 --bind 127.0.0.1
```

### macOS — Terminal

```bash
# Run from the project root.
test -f config.local.js || cp config.example.js config.local.js
python3 -m http.server 8786 --bind 127.0.0.1
```

### Linux — Terminal

```bash
# Run from the project root.
test -f config.local.js || cp config.example.js config.local.js
python3 -m http.server 8786 --bind 127.0.0.1
```

**On all platforms:** open **http://127.0.0.1:8786/**. Keep the terminal running while using the app; press **Ctrl+C** to stop the server. Do **not** double-click `index.html` and rely on `file://` behaviour or disable browser security.

The safe `config.example.js` placeholder is copied only when `config.local.js` does not already exist. It does not authenticate to SAP or enable live requests. The resulting private `config.local.js` is deliberately ignored by Git.

### Optional SAP Sandbox connection

1. Obtain your own key from [SAP Business Accelerator Hub](https://hub.sap.com/).
2. Edit the **untracked** `config.local.js`:

   ```javascript
   window.APP_CONFIG = {
     SAP_API_KEY: "YOUR_OWN_SAP_SANDBOX_API_KEY"
   };
   ```

3. Reload the local page. Live SAP Sandbox projects are loaded separately when a configured key is present; Portfolio shows their connection status and a **Refresh SAP Data** action.

**Without a key**, five synthetic Showcase investments and their governance workflows remain available. **A key does not guarantee connectivity**: the external Sandbox can be unavailable, return incomplete sample data or block browser requests through CORS. Never commit, paste into screenshots or share a real API key; browser-side credentials are observable in developer tools.

## Recommended marker walkthrough

Start on a **fresh Showcase baseline** ([reset instructions](#reset-showcase-and-persistence)) so the demonstration is reproducible.

1. **Dashboard — spot governance attention.** Inspect the five overlapping lenses: Active Reviews, Overdue, Material Concerns, Evidence Gaps and Reviewed Investments. Each counts **distinct investments**, not findings; these independent percentages are **not** intended to sum to 100%.
2. **Portfolio → Open Investment — inspect a case.** Select **Store Technology Infrastructure Refresh** (initially Monitoring). The Overview presents synthetic investment context plus **Project Structure**, **Financial Activity** and **Procurement Activity**. Each **View details** opens its existing technical section without inventing another data source.
3. **Start Review — capture the reason.** Choose a **Scheduled stage-gate review** or **Material trigger**. This is a **human-entered review trigger**, not an automatically inferred Material Concern. Cancel creates no review.
4. **Assessment — exercise decision support.** Select a fictional prototype Decision Owner and complete six judgements: Strategic Alignment, Expected Benefits, Delivery Performance, Cost Position, Risk and Future Economic Value. Optional notes and dependencies can be saved. An incomplete Review Summary can still be previewed.
5. **Review Summary — inspect the basis.** Review the six-dimension matrix, governance timeline and compact **Evidence Status**. Source availability does **not** mean the reviewer has confirmed sufficiency. If required inputs are missing, Governance Decision explains the readiness gate.
6. **Governance Decision — record accountable judgement.** Choose one of five outcomes and provide a rationale. **Continue with Conditions / Modify / Pause** additionally require a follow-up action, action owner and next-review date. Invalid submissions show linked field-level feedback; the app never selects an outcome for the user.
7. **History — verify the saved result.** `Record Decision` opens the exact completed cycle, including decision owner, timestamp, rationale, follow-up, Review Trigger, source provenance and frozen assessment/evidence summaries. Further non-Stop cycles may be created; **Stop** ends the normal continuation/restart path.

The separate **How It Works** utility explains Monitor → Review → Decide → Record and why **evidence informs but people decide**.

## Implemented functional scope

| Capability | What the prototype actually implements |
| --- | --- |
| **Portfolio monitoring** | Dashboard attention lenses, due/overdue status and latest completed outcome; Portfolio includes investments without an active review. |
| **SAP evidence** | Read-only **Enterprise Project** / UUID-linked project structure and WBS elements; **G/L accounting lines** matched by WBS with narrowly defined project-ID fallback; **Purchase Order account assignments** matched using exact WBS Internal IDs. |
| **Synthetic reliability** | Five visibly labelled Showcase investments with SAP-schema-shaped transaction samples and separate illustrative financial/governance context; three seeded active reviews and one historical Stop. |
| **Human review** | Explicit Review Trigger, six qualitative assessment dimensions, optional reviewer context, fictional configured Decision Owner and evidence/readiness qualification. |
| **Decision control** | Five human outcomes, mandatory rationale/owner and conditional follow-up; **14-day decision target** and **30-day escalation threshold** calculated from the real review-open timestamp. There are no external alerts. |
| **Continuity** | At most one active review per investment; multiple recorded review cycles; immutable completed snapshots under normal app flows; browser/origin-local draft and record persistence. |
| **Failure handling** | Inline validation and focus, Save/Retry safeguards, clear SAP source/error status, separated storage failures and non-blocking Sandbox connection feedback. |
| **Usability** | One Overview / Current Review / History workspace, responsive layouts, keyboard-accessible native controls, context help and progressive disclosure of technical detail. |

**Critical distinction:** a missing SAP join, unavailable source or partial financial sample does **not** establish zero project cost or procurement exposure. G/L postings are not a complete investment-cost statement, and purchase-order assignments are not validated outstanding liabilities. No foreign-currency conversion, fabricated join or SAP write-back occurs.

### Design Thinking applied

This is a **Design Thinking-informed account of implemented design choices**, not a claim that formal interviews with DPE personnel or a measured executive usability study took place.

| Stage | Application to this prototype |
| --- | --- |
| **Empathise** | Start from the A2 business scenario and the needs of a technology portfolio/PMO reviewer: see attention, access credible evidence, make an accountable decision and retrieve history. |
| **Define** | Frame the user task as a **continuation decision under changing evidence**, not merely displaying ERP project data. Preserve the separation between evidence, reviewer findings and decisions. |
| **Ideate** | Select a feasible hybrid: leverage three read-only SAP evidence surfaces, use human inputs for business judgements SAP cannot prove, and keep the decision non-automated. |
| **Prototype** | Implement one complete governance journey supported by both source-labelled synthetic scenarios and a separate real Sandbox path. Prefer a bounded demonstrable workflow over unsupported features. |
| **Test** | Verify business rules, persistence, provenance, missing/failed evidence, input validation and responsive operation through automated regressions and documented browser checks. See [handoff evidence](docs/PRODUCTISATION_HANDOFF.md). |

### Usability by design

The ten interface heuristics referenced in the assignment can be inspected through tangible product behaviour, rather than treated as decorative labels.

| Heuristic | Visible evidence |
| --- | --- |
| Visibility of system status | Connection/source badges, evidence retrieval states, review timing and save/error feedback. |
| Match with the real world | Portfolio, stage gate, decision owner, follow-up action and Review Trigger language. |
| User control and freedom | Cancel Review, backward stage navigation, editable drafts, explicit confirmation before irreversible Showcase reset. |
| Consistency and standards | Shared controls, coherent error levels, named six-dimensional fields and consistent five-outcome visual categories. |
| Error prevention | Required input/readiness checks, no preselected human decision, guarded Stop and no silent save failure. |
| Recognition rather than recall | Review Summary, concise contextual guidance, visible past outcomes and source-labelled evidence. |
| Flexibility and efficiency | Continue Review resumes an existing cycle; evidence drill-down exposes detail only when requested. |
| Aesthetic and minimalist design | Business-facing cards first; raw SAP payloads and diagnostics are inside Technical Details. |
| Recognise, diagnose and recover from errors | Field-linked validation, visible source limitations, Retry and persistent storage recovery instructions. |
| Help and documentation | How It Works, the marker walkthrough, this README and linked technical documentation. |

## Project structure

The tree distinguishes **runtime code**, **reference specifications**, **tests** and **handoff documentation**. `config.local.js` is created locally and is **not tracked or included in the repository**.

```text
infosys704-a3/
├── index.html                 # Application shell, views and deferred script loading
├── styles.css                 # Shared design tokens, responsive and feedback styles
├── app.js                     # Navigation, review orchestration and evidence workflow
├── api-config.js              # Read-only SAP Sandbox endpoint / field configuration
├── config.example.js          # Safe placeholder for local credentials
├── logo.png                   # Product header identity
├── js/
│   ├── core/
│   │   ├── state.js           # In-memory application state
│   │   ├── review-rules.js    # Assessment/readiness/timing/decision rules
│   │   └── utils.js           # Parsing, dates, identifiers and aggregations
│   ├── data/
│   │   └── showcase-portfolio.js
│   ├── services/
│   │   ├── sap-http.js
│   │   ├── project-service.js
│   │   ├── gl-service.js
│   │   ├── po-service.js
│   │   ├── showcase-service.js
│   │   ├── governance-directory.js
│   │   └── review-store.js
│   └── ui/
│       ├── renderers.js       # SAP tables, source status and notifications
│       └── governance.js      # Dashboard, forms, History and review UI
├── api/                       # Downloaded SAP API specifications (reference files)
├── tests/                     # 22 Node test suites and test helpers
├── scripts/
│   ├── check_frontend_contract.py
│   └── sap_live_validate.py   # Separate, controlled SAP validation utility
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API_INTEGRATION.md
│   ├── UI_CONTRACT.md
│   ├── MVP_SCOPE.md
│   ├── PRODUCTISATION_HANDOFF.md
│   ├── REPOSITORY_AUDIT.md
│   └── ui-review/             # Dated historical QA captures, not final UI
├── .github/workflows/         # Credential-free CI and separately gated SAP check
├── PROJECT_CONTEXT.md         # A2-to-A3 business boundary
├── DECISIONS.md               # Dated product/architecture decisions
├── DESIGN.md                  # UI design decisions and verification history
├── CONTRIBUTING.md            # Team workflow and security checks
└── README.md                  # Marker entry point and local operator guide

Local only (ignored): config.local.js
```

**Architecture in one sentence:** one static browser application with separated state/rules, source adapters, UI rendering and controller logic, backed by local review storage and **optional** read-only SAP Sandbox requests—not a production service.

## Verification and tests

Static checks run on pushes to `master` and can be run locally. **Node.js 24** and **Python 3** are the test/tooling prerequisites; neither adds a server-side application component.

```bash
node --test tests/*.test.js
python3 scripts/check_frontend_contract.py
node --check api-config.js
node --check app.js
git diff --check
git check-ignore config.local.js
git ls-files config.local.js
```

On Windows, substitute `py -3` or `python` for `python3` as appropriate. The final `git ls-files` command should produce **no output**: `config.local.js` must remain untracked. The source checks also cover all JavaScript modules and Python script syntax through [Frontend Static Checks](.github/workflows/static-checks.yml).

The [productisation handoff](docs/PRODUCTISATION_HANDOFF.md) documents the latest verification: **175 passing Node tests** and multi-width browser walkthroughs (1440, 1024, 768 and 390px). These are reproducible code/interaction checks, **not** a guarantee of live SAP availability, independent accessibility certification or a real DPE user-acceptance test. The [SAP live validator](docs/API_INTEGRATION.md) runs separately from ordinary credential-free CI.

## Reset Showcase and persistence

The footer **Reset Showcase** action asks for confirmation and then:

- **Irreversibly clears all governance reviews, drafts and completed decisions owned by this app in this browser/origin**, including locally recorded **SAP Sandbox** review cycles.
- Restores **three seeded active Showcase reviews and one synthetic historical Stop record**.
- **Does not** delete external SAP data, modify the API key/configuration, erase other applications' storage keys or remove already loaded project data from the running page.

Use Reset **only** when a repeatable demonstration baseline is needed; Cancel makes no changes. Normal refresh/reload does not intentionally overwrite completed records. "Immutable" means a completed record cannot be edited using the normal workflow; it does **not** mean the local browser storage is tamper-proof or survives deliberate reset/clearing.

### Troubleshooting

| Symptom | Check / safe response |
| --- | --- |
| `py` / `python3` not found | Install Python 3 or use the executable available on that OS. Verify with `py -3 --version` (Windows) or `python3 --version` (macOS/Linux). |
| Browser displays a directory listing or 404 | Serve **from the folder containing `index.html`**; open `http://127.0.0.1:8786/`. Ensure `config.local.js` exists to avoid a harmless missing-script request. |
| Port 8786 is occupied | Stop the other server or select another port. Changing hostname/port creates a **different browser origin**, so previous local reviews may not appear. |
| SAP is "Not connected" | Showcase does not require SAP. For optional live evidence, verify your **own** key in the ignored local config, then reload. |
| SAP returns an error / no matching rows | Use the visible connection/source status and technical details. Sandbox/CORS and sample joins are external constraints; **do not** disable browser security or substitute Showcase figures for SAP evidence. |
| Review cannot progress | Check Decision Owner, the six required judgements, review trigger, evidence-attempt/readiness status and any active fetch/save issue. Incomplete Summary is viewable; recording is gated. |
| Changes appear lost | Confirm that the same browser profile and exact `127.0.0.1:8786` origin are used, and that Reset/clear-site-data was not run. Use Retry Save if an explicit save failure is shown. |

## Security, integrity and known limitations

- **No DPE production data.** `SHOWCASE` (violet) is synthetic; `SAP SANDBOX` (blue) is SAP Business Accelerator Hub sample data. Neither should be presented as live DPE records. Decision Owners are fictional prototype directory entries, not authenticated employees.
- **No production-grade secrets or identity management.** `config.local.js` is ignored by Git but loaded into the browser. The app has no authentication, authorisation service, encrypted shared database or tamper-proof enterprise audit log.
- **No autonomous financial approval.** The app does not compute an investment score, select a continuation outcome, infer the Review Trigger, execute project changes or send SAP write-back.
- **No automatic notification or escalation service.** The 14/30-day rules surface timing in the UI and depend on the browser clock; they do not deliver external alerts.
- **No assumed data completeness.** Live retrieval is bounded to **five SAP Sandbox projects** and **up to 100 G/L/PO rows per linked request**, without automatic pagination. Missing linked rows are not evidence of zero spend/liability; currencies remain separate.
- **Prototype scope only.** Purchase Requisition, MCP/AI Review Brief, enterprise-shared persistence and production governance integration are deferred; see [MVP scope](docs/MVP_SCOPE.md).

**Implementation-platform note.** The published A3 V1 PDF names SAP Build Apps/AppGyver and an AppGyver export. The repository's [project context](PROJECT_CONTEXT.md) records a subsequent class-development direction using **OpenCode plus SAP APIs** after academic platform unavailability. This deliverable is therefore a **working static HTML/CSS/JS prototype, not an AppGyver export**. Packaging and compliance with the updated submission direction remain matters for the teaching team; no equivalence is implied by this README.

## Detailed documentation

| Document | Purpose |
| --- | --- |
| [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) | Selected A2 financial problem, decision boundary and A3 scope. |
| [DECISIONS.md](DECISIONS.md) | Dated architecture/product decisions, including rejected or deferred scope. |
| [DESIGN.md](DESIGN.md) | UI design system, page hierarchy and visual verification. |
| [Architecture](docs/ARCHITECTURE.md) | Component ownership, persistence, source isolation and security. |
| [API Integration](docs/API_INTEGRATION.md) | Endpoint shapes, WBS joins, partial data and controlled validation. |
| [UI Contract](docs/UI_CONTRACT.md) | Functional elements, interaction/feedback and accessibility expectations. |
| [MVP Scope](docs/MVP_SCOPE.md) | Functional versus deferred features and production boundaries. |
| [Productisation Handoff](docs/PRODUCTISATION_HANDOFF.md) | Final testing and UI refinement evidence. |
| [Repository Audit](docs/REPOSITORY_AUDIT.md) | Conservative cleanup decisions. |
| [Contributing](CONTRIBUTING.md) | Team development workflow and credential safeguards. |
