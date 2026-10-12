# DPE IT Investment Review Prototype

This prototype tests SAP Enterprise Project connectivity and related project elements/milestones, not the complete investment-review application. Four SAP API JSON specifications are stored in `./api/`. Only **Enterprise Project** is currently integrated; G/L, Purchase Order, Purchase Requisition and MCP are not implemented. The initial project-list test was confirmed by the user: HTTP 200 and five real projects.

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

These observations are documentation only, not application fallback data. Sandbox contents may change. No G/L integration or other API work is started automatically.
