# Conservative repository audit

The final productisation pass checked tracked files against runtime HTML/CSS/JS, tests, Markdown links, CI workflows and submission context. No broad refactor or deletion was justified. **No files were deleted.**

| Candidate | Evidence / disposition |
| --- | --- |
| [assets/dpe-mark.svg](../assets/dpe-mark.svg) | Not the visible product logo; retained because `tests/dashboard-executive.test.js` explicitly verifies the historic prototype mark and provenance. Header uses only the supplied `logo.png`. |
| [Purchase Requisition specification](../api/CE_PURCHASEREQUISITION_0001.json) | Referenced by PROJECT_CONTEXT, DECISIONS, Architecture and API Integration as selected/deferred stretch scope. Retained as a submission/design artifact; no requisition feature is claimed. |
| [Historical UI captures](ui-review/README.md) | Four dated synthetic-data review images have their own inventory and are referenced by UI_CONTRACT's historical verification. Retained as historical evidence, not advertised as the final UI. |
| [premium-ui.json](../premium-ui.json) | Developer-tool profile/configuration, also listed in Architecture. External tooling use cannot be safely ruled out; retained rather than deleting on the basis of no runtime import. |
| Empty `data/` directory | No tracked file; no cleanup action or Git deletion needed. |

All active specifications, meaningful tests, deterministic fixture sources, frontend contract checker, SAP validator, CI, security configuration and important design/decision records are retained. New QA scripts and screenshots were kept in approved temporary storage, not committed into the submission source.

Unused CSS directly superseded by the requested Summary presentation was removed only within its owning refinement. Working code was not refactored merely to make the tree smaller. Final current behaviour and verification are recorded in [Productisation Handoff](PRODUCTISATION_HANDOFF.md).
