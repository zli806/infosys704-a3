# API Integration

## Capability Versus Sandbox Availability

The app supports three live, read-only SAP integrations alongside a separately identified local SHOWCASE provider. **Integration capability is not a guarantee that public Sandbox samples join or contain every business field.** Sandbox responses are real public samples, not DPE production data. Empty live milestones/PO joins are legitimate findings, never filled with showcase records.

Business context remains in [PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md); implementation findings are in [DECISIONS.md](../DECISIONS.md). Endpoint/field configuration is in [api-config.js](../api-config.js), checked against the downloaded [api/](../api/) specifications. No API specification is edited to accommodate code.

## Shared Request and Evidence Rules

- Every request uses `APIKey` and `Accept: application/json`; local credentials come from `config.local.js`, never from the tracked configuration. A missing/placeholder key blocks browser requests with "Please add your SAP Sandbox API key to config.local.js first."
- Enterprise Project/G/L use OData V2 `data.d.results`; PO uses OData V4 `data.value`. Do not silently accept a wrong collection shape.
- `$select` keeps responses focused. The configuration currently selects 9 project fields, 17 element fields, 21 G/L fields and 17 PO fields. Non-visible selected fields/full accepted records remain available in memory/raw debug views.
- OData string apostrophes are doubled; URLSearchParams (browser) or urlencode (Python) encodes queries. Identifiers come from the selected project and its real returned elements, not hard-coded samples.
- WBS linking uses exact raw string equality. ProjectInternalID is secondary and only numeric-only strings may use leading-zero equivalence. Raw identifiers are not destructively rewritten.
- Each linked G/L/PO query retrieves at most 100 rows; no automatic pagination is implemented. Counts/summaries cover only validated matches from the returned page. Continuation links are surfaced; only loaded element/WBS IDs can be tested.
- Selecting/reloading clears old evidence and cancels/ignores stale responses. Structure loads automatically, followed by dependent G/L/PO requests; no endpoint/filter/limit semantics change. Refresh/retry are secondary explicit actions.
- Raw/debug responses can contain unrelated returned rows, but those rows never enter project evidence, summaries or totals. No mocked fallback exists.

## Separate Synthetic Showcase Provider

Showcase cases are synthetic records shaped to the downloaded SAP API specifications. Live SAP Sandbox projects remain connected separately. There is one app with per-project SHOWCASE / SAP SANDBOX badges, not a mode switch or a mocked live fallback. Both providers use the same evidence interpretation and existing financial/procurement summarisation; `aggregate()` exposes the same decimal-safe calculations for the showcase context UI, without parsing display strings or introducing second formulas.

| Payload | Downloaded schema / representation checked |
| --- | --- |
| Project | `A_EnterpriseProjectType`; 9 configured fields; UUID, internal ID ≤8, project ≤24, description ≤60, currency ≤5, company ≤4 |
| Elements | `A_EnterpriseProjectElementType`; 17 configured fields; UUID references, WBS ≤8, description ≤60; milestone string `X`/blank and Boolean main flag |
| G/L | `GLAccountLineItemType`; 21 selected fields; exact project/WBS, decimal-string precision 23 / scale 3, Boolean commitment/reversal flags, item text ≤50 |
| PO | `PurchaseOrderAccountAssignment_Type`; 17 selected fields; exact WBS, currency ≤3, decimal strings, Boolean deletion/final flags and V4 calendar dates |

V2 payloads use `{d:{results:[...]}}` and `/Date(milliseconds)/`; PO V4 uses `{value:[...]}` and `YYYY-MM-DD`. No governance/source/forecast fields are inserted into raw records. All company/supplier/accounting/purchasing identities are fictional. In particular, single-assignment fixtures use `MultipleAcctAssgmtDistrPercent = "0.0"`, within the downloaded range −99.9…99.9; it is not multiplied into amounts. No assumed 100% value is forced against the specification.

Immutable deferred JS supplies fixtures; the local provider validates the used subset before returning records, with no fetch/API key. Tests additionally compare **every generated field** with the actual downloaded read schemas, including anyOf decimal types, precision/scale/ranges, lengths, nullability and date representation, plus exact per-parent referential integrity. This is not a general OpenAPI validator. Technical Details explicitly identifies synthetic SAP-schema-compatible payloads; real project requests are normally hidden for showcase selection, except clearly labelled separate-live-connection failure diagnostics remain inspectable.

