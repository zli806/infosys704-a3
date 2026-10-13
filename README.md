# DPE IT Investment Review Prototype

This prototype integrates three SAP sources: **Enterprise Project** for lifecycle/WBS context, **G/L Account Line Items - Read** for financial postings, and **Purchase Order** for WBS-linked procurement account assignments. Four official specifications remain in `./api/`. WBS is the preferred cross-API linking key. Purchase Requisition and MCP remain unimplemented. The user has confirmed successful remote Enterprise Project/G/L validation; Purchase Order live join results are not yet claimed.

## Run locally

1. Open `config.local.js` and manually replace `PASTE_YOUR_SAP_SANDBOX_API_KEY_HERE` with your SAP Sandbox API key. Keep the quotes.
2. **Do not commit or share `config.local.js`.** It is already excluded by `.gitignore`. Browser-side configuration is not a secure secret store: the key remains accessible to the local browser and its developer tools. Do not publish this page with your credentials.
3. Open `index.html` in a modern browser. No npm, build tool or application backend is required. If `file://` restrictions block the call, use a trusted editor's local static web preview and open the page at its `http://localhost` address. Static hosting only serves these files; it does not proxy SAP requests and cannot fix SAP-side CORS restrictions. Do not disable browser security or use an untrusted proxy.
4. Click **Load Projects**.

Expected result: up to five real SAP Sandbox Enterprise Projects appear, with a connection status and returned record count. An empty collection is shown as zero records, not replaced with invented projects. Expand **Raw SAP Response** to inspect the JSON.

## Request and troubleshooting

- Endpoint: `https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/API_ENTERPRISE_PROJECT_SRV;v=0002/A_EnterpriseProject`
- Sends `$top=5`, the nine specification-confirmed fields in `$select`, and `$format=json`, with `Accept: application/json` and the `APIKey` header.
- Parses the OData V2 collection at `data.d.results`, not OData V4 `data.value`. ProjectUUID and ProjectInternalID remain in the in-memory records for future linking. Status codes are displayed as supplied by SAP; no status labels are invented. Dates use readable UTC calendar values where possible.
- A missing or placeholder key prevents any request. The test cannot prove live connectivity until you supply your own key.
- On failure, inspect the visible HTTP status code/text, SAP response body, browser console and Network tab. Some HTTP responses have no status text. Network/CORS/local-file failures can hide the HTTP response completely; the page reports that limitation explicitly. Requests time out after 30 seconds.
- Responses are displayed as text, not executable HTML. If SAP echoes the API key, that exact text is redacted from displayed/logged responses. No mocked fallback data is used.

## Project elements and lifecycle evidence

Click **View Project Elements** on a loaded project row. The selected-project summary and elements table use that project's actual ProjectUUID with `/A_EnterpriseProject(guid'{ProjectUUID}')/to_EnterpriseProjectElement`. The focused `$select` includes the 17 specification-confirmed fields in `api-config.js`; collections are parsed at `data.d.results`. Full element records retain ProjectUUID, ProjectElementUUID and WBSElementInternalID for later integration. Actual dates and other non-visible selected fields can be inspected in **Raw Project Element Response**; project-list JSON remains separate.

`IsProjectMilestone` is a nullable one-character **string**, not a Boolean. The UI recognises `X` as marked and blank strings as unmarked, and explicitly labels other/missing values as unknown rather than treating any non-empty value as true. `IsMainMilestone` is highlighted only for Boolean `true`. MilestoneApprovalStatus is displayed as its raw SAP string code, without invented labels.

Green rows identify marked SAP milestones; gold rows identify main milestone candidates. SAP lifecycle evidence does **not** automatically establish a DPE continuation-review gate. Final gate configuration remains governed by DPE. Zero elements/milestones are reported honestly. Selection changes cancel the prior request and guard against stale results. Reloading projects clears the selection. If SAP returns a continuation link, counts are explicitly labelled as covering only the returned page; automatic pagination is not implemented in this step.

### Live Sandbox observations (12 October 2026)

Read-only checks of all five sample projects returned HTTP 200, with no continuation pages. All 26 elements had `IsProjectMilestone: ""` and `IsMainMilestone: false`. No marked milestones or main milestones were present in these samples; this does not establish that other Sandbox projects lack milestones.

