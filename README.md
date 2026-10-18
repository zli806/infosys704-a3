# Domino’s Investment Governance Hub

Evidence-supported continuation reviews for accountable IT investment decisions.

**Contents**

- [1. Executive Overview](#1-executive-overview)
- [2. Business Context and Solution Rationale](#2-business-context-and-solution-rationale)
- [3. Solution Capabilities](#3-solution-capabilities)
- [4. User Journey and Product Demonstration](#4-user-journey-and-product-demonstration)
- [5. Design and Usability Approach](#5-design-and-usability-approach)
- [6. Getting Started](#6-getting-started)
- [7. Technical Architecture and Project Structure](#7-technical-architecture-and-project-structure)
- [8. SAP Integration and Data Provenance](#8-sap-integration-and-data-provenance)
- [9. Testing and Quality Assurance](#9-testing-and-quality-assurance)
- [10. Security, Limitations and Future Enhancements](#10-security-limitations-and-future-enhancements)
- [11. Documentation and Handover](#11-documentation-and-handover)

## 1. Executive Overview

### 1.1 Product Purpose

Domino’s Investment Governance Hub is a working prototype for **Domino’s Pizza Enterprises Limited (DPE)**. It operationalises the **Stage-Gated Portfolio Continuation Review**: a structured way to reassess material IT investments when a scheduled stage gate or a material change calls their continuation case into question.

Built for INFOSYS 704 A3, it implements the group’s selected Financial-domain A2-D1 solution. Portfolio monitoring, project and transaction evidence, human assessment and recorded decisions form one usable journey. Five synthetic Showcase investments support the complete workflow without an SAP key; optional read-only SAP Sandbox connections provide a separate evidence source.

OpenCode.ai was used as a development tool alongside SAP APIs. This does not imply that AI inference or agentic governance reasoning operates inside the runtime application.

### 1.2 Business Value

The Hub is intended to help portfolio and governance teams notice changing investment assumptions, assign decision accountability and retain the reasoning behind further expenditure. A reviewer can see what needs attention, examine the available evidence and record what should happen next rather than leave a review open-ended.

This is decision support, not automated approval. Evidence informs the review; an accountable person chooses the continuation outcome. The prototype demonstrates that process, not measured DPE savings or a production deployment.

## 2. Business Context and Solution Rationale

### 2.1 The Business Challenge

Approval is based on assumptions about strategic alignment, expected benefits, delivery, costs and risk. Those assumptions can change while a capitalised IT investment is still consuming resources. Continuing without timely reassessment can increase avoidable financial exposure before the organisation acts.

Project activity alone does not establish that an investment still deserves funding. SAP can supply lifecycle and transaction evidence, but strategic relevance, benefits credibility and future economic value also require business judgement.

### 2.2 Why Stage-Gated Continuation Review

The group selected Harneet Singh’s Financial-domain A2-D1 proposal because it provides a defined governance process, clear ownership and a focused path from evidence to action. The [decision log](DECISIONS.md) records the choice and the priority given to a complete continuation-review journey over a broad ERP dashboard.

Qualitatively, the effort–impact trade-off favours making that core process work well: reuse read-only SAP evidence where it fits, capture the judgements it cannot supply, and preserve the resulting rationale and follow-up. This concentrates implementation effort on a demonstrable governance task without adding the complexity of autonomous recommendations or operational SAP changes.

### 2.3 Scope and Implementation Trade-offs

The implementation uses plain HTML, CSS and JavaScript with local browser persistence. There is no build pipeline, business-logic backend or database to operate. An optional Python preview server relays read-only SAP requests to avoid Sandbox browser/CORS restrictions. This keeps the prototype easy to run and inspect, at the cost of shared storage, authenticated authority and enterprise audit guarantees.

Public SAP samples do not form a complete DPE investment portfolio. A separately labelled synthetic Showcase supplies coherent review scenarios without filling gaps in live-project evidence. AI review briefs, MCP orchestration and Purchase Requisition integration remain deferred, as recorded in the later scope decisions.

### 2.4 Adapting the Solution to Available SAP APIs

Under **Option #2 — partial SAP API fit**, the original A2 solution remains a structured, stage-gated continuation review of material IT investments. SAP supports project identity and lifecycle, WBS, G/L financial postings and PO procurement evidence, but its samples do not independently establish strategic alignment, benefits credibility, all delivery risks or future economic value. The tested Sandbox supplied no reliable marked continuation milestones, and some cross-source relationships and procurement samples were incomplete.

The implementation therefore captures an explicit human Review Trigger and six business assessments alongside the defensible evidence available through three read-only SAP integrations. Separately labelled synthetic Showcase scenarios demonstrate the complete process without replacing live SAP responses. Purchase Requisition, automated triggers, MCP orchestration and AI Review Brief remain deferred, consistent with the recorded scope decisions.

These adaptations change **how the selected solution is implemented**, not the Financial-domain business problem or the Stage-Gated Portfolio Continuation Review concept. Human accountability for all five outcomes, decision rationale, action ownership and applicable follow-up remain unchanged.

## 3. Solution Capabilities

### 3.1 Portfolio Monitoring

Dashboard is an attention-first view with five lenses: **Active Reviews, Overdue, Material Concerns, Evidence Gaps and Reviewed Investments**. Each counts distinct investments, not individual findings; the lenses can overlap. Independent percentage rings describe the resolved represented portfolio, including saved-only investment identities, and pause while that scope is refreshing.

Portfolio provides the broader register, including investments with no active review. It shows derived governance state, the latest decision, the applicable next-review checkpoint and a contextual next step. Reviewed Investments opens each investment’s latest completed decision; History retains all its completed cycles.

### 3.2 Evidence and Assessment

Investment Overview brings together **Project Structure, Financial Activity and Procurement Activity**, with concise source status on each card. A single native **Technical Details** disclosure expands and collapses the underlying records and diagnostics in a bounded, keyboard-scrollable panel. Evidence is kept separate from the six human judgements: Strategic Alignment, Expected Benefits, Delivery Performance, Cost Position, Risk and Future Economic Value.

The human-entered **Review Trigger** records why a review began. **Findings** describe what the assessment identified. A Material trigger does not automatically create a Material Concern. Likewise, source availability does not establish evidence sufficiency or confirm that a person has reviewed it.

### 3.3 Governance Decisions

The reviewer explicitly chooses **Continue, Continue with Conditions, Modify, Pause or Stop**. No outcome is preselected or recommended. Every decision requires a rationale and an eligible Decision Owner selected in Assessment from the fictional prototype directory.

Continue with Conditions, Modify and Pause also require an action, action owner and next-review date. Continue permits optional follow-up; Stop permits optional closure action but does not schedule a continuation review. The 14-day decision target and 30-day escalation threshold use UTC calendar days from the actual review-open time. They are visible controls, not external notifications.

### 3.4 Decision History and Continuity

Each investment can have at most one active review and multiple completed cycles. Inputs autosave as drafts; only **Record Decision** completes a cycle and captures its assessment, evidence summaries, owner, rationale and timing. Completed records are read-only through normal application flows and are not revised by later evidence retrieval.

A non-Stop outcome permits a later human-initiated review. Stop blocks the normal restart path. A Next Review date is a human checkpoint, not an automatic review-creation timer. Records remain local to the browser and origin; their immutability is an application rule, not tamper-proof storage.

## 4. User Journey and Product Demonstration

### 4.1 End-to-End Workflow

```text
Dashboard → Portfolio → Investment Overview → Start / Continue Review
    → Assessment → Review Summary → Governance Decision → History
```

An investment stays in one workspace with **Overview, Current Review and History** tabs. Continue Review resumes Assessment when incomplete or Review Summary when ready. Incomplete work can be previewed in Summary, while Decision remains subject to readiness, eligible-owner and pending-request gates.

### 4.2 Recommended Demonstration

Use Showcase for a repeatable demonstration independent of Sandbox availability. If restoring the baseline, first read the irreversible [Reset Showcase scope](#112-reset-showcase).

1. **Orient the audience:** show Dashboard attention, then Portfolio’s complete loaded register. The seeded baseline contains five Showcase investments, three active reviews and one historical Stop; timing changes with the real clock.
2. **Inspect the investment:** open **Digital Ordering Platform Modernisation** from Portfolio using Continue Review, then select Overview. Show its synthetic context and evidence status. Expand Technical Details to demonstrate traceability to the underlying records, then collapse it.
3. **Explain the review:** return to Current Review. Point out the stored Material trigger and the separate assessment findings. Change or discuss the six judgements as the human reviewer; confirm the governed Decision Owner.
4. **Make the decision explicit:** inspect Review Summary, then choose a human outcome. For a conditional outcome, enter an action, action owner and next-review date, along with a rationale. Record it and show the exact completed cycle in History.
5. **Show continuity if time permits:** return to Overview to explain a later non-Stop cycle. For review initiation, use **Store Technology Infrastructure Refresh**, which starts without a seeded review and requires an explicit Trigger.

Any decisions entered during the demonstration are local illustrative records, not DPE approvals. Rehearse with the chosen scenario and keep technical diagnostics secondary to the business story.

### 4.3 Situation–Complication–Resolution Narrative

Use this suggested five-minute storyline as a customer-facing conversation, not a script to read verbatim:

- **0:00–0:40 — Situation:** “DPE commits resources to technology investments whose strategy, benefits and delivery assumptions can change.” Show the portfolio context.
- **0:40–1:20 — Complication:** “Activity reports tell us what happened, but not whether further expenditure is still justified.” Use the synthetic Digital Ordering case to distinguish the reason for review from its findings.
- **1:20–4:20 — Resolution:** “The Hub makes that reassessment explicit.” Demonstrate evidence → assessment → Summary → a human decision → the saved owner, rationale and follow-up. Explain how the process preserves accountability without choosing for the reviewer.
- **4:20–5:00 — Close:** show History and the applicable next-review checkpoint. Emphasise traceable continuation decisions, then state the prototype’s read-only SAP and local-persistence boundaries.

## 5. Design and Usability Approach

### 5.1 Design Principles

The interface follows the reviewer’s task rather than SAP’s API structure. Business context and next actions lead; raw payloads, filters and HTTP diagnostics remain available through progressive disclosure. Source badges, explicit text labels and restrained category colours help distinguish evidence, reviewer judgement and system status without relying on colour alone.

Dashboard answers “what needs attention?”, Portfolio answers “what investments are represented?”, and the persistent workspace answers “what is happening with this investment?”. The separate How It Works utility explains the model without interrupting the review flow.

### 5.2 Design Thinking in Practice

The starting user need comes from the documented A2 scenario: a technology portfolio or PMO reviewer must assemble a concise continuation review under changing evidence. That problem definition narrowed the product to evidence, judgement and accountable action rather than generic project analytics.

The design explored practical alternatives through successive prototypes: consolidating separate workflow screens into one workspace, replacing repeated evidence panels with a compact status area, and retaining native controls rather than adding a framework. Public Sandbox limitations also led to a source-separated Showcase instead of fabricated live joins. These choices are traceable in [Design](DESIGN.md) and the [decision log](DECISIONS.md).

Refinement was informed by deterministic tests and documented browser walkthroughs covering navigation, failed saves, incomplete reviews and responsive layouts. This is scenario-based prototyping and engineering verification, not a claim of formal DPE interviews or production user research.

### 5.3 Key Usability Decisions

Summary preview lets reviewers inspect incomplete work without misrepresenting it as decision-ready. The Decision gate explains what remains; native choices and linked field errors make invalid submissions correctable while preserving inputs. Keeping Decision Owner selection in Assessment avoids conflicting accountability fields later.

Silent successful autosaving reduces routine interruptions. A failed draft save instead stays visible with **Retry Save**, retains entered values and blocks unsafe navigation. SAP connection failures remain non-blocking where Showcase is usable, while evidence limitations stay beside their sources. Explicit reset confirmation and a single Record Decision commit point make irreversible actions deliberate.

## 6. Getting Started

### 6.1 Prerequisites

Use a modern browser and **Python 3.9+** for the local HTTP preview/proxy server. Git is needed only for cloning; **Node.js 24** is needed for the regression suite, not for running the app. No npm installation, build step, database or SAP key is required for Showcase.

With repository access, clone and enter the project:

```sh
git clone https://github.com/zli806/infosys704-a3.git
cd infosys704-a3
```

Alternatively, extract a repository or supplied ZIP and open a terminal in the extracted directory containing `index.html`. Do not assume the ZIP’s top-level folder has the clone’s name. All commands below run from that project directory; choose one platform’s instructions.

> **Required startup method for grading:** use the supplied **`scripts/serve.py`** server in the platform commands below. It serves the app **and** enables the same-origin SAP proxy. Do **not** substitute `python -m http.server`, an editor's static/Live Server preview, or a double-clicked HTML file when testing SAP: those do not enable the proxy, so SAP may fail in the browser even when curl returns 200. The supplied script uses Python's standard library; no pip installation is needed.

### 6.2 Windows PowerShell

```powershell
python --version
if (-not (Test-Path .\config.local.js)) {
    Copy-Item .\config.example.js .\config.local.js
}
python scripts/serve.py --port 8786
```

The version command must report Python 3.9 or newer. If `python` is unavailable but the Python launcher is installed, use `py -3 --version` and `py -3 scripts/serve.py --port 8786` instead.

### 6.3 Windows Command Prompt

```bat
python --version
if not exist config.local.js copy config.example.js config.local.js
python scripts/serve.py --port 8786
```

If necessary, substitute `py -3` for `python`. If neither executable is available, install Python 3 and reopen the terminal.

### 6.4 macOS

```sh
python3 --version
if [ ! -e config.local.js ]; then
    cp config.example.js config.local.js
fi
python3 scripts/serve.py --port 8786
```

Install Python 3 if `python3` is unavailable. Do not substitute an older system Python interpreter.

### 6.5 Linux

```sh
python3 --version
if [ ! -e config.local.js ]; then
    cp config.example.js config.local.js
fi
python3 scripts/serve.py --port 8786
```

Install Python 3 using the distribution’s supported package manager if needed. On all four platforms, open **http://127.0.0.1:8786/**, leave the server running in **your own terminal window** for the entire demonstration and press **Ctrl+C** there to stop it. Closing that window stops the application server. These commands create the local configuration only if absent; they do not overwrite an existing file.

Use HTTP rather than relying on double-clicked `file://` pages: local-file fetch restrictions and storage behaviour vary by browser. Keep the same browser profile, protocol, hostname and port when resuming work. `localhost`, `127.0.0.1` and different ports have separate storage origins; records do not migrate between them.

### 6.6 SAP API Configuration

The copied `config.example.js` contains a safe placeholder. Leave it unchanged to use Showcase without SAP requests. To enable the optional live connection, obtain your own key from [SAP Business Accelerator Hub](https://hub.sap.com/), edit the ignored `config.local.js` and replace its `SAP_API_KEY` placeholder. Reload the page; Portfolio shows the separate Sandbox connection status and **Refresh SAP Data** action.

Do not place the key in tracked files or publish a static copy containing it. The key is loaded by the browser and is visible in developer tools; Git exclusion is not a production secret-management boundary.

The supplied `scripts/serve.py` server enables a same-origin `/sap-proxy` route automatically, without editing your configuration file. It forwards GET requests only to the app's four SAP resources (projects, project elements, G/L and PO account assignments); keys are not sent to redirects. Use this script for grading even when beginning with Showcase, so SAP testing uses the same server and browser origin. A successful curl GET does **not** test browser CORS/preflight support.

If replacing an existing static server, press **Ctrl+C** in its terminal, run `python scripts/serve.py --port 8786`, then hard-refresh the same browser URL. Keep the same hostname/port to retain access to local reviews. Do not clear browser storage or disable browser security.

#### Grader Startup Verification

1. **Check the terminal:** it must report `Open http://127.0.0.1:8786/ (same-origin SAP proxy enabled). Ctrl+C to stop.` If you chose another port, that port appears instead. Keep this terminal running.
2. **Check the browser:** open the exact HTTP address printed above and select **Portfolio**. With a valid key and successful SAP retrieval, the connection reads **SAP Sandbox · Connected** and Portfolio contains five SHOWCASE investments plus up to five distinct SAP SANDBOX projects. With the placeholder/no key, **Not connected** and five Showcase investments are expected; the Showcase workflow still works.
3. **Check Dashboard separately:** it is a governance-filtered view, not the full Portfolio register. SAP projects appear in a lens only when their saved review/decision meets that lens's criteria. On a fresh browser origin, the synthetic baseline has three active reviews and one reviewed investment; connecting SAP does not fabricate additional reviews. Percentage rings use the resolved represented portfolio, including saved-only review identities.
4. **Keep the same browser profile and address:** changing `127.0.0.1` to `localhost`, changing ports, clearing site data or using Reset Showcase can make previously saved SAP reviews unavailable or remove them. An SAP outage alone does not delete saved governance records. Do not reset data merely to troubleshoot connectivity.

### 6.7 Troubleshooting

| Symptom | Safe response |
| --- | --- |
| Python command is missing or opens an installer prompt | Install Python 3, reopen the terminal and verify the version. Use the alternative executable described above if available. |
| Directory listing, 404 or missing local configuration script | Start the server from the directory containing `index.html` and copy the safe configuration example if absent. |
| Port 8786 is occupied | If it is your old app preview, stop it with Ctrl+C and start `python scripts/serve.py --port 8786`. Otherwise choose a free port, e.g. `python scripts/serve.py --port 8787`, and use the matching browser URL. A new port has separate local review storage. Do not stop an unfamiliar process. |
| SAP is not connected or requests fail | Showcase remains usable. Check local configuration and the visible connection details. Sandbox maintenance, authentication, network or CORS failures require investigation; do not disable browser security. |
| curl returns 200, but the browser reports CORS/preflight failure | Replace the static server with `python scripts/serve.py --port 8786` and hard-refresh. SAP GET availability does not guarantee its OPTIONS response permits browser access. |
| SAP works in Portfolio but a project is absent from Dashboard | Dashboard blocks use saved governance reviews/decisions, regardless of source. An imported SAP project does not create a review, infer human assessments or qualify from its SAP dates/status alone. Start a review explicitly; qualifying saved reviews appear in their matching blocks. |
| No linked evidence is returned | Inspect source qualifications and Technical Details. Empty joins are not proof of zero cost or procurement exposure; do not replace them with Showcase figures. |
| Decision is unavailable or edits are not saving | Follow the readiness explanation or persistent Retry Save message. Keep unsaved inputs open while resolving storage permissions/capacity. |
| Previously saved reviews are absent | Check the browser profile and exact origin, and whether Reset Showcase or clearing site data removed them. There is no shared account or cross-origin migration. |

Use the proxy command on whichever port you choose: for example, stop a static preview on `8789` with **Ctrl+C**, then run `python scripts/serve.py --port 8789`. Changing the port does not fix CORS and creates a separate browser review store. The connection-error recovery message uses the current port so you can replace the server without changing origins.

## 7. Technical Architecture and Project Structure

### 7.1 Architecture Overview

The browser loads ordinary deferred scripts into a shared `window.DPEApp` namespace. The controller coordinates user actions and evidence requests; core rules, services and UI rendering remain separate. The recommended `scripts/serve.py` serves files and proxies the app's allowlisted read-only SAP requests on the same origin. Ordinary static hosting instead uses direct browser-to-Sandbox requests and requires working SAP CORS responses. Neither option stores reviews on a backend.

### 7.2 Component Responsibilities

| Component | Responsibility |
| --- | --- |
| Root runtime | `index.html` owns the shell and script order; `styles.css` owns presentation; `app.js` orchestrates navigation, reviews and retrieval; `api-config.js` defines SAP endpoints and selected fields. |
| `js/core/` | Runtime state, deterministic assessment/readiness/timing rules, identifier/date helpers and exact decimal arithmetic. |
| `js/services/` | SAP HTTP/project/G/L/PO adapters, the separate Showcase provider, fictional governance directory and versioned review store. |
| `js/ui/` | Evidence tables, source/status feedback, Dashboard projections, review forms and historical-record rendering. These modules do not fetch SAP or choose outcomes. |
| `js/data/` | Immutable synthetic SAP-shaped payloads, separate scenario context and baseline governance seeds. |
| Reference and tooling | `api/` contains downloaded specifications; `scripts/`, `tests/`, `docs/` and `.github/` support validation, maintenance and handover rather than browser runtime. |

### 7.3 Repository Directory Tree

The tracked structure below groups test files and historical images for readability. `config.local.js` is deliberately **not tracked** and is created locally during setup.

```text
.
├── index.html
├── styles.css
├── app.js
├── api-config.js
├── config.example.js
├── logo.png
├── js/
│   ├── core/                       # state.js, review-rules.js, utils.js
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
│       ├── renderers.js
│       └── governance.js
├── api/
│   ├── API_ENTERPRISE_PROJECT_SRV_0002.json
│   ├── API_GLACCOUNTLINEITEM.json
│   ├── CE_PURCHASEORDER_0001.json
│   └── CE_PURCHASEREQUISITION_0001.json  # deferred integration; reference only
├── scripts/
│   ├── check_frontend_contract.py
│   ├── serve.py                   # localhost preview + allowlisted SAP GET proxy
│   └── sap_live_validate.py
├── tests/                         # Node regressions and helpers/workspace.js
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API_INTEGRATION.md
│   ├── UI_CONTRACT.md
│   ├── MVP_SCOPE.md
│   ├── PRODUCTISATION_HANDOFF.md
│   ├── REPOSITORY_AUDIT.md
│   └── ui-review/                 # dated captures and their inventory
├── .github/
│   ├── workflows/
│   │   ├── static-checks.yml
│   │   └── sap-live-validation.yml
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── sap-validation-trigger
├── assets/
│   └── dpe-mark.svg               # historic test-referenced asset; not the header
├── premium-ui.json               # development-tool configuration
├── .gitignore
├── PROJECT_CONTEXT.md
├── DECISIONS.md
├── DESIGN.md
├── CONTRIBUTING.md
└── README.md
```

### 7.4 Persistence and Data Flow

Opening an investment retrieves its structure, then dependent financial and procurement evidence through the appropriate source provider. Runtime payloads remain in memory. The store whitelists review inputs, project identity and concise evidence summaries under **`dpeA3.reviews.v1`**; raw SAP transactions and credentials are not persisted with reviews.

Draft updates and formal recording are separate operations. Recording revalidates readiness and ownership, then captures the completed snapshot in one local write. Normal startup adds missing baseline seeds without overwriting edited or completed versions. Cancellation and request identities prevent late evidence responses from populating a different selected investment.

## 8. SAP Integration and Data Provenance

### 8.1 Selected SAP APIs and Implementation Status

The solution selects **four SAP APIs: three core integrations and one deferred extension**. All four specifications are tracked under `api/`; the running application currently connects to the first three. Selection follows the financial-governance question, not the number of available endpoints.

| Selected API | Why it was chosen | Current implementation |
| --- | --- | --- |
| [Enterprise Project — OData V2](api/API_ENTERPRISE_PROJECT_SRV_0002.json) | Establishes which investment is being reviewed, its lifecycle context and the project/WBS identifiers needed to relate other evidence. Dates and supplied milestone fields inform stage-gate discussion without automatically defining DPE governance gates. | Implemented: project retrieval and real UUID navigation to project elements/WBS. |
| [G/L Account Line Items — OData V2](api/API_GLACCOUNTLINEITEM.json) | Shows actual financial postings associated with a project/WBS, grounding cost-position discussion in transaction evidence rather than narrative alone. Returned postings are not assumed to be complete investment cost. | Implemented: exact WBS-primary linkage, with numeric-only project-ID leading-zero equivalence restricted to the fallback path. |
| [Purchase Order — OData V4](api/CE_PURCHASEORDER_0001.json) | Adds purchasing evidence alongside posted activity so a reviewer can examine procurement-related exposure. Account assignments and deletion/final-invoice flags support qualified indicators, not an assumed outstanding-liability total. | Implemented: account assignments matched to exact loaded WBS Internal IDs. Public sample joins remain data-limited. |
| [Purchase Requisition — OData V4](api/CE_PURCHASEREQUISITION_0001.json) | Could extend the forward-looking view to proposed procurement before it becomes a Purchase Order. This is useful pipeline context, but not essential to prove the core continuation-review process. | Deferred: specification/reference only; no application adapter, requests or validator integration. Inclusion depends on defensible project/WBS linkage and not delaying or destabilising the core journey. |

Together, the selection covers lifecycle context, posted financial activity, purchasing evidence and potential upstream procurement. It complements rather than replaces human assessment of strategy, benefits, risk and future value. The [decision log](DECISIONS.md) records the three-core/one-stretch scope choice.

Implemented integrations are read-only. V2 `d.results` and V4 `value` response shapes remain distinct; raw identifiers are retained. [API Integration](docs/API_INTEGRATION.md) details endpoints, field selection and financial interpretation. A downloaded specification does not, by itself, constitute a working integration.

### 8.2 Synthetic Showcase

**SHOWCASE** identifies fictional SAP-schema-compatible scenarios; **SAP SANDBOX** identifies public SAP Business Accelerator Hub samples. Neither is DPE production data. The fictional Decision Owner directory is also prototype configuration, not SAP personnel or authenticated authority.

Showcase payloads use the same amount aggregators as the live path, while illustrative approvals, forecasts and review narratives remain separate context. Live gaps are never silently populated with synthetic rows. The five scenarios cover emerging deterioration, material concerns, an explicit evidence gap, an investment without a review and a historical Stop.

### 8.3 Integration Constraints

The project request is bounded to five Sandbox projects; linked G/L and PO queries return up to 100 rows per request without automatic pagination. Only defensible matching rows enter evidence. Amounts remain separated by currency, without conversion. Financial postings are not complete investment cost, and PO-linked indicators are not validated outstanding liabilities.

Earlier documented samples contained no marked project milestones and no exact project-linked PO assignments. Those are dated sample observations, not hard-coded outcomes. New Sandbox data may differ; empty or partial evidence remains qualified rather than treated as zero exposure.

### 8.4 Failure Handling

No key means no live SAP requests; Showcase remains available. A failed project refresh leaves a persistent connection issue and non-blocking retryable feedback. Structure, financial and procurement failures are presented locally with their source states and available Retry controls.

Readiness checks completeness, not evidential assurance: lifecycle must have loaded, while clearly reported unsuccessful or unavailable G/L/PO attempts can satisfy their attempt checks. Outstanding requests still gate Decision. Save failures are treated separately and never reported as confirmed decisions.

## 9. Testing and Quality Assurance

### 9.1 Automated Testing

The credential-free Node suite covers governance classifications, six-dimension readiness, five outcomes, ownership, conditional follow-up, Stop restrictions, multi-cycle history, controller navigation and real storage-write failures. It also validates Showcase fields against downloaded SAP schemas, exact joins, amount aggregation, provenance separation and reset behaviour.

The current suites have **187 passing JavaScript tests** and **10 Python proxy tests**, including SAP/Showcase Dashboard eligibility parity, current-port connection recovery, routing, startup cache invalidation, origin restrictions, redirect blocking and error handling without SAP credentials. The frontend contract checks **170 functional IDs**, uniqueness and deferred dependency order. These counts describe the tested code, not live SAP availability or user-research evidence.

### 9.2 Browser and Workflow Verification

The [productisation handoff](docs/PRODUCTISATION_HANDOFF.md) records isolated Edge walkthroughs at **1440, 1024, 768 and 390px**, including keyboard/focus handling, validation, save recovery, evidence drill-down, immutable cycles and responsive long text. These were browser automation and visual inspection, not formal DPE acceptance testing or accessibility certification.

The evidence-panel follow-up was also checked at those widths for native expand/collapse, keyboard scrolling, focus handling and unchanged evidence/storage. The redundant per-card View details actions are removed.

For this documentation pass, Windows setup commands were exercised in disposable directories. The macOS/Linux instructions use reviewed POSIX shell syntax with file-copy behaviour checked in a compatible shell; they were not executed on native macOS or Linux hosts. Cross-browser and physical-device validation remain further work.

### 9.3 Continuous Integration

[Frontend Static Checks](.github/workflows/static-checks.yml) runs on `master` pushes, pull requests and manual dispatch, using Node.js 24 and Python 3.12 without SAP credentials. It checks the frontend contract, JavaScript syntax, Python parsing, Node regressions and local proxy regressions.

[SAP Live Validation](.github/workflows/sap-live-validation.yml) is separate: manual dispatch or a change to its dedicated trigger file on `master` runs a read-only validator using the repository’s `SAP_API_KEY` secret. Ordinary source changes do not trigger it. Its connectivity/join reports do not certify browser CORS, UI behaviour or production-data completeness.

### 9.4 Reproducible Test Commands

Run from the project root:

```sh
node --test tests/*.test.js
python scripts/check_frontend_contract.py
python -B -m unittest discover -s tests -p test_sap_proxy.py
node --check app.js
node --check api-config.js
git diff --check
git check-ignore config.local.js
git ls-files config.local.js
```

On macOS/Linux, use `python3` in place of `python`; on Windows, `py -3` is an alternative if installed. `git check-ignore` should name the local configuration and `git ls-files` should return nothing. These Git checks require a clone; a supplied ZIP may not contain Git metadata. Also syntax-check application modules, as CI does:

```powershell
# Windows PowerShell
Get-ChildItem .\js -Recurse -Filter *.js | ForEach-Object {
    node --check $_.FullName
    if ($LASTEXITCODE -ne 0) { throw "JavaScript syntax check failed" }
}
```

```sh
# macOS / Linux
find js -type f -name '*.js' -exec node --check {} \;
```

Live SAP validation requires separate authorisation and configuration; it is not necessary to evaluate Showcase or run these regressions.

## 10. Security, Limitations and Future Enhancements

### 10.1 Security and Credential Handling

`config.local.js` is ignored by Git, but its key is accessible to the browser. Do not deploy or distribute it with a real key, include it in screenshots or copy it into reports. This static design is not a production credential architecture.

Completed application records cannot be edited through normal update/record APIs. However, **localStorage is user-editable, clearable and not a tamper-proof enterprise audit log**. The prototype has no authentication, shared access control, encrypted audit service or centrally enforced approval authority.

### 10.2 Prototype Limitations

The Hub does not automatically detect material triggers, select outcomes, update SAP project status or send escalation notifications. Its directory is fictional and its timing depends on the browser clock. Saved evidence summaries are snapshots, not proof of current retrieval.

Public sample completeness, Sandbox availability and browser CORS remain external dependencies. Local records do not synchronise across users, devices or origins, and deliberate reset/site-data clearing removes them. AI/MCP, Purchase Requisition and a shared enterprise persistence layer are not implemented.

### 10.3 Potential Production Evolution

A production design would need authenticated identity and governed decision authority, server-side credential handling, shared durable storage, tamper-evident audit controls, operational monitoring and recovery. DPE-specific materiality/gate policy would require calibration with authorised business stakeholders rather than adopting prototype categories as corporate policy.

Further integration could address pagination, authoritative investment scope, richer evidence and notifications. Any future AI briefing capability would require traceable source use and validation while preserving human decision authority. These are potential developments, not committed product features.

## 11. Documentation and Handover

### 11.1 Supporting Documentation

- [Project Context](PROJECT_CONTEXT.md) and [Decisions](DECISIONS.md): selected business solution and dated scope decisions; later decisions explain deferred items in the original vision.
- [Design](DESIGN.md) and [UI Contract](docs/UI_CONTRACT.md): visual principles, interaction ownership, feedback and functional hooks.
- [Architecture](docs/ARCHITECTURE.md) and [API Integration](docs/API_INTEGRATION.md): component boundaries, persistence, endpoints, joins and evidence qualifications.
- [MVP Scope](docs/MVP_SCOPE.md): implemented versus data-limited or deferred capabilities.
- [Productisation Handoff](docs/PRODUCTISATION_HANDOFF.md) and [Repository Audit](docs/REPOSITORY_AUDIT.md): dated verification evidence and conservative retention decisions.
- [Contributing](CONTRIBUTING.md): team workflow, reproducible checks and credential safeguards.

### 11.2 Reset Showcase

The footer action requires explicit confirmation. It **irreversibly removes all this app’s locally stored governance reviews, drafts and completed decisions in the current browser/origin, including SAP Sandbox-linked records**, then restores **three seeded active Showcase reviews and one synthetic historical Stop decision**.

It does not delete external SAP records, change API configuration, remove already loaded projects or clear unrelated browser-storage keys. Cancel changes nothing. A failed write preserves the previous storage value, and malformed storage is not silently erased. Reset is an explicit prototype exception to normal record immutability; it is not an enterprise audit operation or a recoverable archive.

### 11.3 Handover Notes

For a repeatable presentation, use a dedicated browser profile, retain the same local URL and review the reset warning before restoring the baseline. Fixed Showcase dates mean timing indicators can change as the real clock advances. Successful normal refreshes do not overwrite recorded decisions.

For maintenance, preserve the separation between evidence, human judgement and calculated controls. Review the contract and decision log before changing the workflow; keep live-source limitations visible and distinguish new verification from historical QA evidence. No production DPE data or credentials should accompany a source handover.