Approved investment/explicit forecast, planned/forecast completion, stage and reason are separate SHOWCASE CONTEXT. Posted activity is derived from strict non-commitment G/L rows, grouped by currency; procurement uses active/non-deleted assignments and exact final-invoice flags. Forecast variance = explicit forecast − approved; remaining forecast investment = explicit forecast − posted activity. Forecast percentages are display facts, not materiality policy. Data Platform's unvalidated forecast produces no numeric forecast, variance or remaining-forecast figure. Legacy Reporting's figures are the synthetic pre-Stop position. No such approved/forecast figures are added to live projects.

Exact derived fixture totals (AUD, no conversion):

| Showcase project | Posted financial activity | PO-linked activity | Not-finally-invoiced PO-linked |
| --- | ---: | ---: | ---: |
| DPE-IT-ODP-01 | 6,150,000.000 | 1,480,000.000 | 1,070,000.000 |
| DPE-IT-CRM-01 | 2,400,000.000 | 920,000.000 | 520,000.000 |
| DPE-IT-DAT-01 | 3,100,000.000 | 650,000.000 | 350,000.000 |
| DPE-IT-INF-01 | 3,600,000.000 | 720,000.000 | 220,000.000 |
| DPE-IT-LRP-01 | 2,850,000.000 | 350,000.000 | 150,000.000 |

These are synthetic activity/context amounts, not real DPE costs or exact outstanding liabilities. Seeded qualitative assessments remain editable; numeric variance never automatically selects an assessment, trigger or final decision. Production trigger/materiality criteria require DPE design/pilot calibration.

Compatibility is with the **SAP API response schema**, not a claim of valid SAP production records. The downloaded read schemas do not define authoritative semantic code lists for ProcessingStatus, EntProjectElementType, MilestoneApprovalStatus or DebitCreditCode. Existing synthetic values stay unchanged and are shown only as raw codes where relevant; no named status is inferred from `20` or another unverified code. Understandable showcase stage labels come from separate governance context, not a SAP-code mapping.

## Live Enterprise Project

Specification: [API_ENTERPRISE_PROJECT_SRV_0002.json](../api/API_ENTERPRISE_PROJECT_SRV_0002.json).

Base URL:

```text
https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/API_ENTERPRISE_PROJECT_SRV;v=0002
```

The collection request is `/A_EnterpriseProject?$top=5&$select=<projectFields>&$format=json`, parsed as OData V2 `data.d.results`. It provides project identity, description, status, dates, currency and company code. ProjectUUID and ProjectInternalID remain available internally. SAP status codes are shown as supplied, without invented descriptions. Dates are formatted as readable UTC calendar values where practical, including SAP `/Date(...)/` values.

Selecting a project calls the official navigation endpoint:

```text
/A_EnterpriseProject(guid'{actual ProjectUUID}')/to_EnterpriseProjectElement
```

It uses the selected record's UUID, `$select=<elementFields>` and `$format=json`, again parsing `d.results`. Element records retain ProjectUUID, ProjectElementUUID and WBSElementInternalID for later joins. Planned/forecast dates, WBS, status and milestone fields are displayed; actual dates and other selected fields can be inspected in **Raw Project Element Response**. The project list keeps its separate **Raw SAP Response** area.

### Milestones and Stage Gates

`IsProjectMilestone` is a nullable one-character **string**, not a Boolean. The app recognises `X` as marked, blank strings as unmarked, and other/missing values as unknown. `IsMainMilestone` is highlighted only for Boolean `true`. MilestoneApprovalStatus is shown as the raw SAP string code.

Green rows identify marked SAP milestones; gold rows identify main milestone candidates. SAP milestones provide lifecycle evidence, **not automatically DPE continuation-review gates**. DPE governance determines gate configuration. Missing marked milestones do not change the original Stage-Gated Portfolio Continuation Review solution; later DPE-configured gates/material-trigger reviews need an explicit design decision, not invented SAP data.

### Observed Lifecycle/WBS Sample

In the five tested Sandbox projects, 26 elements were returned with `IsProjectMilestone: ""` and `IsMainMilestone: false` throughout. No continuation pages were observed in that test. This is a sample limitation, not a statement that all SAP projects lack milestones.

| Project | Elements | Unique WBS Internal IDs (strings) |
| --- | ---: | --- |
| TEMP001 | 3 | 79, 80, 81 |
| TEMP002 | 4 | 85, 86, 87, 88 |
| TEMP003 | 4 | 89, 90, 91, 92 |
| I1000 | 10 | 115, 116, 119, 120, 121, 122, 123, 124, 125, 126 |
| PROJECT1 | 5 | 133, 134, 135, 252, 253 |

These observations are documentation, not app fallback data. The verified milestone limitation is dated 14 October 2026 in the decision log; the former README also recorded the earlier lifecycle observation under 12 October 2026. Sample contents may change.

## G/L Account Line Items