| Project | Elements | WBSElementInternalID values (strings) |
| --- | ---: | --- |
| TEMP001 | 3 | 81, 80, 79 |
| TEMP002 | 4 | 86, 87, 88, 85 |
| TEMP003 | 4 | 91, 90, 92, 89 |
| I1000 | 10 | 122, 123, 121, 120, 119, 116, 126, 125, 124, 115 |
| PROJECT1 | 5 | 252, 253, 134, 135, 133 |

These observations are documentation only, not application fallback data. Sandbox contents may change. The milestone-data limitation is recorded in `DECISIONS.md`; it does not change the original Stage-Gated Portfolio Continuation Review solution.

## Financial Evidence – G/L

1. Refresh/open the local page and click **Load Projects**.
2. Click **View Project Elements** for a project. Wait for its successful element response (zero elements is also a valid response).
3. Click **Load Financial Evidence** in the new section beneath Project Elements.
4. Inspect the link-method/status line, currency summary, detail table and **Raw G/L Response**. Repeat for other projects to test join feasibility. Changing selection or reloading projects clears financial evidence and cancels/ignores stale requests.

The separate `window.GL_API_CONFIG` in `api-config.js` uses the official specification's endpoint:

`https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/API_GLACCOUNTLINEITEM/GLAccountLineItem`

Every request uses the same local `APIKey` header and `Accept: application/json`, plus `$format=json`. The collection is parsed at `data.d.results`. The 21 confirmed fields are selected; complete returned records, including ProjectInternalID and WBS IDs, remain in memory.

The app attempts these queries in order (placeholders below represent actual selected identifiers, not hard-coded data):

- **Primary:** `$filter=WBSElementInternalID eq '<loaded WBS ID 1>' or WBSElementInternalID eq '<loaded WBS ID 2>' ...&$top=100&$select=<configured fields>&$format=json`. IDs are deduplicated from the successfully loaded elements and compared exactly, with no WBS zero-normalisation. Only returned WBS IDs can be tested if elements span multiple pages.
- **Secondary, only if no safe WBS-linked records exist or WBS IDs are unavailable:** `$filter=ProjectInternalID eq '<raw ProjectInternalID>'&$top=100&$select=<configured fields>&$format=json`. For numeric-only IDs with leading zeros, the query additionally ORs the unpadded variant; client comparison accepts numeric-only zero variants such as `00000041`/`41`. Alphanumeric identifiers require exact matching. Raw identifiers/records are retained unchanged. Apostrophes are doubled for OData strings, and URLSearchParams encodes queries safely.
- If the available linked queries return zero records: one unfiltered `$top=5&$select=<configured fields>&$format=json` diagnostic request. It appears only under **Unlinked G/L Connectivity Diagnostic**, with a warning. These unrelated records are **never** attached to the project, displayed in its evidence table or included in amounts. With no usable identifiers, no query is sent.

HTTP/network/parser errors stop the chain rather than pretending a failed filter returned zero records. SAP Sandbox filters can return unrelated rows: those are discarded client-side, with counts/identifiers recorded under Raw G/L Response. Only exact WBS matches (or validated secondary project-ID matches) enter evidence. Raw query attempts retain their URL, HTTP status and SAP response separately from the diagnostic. Inspect visible errors, raw responses and the browser console/Network tab on failure; do not share credentials from the Network tab.

G/L records are **financial evidence, not automatically complete project cost**. The summary counts linked records, strict Boolean-false non-commitments, Boolean-true commitments, and unknown commitment flags. Net amounts use only confirmed non-commitments, grouped by CompanyCodeCurrency, with exact three-decimal arithmetic and SAP's supplied signs. Unknown commitment flags and invalid/missing amount or currency values are explicitly reported and excluded from amounts. Currencies are never combined or converted. Reversal/reversed items are retained and their flags displayed. No ledger deduplication or complete accounting-scope interpretation is assumed.

Queries retrieve at most 100 records with no automatic pagination; summaries use only validated linked records from the returned page. A SAP continuation link is reported when present. No live evidence requests run automatically on selection.

### User-confirmed remote G/L findings (14 October 2026)

Exact WBS joins produced 40 linked G/L records for TEMP003 and 2 for I1000. TEMP001, TEMP002 and PROJECT1 produced zero. ProjectInternalID formatting differed across APIs (for example `00000041` versus `41`), motivating WBS-primary linking. These are observed Sandbox findings, not hard-coded application data; contents may change. The evidence decision is appended in `DECISIONS.md` without changing the original business solution.

