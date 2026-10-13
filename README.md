# DPE IT Investment Governance Hub

## What this is

An INFOSYS 704 A3 web prototype combining **real SAP Sandbox evidence**, **human continuation-review assessment/decision**, and **system-calculated governance controls**. No separate demo mode, fabricated SAP transactions, AI decision or SAP write-back.

## Run it

1. Copy `config.example.js` to `config.local.js` only if the local file does not already exist.
2. Add your own SAP Sandbox API key to `config.local.js`.
3. Open `index.html` through a trusted local static web preview (`http://localhost`). No npm/build/backend is required; do not disable browser security.
4. Click **Load SAP Projects**, then **View Investment**. Load lifecycle/financial/procurement evidence and start a review.

Reviews/decisions are saved only in this browser/origin's localStorage. Keep the same preview address to resume them. Empty SAP joins are reported honestly; storage failures are visible, not treated as successful saves.

## MVP Flow

**Dashboard → Investments → Investment Details → Continuation Review → Summary → Decision → Confirmation**

Readiness checks completeness—not a score or recommendation. The human selects Continue, Continue with Conditions, Modify, Pause or Stop. Review-open time drives the 14-day target / 30-day escalation threshold. Saved evidence is a labelled snapshot, not a fresh SAP call or complete project-cost/outstanding-liability claim.

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