Specification: [API_GLACCOUNTLINEITEM.json](../api/API_GLACCOUNTLINEITEM.json).

Full collection endpoint (OData V2):

```text
https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/API_GLACCOUNTLINEITEM/GLAccountLineItem
```

After successfully loading a live project's elements (zero elements is a valid response), the controller automatically requests financial evidence. Every query uses the 21 configured fields, `$format=json`, and `d.results`.

### Join Strategy

1. **WBS primary:** OR-combine `WBSElementInternalID eq '<actual loaded ID>'` for unique loaded WBS IDs with `$top=100`. Only exact matches enter evidence.
2. **ProjectInternalID secondary:** only if no safe WBS-linked records exist or WBS IDs are unavailable, query `ProjectInternalID eq '<raw project ID>'`. For numeric-only leading-zero IDs, additionally OR the unpadded variant. Client comparison may accept `00000041`/`41`, but not different alphanumeric identifiers. Raw values remain intact.
3. **Unlinked diagnostic:** if the available linked queries produce no safe records, the browser performs one separate unfiltered `$top=5` request. It appears only under **Unlinked G/L Connectivity Diagnostic**, labelled as not project evidence. With no usable project/WBS identifier, the browser sends no query.

HTTP/network/parser failures stop the chain; they are not interpreted as zero matches. Filtered Sandbox responses may contain unrelated rows. These are discarded client-side, with counts/identifiers under **Raw G/L Response**. Raw query attempts retain URL, HTTP status and safe SAP response, separate from the diagnostic.

### Team-Confirmed G/L Findings — 14 October 2026

| Project | Exact WBS-linked G/L records observed |
| --- | ---: |
| TEMP001 | 0 |
| TEMP002 | 0 |
| TEMP003 | 40 |
| I1000 | 2 |
| PROJECT1 | 0 |

ProjectInternalID formatting differed across APIs, for example Enterprise Project `00000041` versus G/L `41`. Exact WBS joins justified WBS-primary linking. These counts are snapshot findings from remote validation, not hard-coded application data, permanent facts or complete project accounting scope.

### Financial Interpretation

G/L line items are **financial evidence, not automatically Total Project Cost**. The prototype summary counts linked records, strict Boolean-false non-commitments, Boolean-true commitments and unknown commitment flags.

Net amounts use only confirmed non-commitments, grouped by CompanyCodeCurrency, with exact three-decimal arithmetic and SAP's supplied signs. Do not combine currencies, invent exchange rates or reverse the signs based on DebitCreditCode. Unknown commitment flags and missing/invalid amount/currency values are reported and excluded from amounts.

IsReversal and IsReversed remain visible; reversing/reversed records are not silently removed. No ledger deduplication or complete accounting-scope interpretation is assumed. The table also exposes accounting document, G/L account, WBS, purchasing document and description; full records retain secondary IDs and other selected data. Re-query after selection changes; only concise evidence summaries, not raw payloads, persist with reviews.

## Purchase Order

Specification: [CE_PURCHASEORDER_0001.json](../api/CE_PURCHASEORDER_0001.json).

Full account-assignment endpoint (**OData V4**):

```text
https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata4/sap/api_purchaseorder_2/srvd_a2x/sap/purchaseorder/0001/PurchaseOrderAccountAssignment
```

Live PO retrieval starts automatically after real WBS IDs load; a successful G/L join is not required. Query `$top=100`, the 17 configured `$select` fields, and OR-combined `WBSElementInternalID eq '<actual loaded ID>'` filters. Parse **`data.value`**, never V2 `d.results`.

Every row is checked against exact loaded WBS strings. Only matching account assignments become procurement evidence. Unrelated rows are discarded without failing the whole app when safe matches remain, and reported under **Raw Purchase Order Response / Filter Integrity**. The detail table shows PO, item, WBS, amount/currency, quantity/unit, G/L account, deletion/final-invoice flags and creation date; full accepted records retain the remaining selected fields.

### Current Public Sandbox Finding

The team has now confirmed **PO API connectivity works**, but the tested Enterprise Project WBS IDs have **zero exact joins** to the current public PO sample account assignments. This updates the earlier README's pending-validation statement. It is a data-availability limitation, not proof that the API or matching capability is broken, and not a production claim.

The application truthfully displays "No linked Purchase Order account assignments found in current SAP Sandbox sample." It does not invent PO records, map unrelated samples to projects or include diagnostic data as procurement evidence. Future populated evidence must come from defensible real joins, not an assumed relationship.

### Procurement Interpretation

