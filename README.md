# Domino’s Investment Governance Hub

## Product overview

A working **INFOSYS 704 A3** prototype implementing the group's selected **Financial-domain A2-D1 Stage-Gated Portfolio Continuation Review** solution for Domino’s Pizza Enterprises Limited (DPE).

The business problem is avoidable further expenditure when an IT investment's strategy, benefits, delivery, costs or risks change after approval. The Hub brings evidence and human judgement into a structured review, producing an **accountable, documented and traceable continuation decision**. It does not choose the outcome for the reviewer.

The complete journey works without an SAP key using five clearly labelled synthetic Showcase investments. Optional read-only SAP Sandbox integrations add project/WBS, accounting and procurement evidence. There is no npm installation, build step or application backend.

## Quick Start

Clone with repository access, or extract the supplied files. Run from the directory containing `index.html`:

```powershell
git clone https://github.com/zli806/infosys704-a3.git
cd infosys704-a3
if (-not (Test-Path config.local.js)) { Copy-Item config.example.js config.local.js }
python -m http.server 8786 --bind 127.0.0.1
```

Open **http://127.0.0.1:8786/** in a modern browser. If using supplied files, omit the clone/cd commands. Python 3 supplies static hosting only; Node.js is needed for tests, not to run the app. The configuration-copy command is PowerShell and deliberately does not overwrite an existing file; on other systems copy the safe example only if the local file is absent.