## Procurement Evidence – Purchase Orders

Use **Load Projects → View Project Elements → Load Financial Evidence → Load Purchase Order Evidence**. The PO button becomes available after real WBS IDs have loaded; it does not require a successful G/L join. Selecting/reloading a project clears old G/L and PO evidence and cancels/ignores stale responses.

The separate `window.PO_API_CONFIG` uses:

`https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata4/sap/api_purchaseorder_2/srvd_a2x/sap/purchaseorder/0001/PurchaseOrderAccountAssignment`

Query: `$top=100&$select=<17 verified fields in api-config.js>&$filter=WBSElementInternalID eq '<actual loaded ID>' or ...`, with the same local APIKey and `Accept: application/json`. This is **OData V4**, parsed from `data.value`; Enterprise Project/G/L remain OData V2 (`data.d.results`). Every returned assignment is client-checked against exact loaded WBS IDs. Unrelated rows are discarded and recorded under **Raw Purchase Order Response / Filter Integrity**, never included in procurement evidence. Zero exact matches are a valid Sandbox-data finding, not invented records or technical success with a fake join.

The table retains full exact-linked assignment records and displays deleted/final-invoice indicators. Active summaries require `IsDeleted === false`; deleted and unknown-deletion assignments do not enter active amounts. Finally invoiced and not-finally-invoiced assignments are counted separately. PO-linked amounts and not-finally-invoiced amounts use PurgDocNetAmount, grouped by DocumentCurrency, without combining currencies or inventing exchange rates/invoiced amounts. Decimal strings and finite, safe-range numbers are supported with decimal coefficient/scale arithmetic; invalid/missing values are reported and excluded rather than silently converted to zero. Unknown final-invoice flags are excluded from the not-finally-invoiced indicator.

These amounts are a **prototype procurement exposure indicator**, not exact outstanding commitments/liability. Amounts are summed at account-assignment level without multiplying again by quantity or allocation percentage; no complete PO/ledger scope is assumed. Counts and amounts cover the returned page only. Purchase Order live join findings await actual GitHub Actions validation; no live PO result is claimed here.

## Remote SAP Live Validation

Add the repository secret **SAP_API_KEY** yourself under GitHub **Settings → Secrets and variables → Actions**. This repository secret is used only by GitHub Actions, passed to the validator through its environment. It is independent of the browser's ignored `config.local.js`; do not commit, print or share either credential.

Run **Actions → SAP Live Validation → Run workflow**, or have an authorised client update `.github/sap-validation-trigger` and push that harmless change to `master`. Other application commits do not trigger the workflow. The initial trigger-file creation also qualifies for a run on push; without the secret, it fails clearly.

The standard-library Python script checks up to five Enterprise Projects, their Project Elements/WBS IDs, G/L join feasibility (exact WBS first, secondary numeric-safe ProjectInternalID fallback), and Purchase Order account-assignment joins (OData V4, exact WBS only). If no tested project joins an API, it performs one separate unlinked diagnostic for that API. Reports separate exact/secondary G/L matches and unexpected filter identifiers, and add per-project PO counts, filter integrity and unique PO numbers. Unrelated/diagnostic records never become project evidence. Zero matches with working APIs are a valid Sandbox-data finding, **not** a test failure. Authentication, HTTP/network, malformed response and script errors fail the workflow.

Download the **sap-validation-report** artifact for `validation-report.json` and `validation-summary.md`; the Markdown also appears in the run summary. Reports contain counts, identifiers and link statuses, not keys, headers or raw SAP payloads. Exact-key redaction applies before writing reports; redirects are blocked so credentials cannot be forwarded to another target. The remote gzip/deflate/BOM decoding and filter-integrity diagnostics are preserved. Counts cover returned pages only (maximum 100 G/L/PO records per linked query); continuation flags and unknown milestone counts make limitations explicit.

The harness itself does not change application business behaviour. It validates remote API connectivity/joins, not browser CORS/UI behaviour. Existing Enterprise Project/G/L live findings are user-confirmed; new PO workflow results are not claimed before an actual run. Purchase Requisition, MCP, AI Review Brief and the final continuation-decision workflow remain out of scope. No fake milestones, financial/procurement records or new material-trigger rules are introduced.
