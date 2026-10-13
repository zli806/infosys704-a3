# DPE IT Investment Review Prototype

## Project Purpose

This is the INFOSYS 704 A3 working functional prototype for Domino's Pizza Enterprises (DPE). It supports the A2 **Stage-Gated Portfolio Continuation Review** solution: assemble investment evidence so an accountable human can reassess whether an IT project should continue. It is currently an evidence-retrieval baseline, not yet the complete review/decision workflow.

[PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) defines the business solution; [DECISIONS.md](DECISIONS.md) records subsequent decisions. See [MVP scope and remaining work](docs/MVP_SCOPE.md) before adding features.

## Current Technical Status

Team-confirmed public SAP Sandbox observations as of **14 October 2026**; sample contents and counts can change. These are not permanent production facts or DPE production records.

| Source | Current status |
| --- | --- |
| Enterprise Project | Live integration works. Projects, Project Elements and real WBS IDs are available. The five tested projects contained 26 elements, none marked as milestones/main milestones. |
| G/L Account Line Items | Live integration works. Exact WBS joins were verified: TEMP003 returned **40** linked records; I1000 returned **2**. WBS is the preferred cross-API identifier. |
| Purchase Order | API connectivity works and exact-WBS matching is implemented. Tested Enterprise Project WBS IDs do **not** join to the current public Sandbox PO samples. No fake PO linkage is used. |
| Purchase Requisition | Specification downloaded; not implemented; stretch scope. |
| MCP | Not integrated. |

Real API responses supply the displayed SAP evidence. Empty results are reported honestly, and unrelated diagnostic records never become project evidence. Detailed findings and amount-interpretation limits are in [API Integration](docs/API_INTEGRATION.md).

## Quick Start

1. Copy `config.example.js` to `config.local.js` **only if your local file does not already exist**.
2. Put your SAP Sandbox API key in `config.local.js`, replacing `PASTE_YOUR_SAP_SANDBOX_API_KEY_HERE`. Keep the quotes. **Never commit or share this file.** It is ignored by Git; browser-side credentials are still visible to your local browser/dev tools.
3. Open `index.html` in a modern browser. No npm, build tool or application backend is needed. If `file://` restrictions block requests, use a trusted editor's local static preview at `http://localhost`. Static hosting does not fix SAP-side CORS restrictions; do not disable browser security or use an untrusted proxy.
4. Follow **Load Projects → View Project Elements → Load Financial Evidence → Load Purchase Order Evidence**. Evidence buttons require loaded project elements/WBS as appropriate; a successful G/L join is not required for the PO check.
5. Inspect status messages and collapsible raw/debug responses. Zero PO joins are expected in the currently tested samples, not an app failure. Changing project or reloading projects clears old evidence. See [troubleshooting](docs/API_INTEGRATION.md#errors-and-browser-troubleshooting) for failures.

## Repository Guide

| Path | Purpose |
| --- | --- |
| [README.md](README.md) | Teammate landing page and quick start. |
| [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) | Business problem, A2 solution, governance boundary and target journey. |
| [DECISIONS.md](DECISIONS.md) | Dated implementation/business decisions and verified limitations. |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Branching, review, security and contribution guidance. |
| [index.html](index.html) | Page structure, evidence sections and JavaScript DOM hooks. |
| [styles.css](styles.css) | Presentation/layout; main starting point for UI refinement. |
| [app.js](app.js) | Controller: user actions, state/cancellation, service results and UI coordination. |
| [js/core/](js/core/) | Shared runtime state and date/identifier/decimal utilities under `DPEApp`. |
| [js/services/](js/services/) | HTTP, explicit V2/V4 integrations, join validation and existing summary calculations. |
| [js/ui/](js/ui/) | DOM hooks, tables, status/error/raw views; starting point for rendering changes. |
| [api-config.js](api-config.js) | Separate Enterprise Project, G/L and PO endpoint/field configuration. |
| [config.example.js](config.example.js) | Safe placeholder to copy for local setup. |
| `config.local.js` | Local-only API key; ignored/untracked, not available in a fresh clone. |
| [api/](api/) | Four downloaded official SAP specifications; do not edit to make code work. |
| [scripts/sap_live_validate.py](scripts/sap_live_validate.py) | Standard-library Python remote connectivity and join validation. |
| [scripts/check_frontend_contract.py](scripts/check_frontend_contract.py) | Credential-free HTML ID/script-order contract check. |
| [.github/workflows/sap-live-validation.yml](.github/workflows/sap-live-validation.yml) | Secret-based GitHub Actions validator and report artifacts. |
| [.github/workflows/static-checks.yml](.github/workflows/static-checks.yml) | Automatic PR structural/syntax checks; no SAP credentials or API calls. |
| [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md) | Review/testing/data-integrity checklist for PRs. |
| [docs/](docs/) | Architecture, detailed integration behaviour and MVP scope. |

## Team Workflow

**Do not push normal feature changes directly to `master`.** Use **branch → Pull Request → review → merge**. See [CONTRIBUTING.md](CONTRIBUTING.md) for commands and checks. This is a team policy; this documentation does not itself configure GitHub branch protection.

Coordinate shared core/API changes with the technical/integration owner. UI/UX work primarily belongs in `index.html`, `styles.css` and `js/ui/`; API work belongs in `js/services/` and `api-config.js`, with `app.js` as the controller boundary. PR static checks run automatically; they do not replace runtime regression testing. Requirement/business-flow refinements still follow the context, scope and decision log.

## Documentation

- [Architecture and repository tree](docs/ARCHITECTURE.md)
- [UI hooks and script contract](docs/UI_CONTRACT.md)
- [API Integration, Sandbox findings and remote validation](docs/API_INTEGRATION.md)
- [MVP Scope, status and acceptance principles](docs/MVP_SCOPE.md)
- [Contributing and Pull Requests](CONTRIBUTING.md)
