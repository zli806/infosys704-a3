# DPE IT Investment Review Prototype

This prototype tests SAP Enterprise Project connectivity, related project elements/milestones, and project-linked financial evidence. Four SAP API JSON specifications are stored in `./api/`. **G/L Account Line Items - Read** is now the second integrated SAP API, alongside **Enterprise Project**. Purchase Order, Purchase Requisition and MCP remain unimplemented. The initial project-list test was confirmed by the user: HTTP 200 and five real projects. The new G/L functionality awaits the user's live test; no G/L Sandbox results are claimed here.

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

## Financial Evidence – G/L (live test pending)

1. Refresh/open the local page and click **Load Projects**.
2. Click **View Project Elements** for a project. Wait for its successful element response (zero elements is also a valid response).
3. Click **Load Financial Evidence** in the new section beneath Project Elements.
4. Inspect the link-method/status line, currency summary, detail table and **Raw G/L Response**. Repeat for other projects to test join feasibility. Changing selection or reloading projects clears financial evidence and cancels/ignores stale requests.

The separate `window.GL_API_CONFIG` in `api-config.js` uses the official specification's endpoint:

`https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/API_GLACCOUNTLINEITEM/GLAccountLineItem`

Every request uses the same local `APIKey` header and `Accept: application/json`, plus `$format=json`. The collection is parsed at `data.d.results`. The 21 confirmed fields are selected; complete returned records, including ProjectInternalID and WBS IDs, remain in memory.

The app attempts these queries in order (placeholders below represent actual selected identifiers, not hard-coded data):

- If available: `$filter=ProjectInternalID eq '<selected ProjectInternalID>'&$top=100&$select=<configured fields>&$format=json`.
- Only if the first query returns zero records, or the project ID is unavailable: `$filter=WBSElementInternalID eq '<loaded WBS ID 1>' or WBSElementInternalID eq '<loaded WBS ID 2>' ...&$top=100&$select=<configured fields>&$format=json`. IDs are deduplicated from the successfully loaded elements. Apostrophes are doubled for OData strings, then URLSearchParams safely encodes the query. No ID normalisation or fabricated mappings are introduced. Only loaded WBS IDs can be tested if elements span multiple pages.
- If the available linked queries return zero records: one unfiltered `$top=5&$select=<configured fields>&$format=json` diagnostic request. It appears only under **Unlinked G/L Connectivity Diagnostic**, with a warning. These unrelated records are **never** attached to the project, displayed in its evidence table or included in amounts. With no usable identifiers, no query is sent.

HTTP/network/parser errors stop the chain rather than pretending that a failed filter returned zero records. Non-matching identifiers in a returned filtered response also stop processing without attaching the records. Raw linked-query attempts retain their URL, HTTP status and SAP response separately from the diagnostic. Inspect visible errors, raw responses and the browser console/Network tab on failure; do not share credentials from the Network tab.

G/L records are **financial evidence, not automatically complete project cost**. The summary counts linked records, strict Boolean-false non-commitments, Boolean-true commitments, and unknown commitment flags. Net amounts use only confirmed non-commitments, grouped by CompanyCodeCurrency, with exact three-decimal arithmetic and SAP's supplied signs. Unknown commitment flags and invalid/missing amount or currency values are explicitly reported and excluded from amounts. Currencies are never combined or converted. Reversal/reversed items are retained and their flags displayed. No ledger deduplication or complete accounting-scope interpretation is assumed.

Queries return at most 100 linked records with no automatic pagination. Summaries describe only returned records; a SAP continuation link is reported when present. No fake financial records, material-trigger rules, final continuation-decision workflow, Purchase Order, Purchase Requisition or MCP integration are added in this step. No live G/L requests are made automatically on selection.

## Remote SAP Live Validation

Add the repository secret **SAP_API_KEY** yourself under GitHub **Settings → Secrets and variables → Actions**. This repository secret is used only by GitHub Actions, passed to the validator through its environment. It is independent of the browser's ignored `config.local.js`; do not commit, print or share either credential.

Run **Actions → SAP Live Validation → Run workflow**, or have an authorised client update `.github/sap-validation-trigger` and push that harmless change to `master`. Other application commits do not trigger the workflow. The initial trigger-file creation also qualifies for a run on push; without the secret, it fails clearly.

The standard-library Python script checks up to five Enterprise Projects, their Project Elements/WBS IDs, and G/L join feasibility: ProjectInternalID first, then actual WBS IDs only if needed. If no tested project joins, it performs exactly one separate unlinked G/L diagnostic. Zero cross-API matches with working APIs are a valid Sandbox-data finding, **not** a test failure. Authentication, HTTP/network, malformed response and script errors fail the workflow.

Download the **sap-validation-report** artifact for `validation-report.json` and `validation-summary.md`; the Markdown also appears in the run summary. Reports contain counts, identifiers and link statuses, not keys, headers or raw SAP payloads. Exact-key redaction applies before writing reports; redirects are blocked so credentials cannot be forwarded to another target. Counts cover returned pages only (maximum 100 G/L records per linked query); continuation flags and unknown milestone counts make limitations explicit.

Application functionality and business behaviour are unchanged by this validation harness. It validates remote API connectivity and joins, not browser CORS/UI behaviour. No workflow success is claimed until an actual run completes. Purchase Order, Purchase Requisition and MCP remain out of scope.
