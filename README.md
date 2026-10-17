# DPE IT Investment Governance Hub

## What this is

An INFOSYS 704 A3 Stage-Gated Portfolio Continuation Review prototype: **five synthetic showcase investments alongside real SAP Sandbox projects**, human assessment/decision and deterministic governance controls. One application, no Demo/Live toggle, automated recommendation or SAP write-back.

Showcase cases are synthetic records shaped to the downloaded SAP API specifications, not SAP Sandbox or real DPE data. They supply a coherent portfolio scenario that public Sandbox samples do not provide; approved/forecast context is kept outside the SAP-shaped records.

## Run it

1. Copy `config.example.js` to `config.local.js` only if the local file does not already exist.
2. Add your own SAP Sandbox API key to `config.local.js` to enable the separate live connection. Showcase needs no key or fetch.
3. Open `index.html` through a trusted local static web preview (`http://localhost`). No npm/build/backend is required; do not disable browser security.
4. Showcase projects/reviews appear immediately. Live SAP projects also auto-load when a key exists. Open an investment; evidence loads automatically. Portfolio shows the separate SAP connection status beside **Refresh SAP Data**; no key is needed for Showcase.

Reviews/decisions are browser/origin-local. Owners come from an explicitly fictional prototype governance directory, not SAP/DPE staff. Keep the same preview address to resume records. Empty SAP joins and storage failures remain visible.

**Reset Showcase** in the footer restores the presentation baseline after confirmation, removing only showcase reviews/decisions—not other local records or SAP configuration. Normal refresh preserves your decisions. Fixed scenario dates are historical; overdue counts use the real clock (the initial 3/7/1 signal profile has one overdue review on 15 October 2026).

## MVP Flow

**Dashboard | Portfolio → Investment Governance Workspace**

Core navigation is **Dashboard | Portfolio**; the visually separate **How It Works** utility gives a short product introduction. Dashboard combines current governance attention with portfolio-wide **Recorded Decisions** in one shared list. The first four lenses may overlap; Recorded Decisions counts completed review records, not distinct investments. Portfolio retains all loaded investments, including those with no reviews or decisions.

Each investment has one workspace: **Overview | Current Review | History**. Overview owns context/evidence; **Start Review** captures the human-selected Review Trigger before creating the cycle. Dashboard displays that stored trigger—it never infers it. **Continue Review** enters Assessment when incomplete or Review Summary when ready. Summary can also preview incomplete assessments; Governance Decision stays readiness-gated. Once ready, all three stages are freely navigable.

**Record Decision → History**, with a small save acknowledgement and the exact immutable record expanded. Dashboard/Portfolio use **View Decision**; History keeps **View Record**, always selecting the exact cycle. Investments have **0..N completed cycles and at most one active review**; after a non-Stop outcome, Overview may Start New Review at a future human stage gate/trigger. Stop has no normal restart path. Next Review is a checkpoint, not an automatic review timer.

An active review supersedes the previous cycle’s Next Review date in current governance views (shown as — in Portfolio). Stop does not schedule a next review; the store also rejects starting a normal review after the latest Stop. Historical decision records remain unchanged.

Decision offers five human outcomes, never a recommendation. Rationale, owner, conditional follow-up and 14/30-day controls remain. Inputs autosave locally: **Saved** means persisted, not ready or formally recorded. A failed save keeps edits visible and blocks leaving until **Retry Save** succeeds. Only **Record Decision** creates immutable history. Historical-only snapshots remain labelled/read-only; the optional fresh-record Back to Dashboard selects Recorded Decisions once.

Violet **SHOWCASE** badges identify synthetic scenarios; blue **SAP SANDBOX** badges identify SAP Business Accelerator Hub Sandbox samples. Neither is DPE production data. Missing-key status is neutral; a failed SAP project refresh uses a non-blocking toast while Showcase remains available. Evidence failures stay local to their cards; governance storage/save failures stay persistent, not in disappearing toasts.

## Team Working Rule

Teammates: **branch → PR → review → merge**. The repository admin/technical integration owner may directly update master for coordinated baseline/integration work.

Never commit/share **`config.local.js`, API keys or secrets**. Browser-side credentials remain visible to your local developer tools. Static checks run on PRs and master pushes, without SAP credentials.

## Where to change things

| Area | Files |
| --- | --- |
| UI / UX | `index.html`, `styles.css`, `js/ui/` |
| SAP / Integration | `js/services/`, `api-config.js` |
| Review / business workflow | `app.js`, `js/services/review-store.js`, `js/core/review-rules.js` |
| Detailed technical information | `docs/` |

## More Detail

- [MVP scope and limitations](docs/MVP_SCOPE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [API integration](docs/API_INTEGRATION.md)
- [Contributing](CONTRIBUTING.md)