- Active summaries require `IsDeleted === false`. Deleted/unknown-deletion records remain transparent in details but do not enter active amounts.
- Finally invoiced and not-finally-invoiced active assignments are counted separately. Unknown final-invoice flags are excluded from the not-finally-invoiced indicator.
- PO-linked procurement amounts and not-finally-invoiced PO-linked amounts use PurgDocNetAmount grouped by DocumentCurrency; currencies are never combined/converted.
- Decimal strings and finite safe-range numbers are supported using decimal coefficient/scale arithmetic. Invalid/missing values are reported and excluded, not silently converted to zero.
- Sum at account-assignment level without multiplying again by quantity/allocation percentage. Do not invent invoiced amounts or assume complete PO scope.

These are **prototype exposure indicators, not validated exact outstanding commitments/liability**. The current zero-join sample does not demonstrate populated project procurement totals; the calculation capability exists but needs suitable real linked evidence to demonstrate it live.

## Purchase Requisition

[CE_PURCHASEREQUISITION_0001.json](../api/CE_PURCHASEREQUISITION_0001.json) is downloaded, but no application/validator integration exists. It is stretch scope for procurement pipeline evidence. MCP and AI Review Brief remain deferred. The human review/decision workflow now exists as local prototype governance state, not SAP data or write-back; concise captured SAP evidence summaries are retained with decisions, not raw payloads. See [MVP Scope](MVP_SCOPE.md).

## Remote SAP Live Validation

[scripts/sap_live_validate.py](../scripts/sap_live_validate.py) uses Python's standard library. [.github/workflows/sap-live-validation.yml](../.github/workflows/sap-live-validation.yml) runs it on `ubuntu-latest`, with Python 3.12, read-only repository permissions and no persisted checkout credential.

An authorised owner sets repository secret **SAP_API_KEY** under GitHub **Settings → Secrets and variables → Actions**. It is passed only through the validation step's environment, independently of the ignored browser config. Do not create/commit/print a key in code or copy it into artifacts.

### Running a Validation

- Prefer **Actions → SAP Live Validation → Run workflow**. Select the intended branch when validating trusted integration changes.
- Alternatively, an authorised client can update [.github/sap-validation-trigger](../.github/sap-validation-trigger); a push changing that file on `master` triggers a run. Under the team workflow, ordinary trigger updates also go through PR/review/merge; merging the trigger change is the `master` push. Do not bypass review just to trigger validation.
- Other commits and PRs do **not** automatically run this workflow. Missing secret, authentication, HTTP/network, malformed responses or script errors fail the job. Zero cross-API matches with working APIs are valid findings, not failures.

### What Is Checked and Reported

The validator checks up to five projects and their elements/WBS, then WBS-primary G/L joins with secondary numeric-safe project-ID fallback, and V4 PO exact-WBS account-assignment joins. It verifies returned identifiers client-side. Unexpected identifiers are filter-integrity diagnostics, not evidence. If no tested project joins an API, it performs one separate unfiltered `$top=5` diagnostic for that API across the run; the browser does not run an unfiltered PO diagnostic.

The **sap-validation-report** artifact contains runtime `validation-report.json` and `validation-summary.md`; the Markdown is also appended to the Actions step summary. Artifacts are retained for 14 days by the current workflow. Reports include timestamp, HTTP/connectivity status, project/WBS IDs, milestone counts, link methods/counts, exact versus numeric-equivalent G/L counts, filter-integrity diagnostics and unique linked PO numbers. They exclude API keys, credential headers and full raw SAP payloads. Unlinked diagnostic records are reported only as counts/status.

The remote gzip/deflate, UTF-8 BOM decoding, size limits, exact-key redaction and redirect blocking are preserved. Counts cover returned pages only; continuation/unknown-milestone flags expose limitations. A green run proves connectivity/join checks passed, **not** complete project cost, exact remaining liability, browser CORS/UI correctness or finished governance workflow. Cite the run/report when adding new live findings; do not infer them from code or offline tests.

## Errors and Browser Troubleshooting

Requests time out after 30 seconds. Normal customer success is quiet; failures show a concise error and explicit Retry. HTTP status/body/filter diagnostics remain in the single collapsed Investment Technical Details area and developer tools. Some HTTP responses have no status text. Network/CORS/local-file failures may hide the entire HTTP response; the app reports that limitation rather than inventing success. Showcase remains available; it never claims that a failed live request succeeded.

If `file://` blocks the request, use a trusted local static web preview at `http://localhost`. It serves files only and cannot fix SAP-side CORS restrictions. Do not disable browser security or use an untrusted proxy. Responses are rendered as text, not executable HTML; exact echoed key text is redacted. Developer tools still show your actual request key, so do not share them unredacted.

For setup and the click flow, return to [README.md](../README.md). Local config is not a production secret store; no backend/proxy, npm or frontend framework currently exists.
