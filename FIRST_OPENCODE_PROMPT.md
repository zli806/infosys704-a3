# First OpenCode Prompt

Paste the prompt below into OpenCode after placing these files in the project root:

- `PROJECT_CONTEXT.md`
- `DECISIONS.md`
- `.gitignore`
- `config.example.js`

Your existing `./api/` folder should already contain the four SAP API JSON specifications.

---

You are the implementation developer for an INFOSYS 704 A3 prototype.

Before making any changes:

1. Read `PROJECT_CONTEXT.md`.
2. Read `DECISIONS.md`.
3. Inspect `./api/API_ENTERPRISE_PROJECT_SRV_0002.json`.
4. Treat those files as the current source of truth.
5. Do not redesign the business solution.
6. Do not integrate all four SAP APIs yet.

The immediate goal is only to prove that the SAP Enterprise Project Sandbox API can be called successfully from a simple local web page and that real SAP Sandbox project data can be displayed.

==================================================
CURRENT FOLDER
==================================================

The project already contains:

./PROJECT_CONTEXT.md
./DECISIONS.md
./.gitignore
./config.example.js

and:

./api/API_ENTERPRISE_PROJECT_SRV_0002.json
./api/API_GLACCOUNTLINEITEM.json
./api/CE_PURCHASEORDER_0001.json
./api/CE_PURCHASEREQUISITION_0001.json

Do not modify or delete anything inside `./api/`.

==================================================
CREATE THESE INITIAL FILES
==================================================

Create:

index.html
styles.css
app.js
api-config.js
config.local.js
README.md

Do not overwrite `PROJECT_CONTEXT.md`, `DECISIONS.md`, `.gitignore`, or `config.example.js`.

The expected structure is:

project-root/
│
├── api/
│   ├── API_ENTERPRISE_PROJECT_SRV_0002.json
│   ├── API_GLACCOUNTLINEITEM.json
│   ├── CE_PURCHASEORDER_0001.json
│   └── CE_PURCHASEREQUISITION_0001.json
│
├── PROJECT_CONTEXT.md
├── DECISIONS.md
├── index.html
├── styles.css
├── app.js
├── api-config.js
├── config.local.js
├── config.example.js
├── .gitignore
└── README.md

==================================================
LOCAL API KEY CONFIGURATION
==================================================

Create `config.local.js` with exactly this placeholder structure:

window.APP_CONFIG = {
  SAP_API_KEY: "PASTE_YOUR_SAP_SANDBOX_API_KEY_HERE"
};

Do not replace the placeholder with a real API key.

I will manually paste my SAP Sandbox API key into `config.local.js` after you finish.

Do not put the real API key into:
- app.js
- index.html
- api-config.js
- README.md
- PROJECT_CONTEXT.md
- DECISIONS.md
- any file under ./api

Do not display or log the API key.

Confirm that `.gitignore` excludes:

config.local.js

If `.gitignore` already contains this entry, leave it in place.

The application must check whether the API key is missing or still equals:

PASTE_YOUR_SAP_SANDBOX_API_KEY_HERE

If so, do not send the SAP request. Display:

"Please add your SAP Sandbox API key to config.local.js first."

==================================================
ENTERPRISE PROJECT API
==================================================

Use this exact SAP Sandbox base URL:

https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/API_ENTERPRISE_PROJECT_SRV;v=0002

Use this specification as the source of truth:

./api/API_ENTERPRISE_PROJECT_SRV_0002.json

For this first test use the Enterprise Project collection endpoint:

/A_EnterpriseProject

Retrieve at most 5 records.

Use an OData query equivalent to:

$top=5

Select these fields only if they are confirmed by the JSON specification:

ProjectUUID
ProjectInternalID
Project
ProjectDescription
ProcessingStatus
ProjectStartDate
ProjectEndDate
ProjectCurrency
CompanyCode

Every SAP request must include:

APIKey: window.APP_CONFIG.SAP_API_KEY

Request JSON data.

This API is OData V2. Confirm the response shape from the JSON specification and parse the collection correctly.

