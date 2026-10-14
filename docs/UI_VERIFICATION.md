# Review workspace UI verification — 14 October 2026

Branch: `ui/continuation-review-ux`, based on master `95208aa`.

## Scope

Updated HTML layout, shared CSS and UI rendering only. `app.js`, `js/core/`, `js/services/`, `api-config.js`, SAP specifications and the local credential file are unchanged. The original 94 functional hooks and deferred script order remain valid. Native dropdown/date picker ownership, responsive layout and tokens are recorded in DESIGN.md / UI_CONTRACT.md.

## Automated checks

- `node --test tests/*.test.js`: 4 presentation tests passed. Their initial run failed because the new helpers did not exist; subsequent runs passed. Coverage: zero/unrequested/error distinction, loading precedence, partial/unavailable evidence and English UTC dates/unknown source text.
- `python3 scripts/check_frontend_contract.py`: passed; 94 original IDs, unique IDs and exact deferred dependency order.
- `node --check` on app.js, api-config.js and every file under js/: passed.
- Python AST parsing of both repository check/validation scripts: passed (live validator not executed).
- `git diff --check`: passed.
- Official `designmd lint DESIGN.md`: 0 errors and 0 warnings.
- Premium full-source strict audit: 14 actionless-button findings, all due to that scanner accepting inline HTML handlers but not resolving existing external addEventListener bindings. Required capability ownership, scrollbar and textarea findings were resolved. This audit is not reported as green. Bindings are in governance.bind / ui.bindEvents and existing controller callbacks, with the actual workflow exercised below. No dummy onclick attributes or disabled working buttons were added to silence it.

## Live browser observations

Chrome, local static preview. These are Sandbox observations, not permanent API facts or real DPE decisions.

- Empty Dashboard / Investments / Reviews presentation inspected.
- SAP project retrieval: HTTP 200, five projects. I1000 lifecycle returned 10 elements, 0 marked/main milestones; G/L returned 2 validated linked records; PO returned 0 exact matched records. Badges distinguish successful retrieval from zero matches. Raw financial/identifier detail remains available through disclosure.
- Switching I1000 → TEMP003 cleared prior G/L/PO evidence and displayed the new project/currency; loading state was visible.
- Incomplete assessment reached Summary but correctly disabled progression to Decision.
- Completed assessment with Cost Position = Insufficient information remained a completed human assessment and was source-labelled as an evidence gap.
- Draft survived reload and resumed through Reviews with all entered fields and captured evidence.
- All five outcomes exercised: Continue/Stop do not require action fields; Continue with Conditions/Modify/Pause require action, owner and next review date. Confirm stayed disabled until required fields were supplied.
- One explicit **UI QA ONLY** Pause record saved, reloaded, and opened again through Reviews. Actual timestamps, rationale/action and evidence snapshot were retained. The QA record is on `http://localhost:8765`; the user-facing `http://127.0.0.1:8765` origin has separate storage and was used for the clean investment screenshot.
- Long reviewer text grew to fit its content (clientHeight = scrollHeight = 313px in the desktop observation).
- At 390 × 844, form fields stacked and document scrollWidth equalled viewport width (390px); no whole-page horizontal overflow. The temporary viewport override was reset.
- Navigation moved focus to page-title; field focus treatment inspected. Native selection was exercised through supported select controls. The automation did not reliably capture the operating-system popup, so full popup/keyboard certification is not claimed.
- Credential-free local test copies exercised missing API configuration and unavailable storage. Missing-key error opened connection details visibly; storage failure showed Unavailable counts and a persistent error instead of reporting saved records. No secrets were copied into the test fixtures and no external calls were needed.

## Limits

This is a Chrome smoke test, not a formal WCAG audit or cross-browser/mobile certification. Offline transport, service timeout, concurrent browser-tab edits and operating-system date-picker popup localization were not fully exercised. Original API page limits and browser-local prototype persistence remain. No production integration or authenticated multi-user storage is introduced.
