# Contributing

## Coordinate and review

Normal teammate work follows **branch → PR → review → merge**. The repository admin/technical integration owner may directly update `master` only for explicitly authorised integration work. Agree scope before overlapping UI, core, controller or API changes; never discard another contributor's edits.

Start with `git status`; if clean, sync with `git checkout master` and `git pull --ff-only origin master`, then create a focused branch. Read [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md), [DECISIONS.md](DECISIONS.md), [README.md](README.md) and the relevant [docs/](docs/) pages. Stage explicit files and inspect the staged diff. Describe behaviour and actual validation in the [PR template](.github/PULL_REQUEST_TEMPLATE.md); get the appropriate technical/BA/PO review before merging.

## Validate the current workflow

The app loads showcase immediately; live SAP auto-loads when configured. Open Investment enters Overview/evidence; Start Review first captures a human Review Trigger in the small dialog. Continue Review enters Assessment when incomplete or Review Summary when ready. Stages stay in Current Review; Record Decision opens the exact immutable History record. No manual API-button sequence is needed.

Run:

```sh
node --test tests/*.test.js
python scripts/check_frontend_contract.py
python -B -m unittest discover -s tests -p test_sap_proxy.py
node --check api-config.js
node --check app.js
git diff --check
git check-ignore config.local.js
git ls-files config.local.js
```

Also syntax-check every affected `js/**/*.js` file and syntax-parse the Python scripts without executing validators. The committed Node suite covers rules, controller/DOM flows, persistence, showcase schemas and totals; CI runs it without SAP credentials. It does not replace browser testing.

For UI changes, exercise ready-review and new-review paths, all five unselected outcome choices, rationale/follow-up validation, reload persistence, dashboard explanations, empty/error states, source switching and narrow/keyboard operation. Update [UI Contract](docs/UI_CONTRACT.md), implementation and checker together when hooks change. Record what passed and what was not tested.

For agreed integration validation, use the existing [remote SAP workflow](docs/API_INTEGRATION.md#remote-sap-live-validation). It is manual/trigger-file based, not a routine every-commit live test. A green result validates connectivity/joins, not browser rendering or production data completeness.

## Security and data integrity

- Never commit `config.local.js`, API keys, tokens, generated raw captures or secrets copied from developer tools. `git check-ignore` must name the local config; `git ls-files config.local.js` must be empty. Inspect the whole staged diff for copied credentials. Do not publish a page containing a real key or share Network screenshots/headers.
- Keep `config.example.js` a placeholder. Only an authorised repository owner manages CI secret `SAP_API_KEY`; browser-side configuration is not a production secret store.
- Keep SHOWCASE synthetic payloads/context separate from the live SAP Sandbox path. Never fabricate live evidence, fill empty joins with showcase rows, or claim synthetic data is valid SAP production records.
- Inspect downloaded specifications before using fields/types. Preserve V2 `d.results`, V4 `value`, exact WBS joins, numeric-only project-ID fallback, raw identifiers, currency separation, filter-integrity checks and qualified amount interpretation. Do not invent meanings for SAP codes without verified code lists.
- Coordinate changes in API services/configuration/validation with the integration owner. Do not change specs to fit code or hide integration changes in a visual PR. See [Architecture](docs/ARCHITECTURE.md) and [API Integration](docs/API_INTEGRATION.md) rather than duplicating them here.
- **Evidence → assessment → signals → human decision → rationale/follow-up.** All five outcomes remain human-selected. Signals are not recommendations; there is no system decision to override. Rationale is required for every outcome; conditional/Modify/Pause follow-up remains required. Material business changes require an agreed, dated entry in `DECISIONS.md`.
