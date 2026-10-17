# Governance validation summary

## Verified behaviour

- Next Review rejects invalid or past browser-local dates at confirmation, including across local midnight. Continue may omit the date; Stop strips it. Existing history remains readable.
- Canonical UUID matching preserves one active review per investment and prevents stale active confirmation after Stop.
- Review Summary contains assessment synthesis and an Overview link. History retains saved financial context, currencies, sources and limitations without reconstructing older context from live values.
- Portfolio and Overview distinguish Follow-up due today / Follow-up date passed from active-review decision deadlines. No automatic review or Dashboard metric is added.
- Five human outcomes, immutable multi-cycle History, Reset Showcase and separate SHOWCASE/SAP sources remain covered by regression tests.

## Automated validation

Run `node --test tests/*.test.js` and `python3 scripts/check_frontend_contract.py`.
Run the date/checkpoint tests with `TZ=Pacific/Auckland`, `TZ=America/Los_Angeles` and `TZ=UTC` to check both sides of UTC and local midnight.

## Manual validation scope

Browser checks cover decision entry, history selection and persistence, storage failure recovery, narrow layout, keyboard navigation and SAP Sandbox evidence loading/retry. Sandbox data is not production data, and zero matched records do not establish zero exposure. Browser-local history is not a production shared audit system.