Do not assume an OData V4 `data.value` response.

If the specification shows the collection under `data.d.results`, handle that structure correctly.

==================================================
USER INTERFACE
==================================================

Build one clean page.

Title:
DPE IT Investment Review Prototype

Subtitle:
SAP Enterprise Project API Connection Test

Include:

1. a connection status area;
2. a `Load Projects` button;
3. a project table;
4. an error / status message area;
5. a collapsible `Raw SAP Response` debugging area.

Display these visible columns where data exists:

- Project
- Description
- Status
- Start Date
- End Date
- Currency
- Company Code

Keep `ProjectUUID` and `ProjectInternalID` available internally because later development will use them for project/WBS linking.

Format dates into readable values where practical.

Keep the interface simple and professional. Do not spend significant time on final visual design yet.

==================================================
BEHAVIOUR
==================================================

When I click `Load Projects`:

1. validate that `config.local.js` contains a real API key;
2. build the Enterprise Project request;
3. send it to the SAP Sandbox;
4. include the `APIKey` header;
5. parse the OData V2 response;
6. display up to five returned projects;
7. show a success message with the number of returned projects;
8. put the raw JSON response in the collapsible debugging area.

If the request fails:

- show the HTTP status code;
- show the HTTP status text;
- show the SAP response body where available;
- log useful diagnostics to the browser console;
- never log the API key;
- never silently switch to mocked data.

If a browser / CORS / local-file restriction prevents the request, report that clearly rather than inventing fake success.

Do not disable browser security.

==================================================
TECHNICAL CONSTRAINTS
==================================================

For this first connectivity test:

- plain HTML, CSS and JavaScript only;
- no React;
- no Vue;
- no Angular;
- no npm;
- no build tool;
- no backend server;
- use the browser's built-in `fetch()` API;
- do not integrate G/L, Purchase Order or Purchase Requisition yet;
- do not implement MCP yet;
- do not create mock SAP responses.

==================================================
README
==================================================

Create a short `README.md` explaining:

1. this is the first SAP API connectivity test;
2. four SAP API specifications are stored in `./api`;
3. only Enterprise Project is currently integrated;
4. the user must manually add the SAP Sandbox API key to `config.local.js`;
5. `config.local.js` must not be committed or shared;
6. how to open / run the local page;
7. click `Load Projects`;
8. expected result: up to five real SAP Sandbox Enterprise Projects appear;
9. if the call fails, inspect the visible HTTP error and browser console;
10. the next planned step is to retrieve project elements and milestones for a selected project.

==================================================
GITHUB
==================================================

Do not create or publish a GitHub repository yet unless I explicitly ask you to after this connectivity test works.

However, keep the project ready for Git by preserving `.gitignore` and ensuring `config.local.js` is excluded.

==================================================
DEFINITION OF DONE
==================================================

Do not consider the task complete until:

[ ] `index.html` exists.
[ ] `styles.css` exists.
[ ] `app.js` exists.
[ ] `api-config.js` exists.
[ ] `config.local.js` exists with placeholder only.
[ ] `README.md` exists.
[ ] existing `./api` JSON files are unchanged.
[ ] `PROJECT_CONTEXT.md` and `DECISIONS.md` are unchanged.
[ ] `.gitignore` excludes `config.local.js`.
[ ] the API key is not hard-coded anywhere.
[ ] `index.html` loads the required scripts correctly.
[ ] clicking `Load Projects` calls the SAP Enterprise Project Sandbox endpoint.
[ ] the request includes the `APIKey` header.
[ ] OData V2 response parsing matches the JSON specification.
[ ] returned project data is displayed.
[ ] raw SAP JSON can be inspected.
[ ] errors are visible and useful.
[ ] no mocked fallback data is used.

Before finishing:

- re-read `./api/API_ENTERPRISE_PROJECT_SRV_0002.json`;
- verify the endpoint and field names;
- verify the OData response parsing;
- tell me exactly which files you created or changed;
- tell me any assumptions or technical issues you found;
- do not start the next feature automatically.
