# Contributing

This university group project uses focused branches and reviewed Pull Requests. The technical/integration owner coordinates API/state changes; teammates can lead UI/UX, requirement validation and business-flow refinement. Agree the goal and affected files before overlapping work.

## Before Starting Work

Check `git status` first. Do not discard someone else's edits, overwrite `config.local.js`, or switch branches over unclear local work. If the tree is clean:

```sh
git checkout master
git pull origin master
git checkout -b ui/review-pack-layout
```

Prefer `git pull --ff-only origin master` when you want Git to stop rather than create an unexpected merge. Read [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md), [DECISIONS.md](DECISIONS.md), [README.md](README.md) and the relevant [docs/](docs/) pages before changing behaviour.

Use a short, descriptive branch name:

| Prefix | Example |
| --- | --- |
| `feature/` | `feature/decision-record` |
| `fix/` | `fix/po-empty-state` |
| `ui/` | `ui/review-pack-layout` |
| `docs/` | `docs/update-architecture` |
| `chore/` | `chore/team-collaboration-baseline` |

## Pull Request Rule

Normal changes go through **branch → PR into `master` → review → merge**. Do not push directly to `master` unless the team explicitly agrees that an emergency repository-maintenance change requires it. Do not automatically merge your own work without the agreed review.

Keep each PR focused. Do not combine a large UI redesign, API integration, business-rule changes and unrelated documentation in one PR. Use the [PR template](.github/PULL_REQUEST_TEMPLATE.md); explain the problem, the change and how it was checked. Request a teammate review, including the technical owner for integration changes and the requirement/business-flow owner for material governance changes. No named reviewer or approval-count rule is configured by this documentation.

Stage explicit files, inspect the staged diff, commit, and push **your branch**:

```sh
git add styles.css index.html
git diff --cached
git commit -m "Refine evidence page layout"
git push -u origin ui/review-pack-layout
```

Then create a PR on GitHub with base `master`. Wait for review and resolve comments; do not make normal changes directly on `master`.

## Before Opening a PR

- Fetch/pull the latest `master` and resolve conflicts on your branch without discarding others' work. One explicit approach is `git fetch origin` followed by `git merge origin/master` on your feature branch; re-run checks afterwards.
- Run relevant static/manual checks; confirm the page loads and that selection, empty/error states and existing evidence flows still work.
- Confirm credentials are not tracked:

  ```sh
  git check-ignore config.local.js
  git ls-files config.local.js
  ```

  The first should name `config.local.js`; the second must return nothing. Check the entire staged diff too—this does not detect a key copied into another file.
- Check `git status`, `git diff`, `git diff --cached` and `git diff --check`. Stage only intended files; avoid generated reports, bytecode and unrelated changes.
- Update the documentation if behaviour changes, and append material decisions to `DECISIONS.md` rather than rewriting history.

Suggested checks, where the tools are installed:

```sh
node --check app.js
node --check api-config.js
python -c "import ast; from pathlib import Path; ast.parse(Path('scripts/sap_live_validate.py').read_text(encoding='utf-8'))"
```

Node is optional for these syntax checks, **not** an application runtime/build dependency. Python syntax parsing above does not create bytecode. No committed automated unit-test suite currently exists; record what you actually tested, not a generic "all tests passed" claim.

For UI/app changes, manually follow **Load Projects → View Project Elements → Load Financial Evidence → Load Purchase Order Evidence**. Check that switching/reloading projects removes old evidence, and that the current zero-PO-join state remains truthful. Inspect raw responses for filter-integrity warnings without sharing request credentials.

For integration changes, use [remote SAP validation](docs/API_INTEGRATION.md#remote-sap-live-validation) as appropriate. It is manual/trigger-file based, **not** an automatic PR or every-commit check. A green remote result validates connectivity/joins, not browser layout or CORS. Do not update the trigger file just to force a routine documentation/UI run.

## Security

Never commit `config.local.js`, API keys, passwords, tokens or copied secrets from browser developer tools. Do not put secrets into screenshots, issues, PR bodies, console output, raw captures or report artifacts. Browser Network screenshots can expose the `APIKey` header: redact or omit them.

Keep `config.example.js` as a placeholder. Local browser configuration is not a production secret store. CI uses the repository secret `SAP_API_KEY`, managed by an authorised repository owner, not copied into code. Do not publish the local page with a real key.

## SAP Data Integrity Rules

Never:

- fabricate SAP records or milestone/procurement evidence;
- claim unrelated Sandbox records belong to a selected project;
- modify downloaded API specifications simply to make code work;
- combine currencies without valid, explicitly approved conversion logic;
- represent prototype governance data as SAP data.

Cross-API joins must remain defensible. The preferred identifier is **WBSElementInternalID**, compared exactly. ProjectInternalID is secondary, with leading-zero equivalence limited to numeric-only strings. Retain raw SAP identifiers and distinguish integration capability from the current Sandbox sample availability. See [API Integration](docs/API_INTEGRATION.md) before changing financial/procurement labels or calculations.

## UI/UX Contributions

Start with `styles.css` for visual presentation and `index.html` for layout/accessibility. Rendering and DOM interaction also exist in `app.js`; do not hide API changes inside a layout PR. Preserve required buttons, status/debug areas and their functional hooks.

Before changing/removing element IDs, search for usage (for example `git grep "load-financial-evidence"`), update JavaScript consistently, and regression-test the complete click flow, selection resets and error/empty states. Include before/after screenshots when practical, without secrets.

## Business / Requirement Contributions

Use [MVP Scope](docs/MVP_SCOPE.md) to validate functions and identify gaps. Keep behaviour aligned with `PROJECT_CONTEXT.md` unless the team deliberately agrees to change the solution.

If a PR materially changes continuation-review logic, decision rights, review triggers, evidence requirements or the AI/human decision boundary, append a dated decision to `DECISIONS.md`. Humans remain accountable for Continue / Continue with Conditions / Modify / Pause / Stop. SAP milestones are lifecycle evidence, not automatically DPE continuation gates. Do not invent a trigger rule to compensate for missing Sandbox data.

## API Integration Contributions

Inspect the official JSON specification under `api/` before using any endpoint, property or data type. Preserve OData V2 (`d.results`) versus V4 (`value`) handling and client-side join validation. Update [docs/API_INTEGRATION.md](docs/API_INTEGRATION.md) and extend/update remote validation where appropriate, retaining its decompression, redaction and filter-integrity safeguards.

Coordinate changes in `app.js`, `api-config.js`, `scripts/sap_live_validate.py` and the workflow with the technical owner. Application modularisation is a separate future PR, not bundled into this documentation baseline.
