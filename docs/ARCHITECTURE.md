# Architecture

## Technology Stack

The current assignment prototype intentionally uses HTML, CSS, vanilla JavaScript and browser `fetch()` with SAP Business Accelerator Hub Sandbox APIs. Git/GitHub support collaboration; GitHub Actions and Python's standard library provide remote integration validation.

There is **no frontend framework, npm/build process or application backend**. A local static preview is optional hosting of the same files, not a proxy/backend. The simple stack isolates SAP connectivity and evidence interpretation before later architecture choices. It is not a production credential/security architecture.

## Architecture Diagram

```mermaid
flowchart TD
    Browser["User Browser"] --> App["Prototype App: HTML, CSS, JavaScript"]
    Local["config.local.js: local-only credential"] -.-> App
    App --> EP["Enterprise Project API: OData V2"]
    EP --> Lifecycle["Project / Project Elements / WBS"]
    Lifecycle -->|"WBSElementInternalID: exact"| GL["G/L Account Line Items API: OData V2"]
    Lifecycle -->|"WBSElementInternalID: exact"| PO["Purchase Order API: OData V4"]
    App --> GL
    App --> PO
    Actions["GitHub Actions"] --> Validator["SAP Live Validator: Python standard library"]
    Secret["SAP_API_KEY GitHub repository secret"] -.->|"Step environment only"| Validator
    Validator --> EP
    Validator --> GL
    Validator --> PO
    Validator --> Reports["Validation artifact and step summary"]
```

The WBS arrows describe logical joins, **not SAP API-to-API calls**. The browser and validator independently make read-only requests. **WBSElementInternalID is the preferred primary cross-API link**; WBS matching remains exact. Numeric-only ProjectInternalID leading-zero equivalence is limited to the secondary G/L fallback. Raw SAP identifiers are retained.

## Application Structure and State

- `index.html` loads `config.local.js`, `api-config.js`, then `app.js` using deferred scripts. Keep that order.
- `api-config.js` exposes separate `SAP_API_CONFIG`, `GL_API_CONFIG` and `PO_API_CONFIG` objects. It contains endpoints/selected fields, not credentials.
- `app.js` currently contains selection state, request construction, response checks, rendering, monetary summaries and DOM hooks in one closure. It is not yet modularised.
- The page first retrieves up to five projects. Selecting one loads its elements and retains WBS IDs. Separate buttons load G/L and PO evidence; they are not automatically loaded on selection.
- Selecting/reloading a project clears prior financial/procurement evidence. Request cancellation and request IDs prevent stale responses from populating a different project's panels.
- Full accepted records remain in memory; raw/debug areas show safe responses separately. There is no application persistence or stored decision record. Reloading the page loses current selection/evidence state.
- G/L/PO queries are limited to 100 returned rows per linked request. There is no automatic pagination; continuation warnings mean counts/amounts are not complete-project totals.

UI contributors primarily work in `styles.css` and `index.html`, coordinating any rendering/DOM changes in `app.js`. Technical integration contributors own requests/configuration/validation changes; requirement contributors validate the business journey against the scope/context. See [CONTRIBUTING.md](../CONTRIBUTING.md).

## Data Responsibility

| Source | Responsibility |
| --- | --- |
| SAP evidence, available now where samples join | Project identity/lifecycle, Project Elements/WBS, financial postings and procurement account assignments. These are real Sandbox samples, not DPE production records. |
| Future DPE governance evidence, not implemented yet | Review/gate configuration, strategic alignment, benefit outlook, risks/dependencies, rationale/actions and accountable human decision. |

Future human-entered or prototype-local governance information must be labelled separately, **not represented as SAP data**. Missing milestones/PO joins cannot be filled with fake SAP records. AI, if added later, supports evidence synthesis rather than making the final continuation decision.

## OData Versions

| API | Collection shape |
| --- | --- |
| Enterprise Project | OData V2 → `data.d.results` |
| G/L Account Line Items | OData V2 → `data.d.results` |
| Purchase Order | OData V4 → `data.value` |

The validator retains separate V2/V4 collection checks over shared HTTP/JSON transport. It supports the existing gzip/deflate and UTF-8 BOM handling. Do not assume one collection parser works for every SAP API. [API Integration](API_INTEGRATION.md) documents endpoints and join semantics.

## Security Boundary

**Local:** the browser key lives only in ignored/untracked `config.local.js`, copied from the safe example. It is accessible to that browser and its developer tools, so it is not a true server-side secret. Do not deploy/share the page with a real key.

**CI:** GitHub Actions passes repository secret `SAP_API_KEY` only to the validation step's environment. The script never reads `config.local.js`. Reports exclude keys, credential headers and complete raw payloads; exact-key redaction occurs before output, and HTTP redirects are blocked. Neither credential belongs in tracked repository content, screenshots or PRs.

Remote validation proves API connectivity/joins, not browser CORS or UI correctness. No PR-triggered validation, branch protection, production proxy or automated approval rule is introduced by this documentation PR.

## Repository Tree

The tree below includes the local-only configuration explicitly; a fresh clone will not contain that ignored file. `.git/` is omitted.

```text
.
├── .github/
│   ├── workflows/
│   │   └── sap-live-validation.yml
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── sap-validation-trigger
├── api/
│   ├── API_ENTERPRISE_PROJECT_SRV_0002.json
│   ├── API_GLACCOUNTLINEITEM.json
│   ├── CE_PURCHASEORDER_0001.json
│   └── CE_PURCHASEREQUISITION_0001.json
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API_INTEGRATION.md
│   └── MVP_SCOPE.md
├── scripts/
│   └── sap_live_validate.py
├── .gitignore
├── api-config.js
├── app.js
├── config.example.js
├── config.local.js                 # local-only, ignored/untracked
├── CONTRIBUTING.md
├── DECISIONS.md
├── FIRST_OPENCODE_PROMPT.md
├── index.html
├── PROJECT_CONTEXT.md
├── README.md
└── styles.css
```

`api/` holds read-only downloaded specifications; `docs/` explains engineering/scope; `.github/` holds workflow and review infrastructure; `scripts/` holds remote validation; the root HTML/CSS/JS files are the current browser app. `FIRST_OPENCODE_PROMPT.md` is historical bootstrap material, not permission to rerun setup or override current decisions/contribution rules.

Runtime `validation-report.json` and `validation-summary.md` are generated outputs, not committed source files. The workflow uploads them as artifacts; do not add them or generated bytecode to a routine PR.