- **No SAP key:** leave the example placeholder unchanged. Showcase evidence, reviews, owner choices and decision history remain usable without network requests to SAP.
- **Optional live SAP:** obtain your own key from [SAP Business Accelerator Hub](https://hub.sap.com/) and set `SAP_API_KEY` in the ignored `config.local.js`. Reload; Portfolio shows connection status beside **Refresh SAP Data**. Never put the key in tracked code or share it.
- **Persistence:** reviews and decisions belong to this browser and origin. Keep the same protocol, hostname and port to resume them. `file://`, `localhost` and `127.0.0.1` are different origins; records do not automatically migrate between them. Do not disable browser security to work around CORS.

## Recommended Marker Walkthrough

1. **Dashboard:** inspect Active Reviews, Overdue, Material Concerns, Evidence Gaps and Reviewed Investments. Each counts distinct investments; lenses overlap and percentages do not sum to 100%. A fresh Showcase baseline has **3 active reviews and 1 reviewed investment**; overdue status uses the real clock.
2. **Portfolio → Open Investment:** choose **Store Technology Infrastructure Refresh**, initially Monitoring. Overview contains its business context and three source-labelled Evidence cards. **View details** opens the matching existing technical section; raw data and qualifications remain available.
3. **Start Review:** explicitly select a scheduled stage-gate review or material trigger. No review is created on Cancel. The trigger records *why* the review began, not what its findings must be. Existing active investments instead offer **Continue Review**.
4. **Assessment:** enter the six human judgements and choose an eligible fictional Decision Owner. Optional reviewer notes autosave silently. Review Summary can preview incomplete work; Governance Decision explains its readiness gate rather than opening prematurely.
5. **Review Summary → Governance Decision:** inspect the matrix, governance timeline and compact **Evidence Status**. Choose one of five outcomes and enter a rationale. Continue with Conditions, Modify and Pause also require an action, action owner and next review date. An incomplete Record attempt shows linked field errors and preserves inputs.
6. **Record Decision → History:** the exact saved cycle expands with rationale, follow-up, accountable owner, provenance and frozen assessment/evidence/timing. **View Record** selects other cycles. After a non-Stop outcome, Overview can start a later review; Stop has no normal restart path or continuation date.
7. Use the optional **How It Works** utility for a short introduction. To repeat the demonstration, use [Reset Showcase](#reset-showcase) only after confirming its irreversible local-data scope.

The six dimensions are Strategic Alignment, Expected Benefits, Delivery Performance, Cost Position, Risk and Future Economic Value. Findings support judgement; the app provides **no score, preselected outcome, automatic Review Trigger or decision recommendation**.

## Implemented features

| Area | Working capability |
| --- | --- |
| Monitoring | Five overlapping investment-level Dashboard lenses; Portfolio retains the full loaded investment register, including Monitoring investments with no review. Independent percentages describe the resolved represented portfolio, including saved-only identities; they pause at — while SAP scope is resolving. |
| Evidence | Enterprise Project and real UUID/WBS navigation; WBS-primary G/L linking with numeric-only project-ID fallback; exact-WBS Purchase Order account assignments. Overview drill-down preserves raw/error/filter diagnostics and source qualifications. |
| Governance | Human Review Trigger, six qualitative assessments, governed prototype owner, incomplete Summary preview and readiness/request gates. The 14-day target and 30-day escalation threshold are displayed controls, not external alerts. |
| Decisions | Continue, Continue with Conditions, Modify, Pause or Stop; required rationale/owner, conditional follow-up and unchanged Stop restrictions. Only Record Decision commits a completed record. |
| Continuity | One active review per investment, repeated historical cycles and immutable snapshots through normal app APIs. Drafts survive stage/tab navigation and reload; failed saves keep edits visible, offer Retry Save and block unsafe navigation. |
| Presentation | Responsive Dashboard/Portfolio/workspace, keyboard-accessible native controls, contextual help, field validation, categorical outcome tones and progressive disclosure. SAP project failures remain non-blocking; evidence errors stay local; governance persistence errors stay explicit. |

## Data provenance and SAP connection

**SHOWCASE** (violet) is synthetic SAP-schema-compatible scenario data, with separate fictional governance context. **SAP SANDBOX** (blue) is the public SAP Business Accelerator Hub sample environment. **Neither represents DPE production data.** Owners are an explicitly fictional Prototype Governance Directory, not authenticated SAP/DPE employees.

An unavailable Sandbox, missing key or incomplete live join does not invalidate Showcase. The app never silently replaces live-project evidence with synthetic rows. A successfully retrieved source is not necessarily sufficient evidence and does not confirm human review. Financial postings are not complete project cost; procurement amounts are not validated outstanding liability.

Requests are read-only. V2/V4 collection shapes, exact WBS joins, separate currencies and filter-integrity checks are preserved; no fabricated join, currency conversion or SAP write-back occurs. Retrieval is bounded to five Sandbox projects and up to 100 rows per linked G/L/PO query, without automatic pagination. Previously tested public PO samples had zero exact project joins; this is a dated data limitation, not a hard-coded result or assurance of zero exposure. See [API Integration](docs/API_INTEGRATION.md).

Browser-side keys are visible to local developer tools and are **not production-secure secrets**. Never publish the static files with a real `config.local.js`. SAP-side maintenance, authentication, network and CORS restrictions may prevent live retrieval; a static server cannot fix SAP-side CORS. The app reports these states while preserving Showcase usability.

## Reset Showcase

This prototype action requires explicit confirmation. It **irreversibly clears all app-owned local governance reviews, drafts and decisions, including locally saved SAP Sandbox reviews**, then restores **three seeded active SHOWCASE reviews and one synthetic historical Stop decision**.

It does not delete external SAP records, change API configuration, remove loaded projects or erase unrelated browser storage. Cancellation changes nothing; normal startup/refresh preserves edited and completed records. Failed saves/reset writes remain protected rather than being reported as success. Reset is an explicit prototype exception to normal record immutability, not an enterprise audit operation.

## Architecture and engineering highlights

- Plain HTML/CSS/JavaScript with separated state/rules, SAP services, source providers, UI rendering and controller orchestration; no framework/backend dependency.
- Transactional evidence, human assessment and calculated governance controls have distinct ownership and provenance.
- Explicit accountable ownership and conditional follow-up connect decisions to action; immutable completed snapshots retain traceability across later review cycles and evidence refreshes.
- Deterministic classification/readiness/timing, exact amount aggregation, defensive source matching, request cancellation and credential-free regressions support repeatable evaluation.
- Graceful degradation and progressive disclosure keep the executive journey usable without hiding uncertainty or technical evidence.

## Testing, limitations and further documentation

From the repository root (Node.js 24 is used in CI; Python 3 is required for the checker):

```powershell
node --test tests/*.test.js
python scripts/check_frontend_contract.py
node --check app.js
node --check api-config.js
git diff --check
git check-ignore config.local.js
git ls-files config.local.js
```

The final command must return no tracked credential file. Also syntax-check changed `js/**/*.js` modules as described in [Contributing](CONTRIBUTING.md). Tests cover rules, controller/form flows, storage errors, source separation and fixture schemas/joins; they do not certify live SAP availability or formal screen-reader/WCAG conformance.

LocalStorage is browser/origin-local, user-editable and clearable: **immutable application records are not tamper-proof enterprise audit storage**. There is no authentication, shared database, production approval authority, automatic trigger detection, external escalation notification or AI/MCP integration. Purchase Requisition remains deferred. Historic scenario dates are fixed; user-created timestamps and timing status use the real browser clock.

- [Architecture and persistence boundaries](docs/ARCHITECTURE.md)
- [API integration, join semantics and live-validation guidance](docs/API_INTEGRATION.md)
- [UI contract, feedback and accessibility behaviour](docs/UI_CONTRACT.md)
- [Scope and limitations](docs/MVP_SCOPE.md)
- [Contributor guidance and team workflow](CONTRIBUTING.md)
- [Productisation handoff and verification](docs/PRODUCTISATION_HANDOFF.md)
