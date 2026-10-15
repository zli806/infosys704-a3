# DPE IT Investment Governance Hub

## What this is

An INFOSYS 704 A3 Stage-Gated Portfolio Continuation Review prototype: **five synthetic showcase investments alongside real SAP Sandbox projects**, human assessment/decision and deterministic governance controls. One application, no Demo/Live toggle, automated recommendation or SAP write-back.

Showcase cases are synthetic records shaped to the downloaded SAP API specifications, not SAP Sandbox or real DPE data. They supply a coherent portfolio scenario that public Sandbox samples do not provide; approved/forecast context is kept outside the SAP-shaped records.

## Run it

1. Copy `config.example.js` to `config.local.js` only if the local file does not already exist.
2. Add your own SAP Sandbox API key to `config.local.js` to enable the separate live connection. Showcase needs no key or fetch.
3. Open `index.html` through a trusted local static web preview (`http://localhost`). No npm/build/backend is required; do not disable browser security.
4. Showcase projects/reviews appear immediately. Live SAP projects also auto-load when a key exists. Open an investment; evidence loads automatically. Use **Refresh SAP Data** or **Retry** if needed.

Reviews/decisions are browser/origin-local. Owners come from an explicitly fictional prototype governance directory, not SAP/DPE staff. Keep the same preview address to resume records. Empty SAP joins and storage failures remain visible.

**Reset Showcase** in the footer restores the presentation baseline after confirmation, removing only showcase reviews/decisions—not other local records or SAP configuration. Normal refresh preserves your decisions. Fixed scenario dates are historical; overdue counts use the real clock (the initial 3/7/1 signal profile has one overdue review on 15 October 2026).

## MVP Flow

**Dashboard → Investments → Investment Details → Continuation Review → Summary → Decision → Confirmation**

Ready reviews resume at Summary; incomplete ones resume Assessment. **Make Governance Decision** exposes five human choices: Continue, Continue with Conditions, Modify, Pause or Stop—never a system recommendation. Rationale is required; signals inform, not determine, the outcome. Dashboard categories and collapsed explanations show why reviews are flagged. Review-open time drives the 14/30-day controls; saved evidence is a snapshot, not a fresh SAP call or complete-cost/liability claim.

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
