"""Read-only SAP Sandbox connectivity/join checks; Python standard library only."""

import html
import json
import os
from pathlib import Path
import re
import sys
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import HTTPRedirectHandler, Request, build_opener


PROJECT_BASE = (
    "https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/"
    "API_ENTERPRISE_PROJECT_SRV;v=0002"
)
GL_BASE = "https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/API_GLACCOUNTLINEITEM"
PROJECT_PATH = "/A_EnterpriseProject"
ELEMENT_PATH = "/A_EnterpriseProject(guid'{ProjectUUID}')/to_EnterpriseProjectElement"
GL_PATH = "/GLAccountLineItem"
PROJECT_LIMIT = 5
GL_LIMIT = 100
TIMEOUT_SECONDS = 30
MAX_RESPONSE_BYTES = 8 * 1024 * 1024

# Mirror the focused selections in api-config.js; no application refactor needed.
PROJECT_FIELDS = (
    "ProjectUUID", "ProjectInternalID", "Project", "ProjectDescription",
    "ProcessingStatus", "ProjectStartDate", "ProjectEndDate", "ProjectCurrency",
    "CompanyCode",
)
ELEMENT_FIELDS = (
    "ProjectElementUUID", "ProjectElement", "WBSElementInternalID", "ProjectUUID",
    "ProjectElementDescription", "ProcessingStatus", "EntProjectElementType",
    "PlannedStartDate", "PlannedEndDate", "ActualStartDate", "ActualEndDate",
    "ResponsibleCostCenter", "CompanyCode", "IsProjectMilestone",
    "ForecastedEndDate", "MilestoneApprovalStatus", "IsMainMilestone",
)
GL_FIELDS = (
    "ID", "ProjectInternalID", "WBSElementInternalID", "CompanyCode",
    "AccountingDocument", "LedgerGLLineItem", "GLAccount", "PostingDate", "DocumentDate",
    "CompanyCodeCurrency", "AmountInCompanyCodeCurrency", "GlobalCurrency",
    "AmountInGlobalCurrency", "DebitCreditCode", "IsCommitment", "IsReversal", "IsReversed",
    "PurchasingDocument", "PurchasingDocumentItem", "Supplier", "DocumentItemText",
)


class ValidationError(Exception):
    """A safe diagnostic message, never a request/header/raw-response dump."""

    def __init__(self, message, http_status=None):
        super().__init__(message)
        self.http_status = http_status


class NoRedirects(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # Never forward the APIKey header to a redirect target.
        return None


def odata_string(value):
    return "'" + value.replace("'", "''") + "'"


def collection_url(base, path, fields, top=None, filter_value=None):
    query = {"$select": ",".join(fields), "$format": "json"}
    if top is not None:
        query["$top"] = str(top)
    if filter_value is not None:
        query["$filter"] = filter_value
    return base + path + "?" + urlencode(query)


class SAPClient:
    def __init__(self, api_key):
        self.api_key = api_key
        self.opener = build_opener(NoRedirects())

    def collection(self, url, label):
        request = Request(url, headers={"APIKey": self.api_key, "Accept": "application/json"})
        try:
            with self.opener.open(request, timeout=TIMEOUT_SECONDS) as response:
                status = response.status
                if not 200 <= status < 300:
                    raise ValidationError(f"{label}: HTTP {status}.")
                body = response.read(MAX_RESPONSE_BYTES + 1)
        except HTTPError as error:
            # Deliberately omit bodies, headers, URLs and exception reprs.
            status = error.code
            error.close()
            raise ValidationError(f"{label}: HTTP {status}; request failed (including redirects).", status) from None
        except (URLError, TimeoutError, OSError):
            raise ValidationError(f"{label}: network, TLS or timeout failure.") from None
        if len(body) > MAX_RESPONSE_BYTES:
            raise ValidationError(f"{label}: response exceeded the safety size limit.", status)
        try:
            data = json.loads(body)
        except (ValueError, UnicodeError):
            raise ValidationError(f"{label}: HTTP {status}, malformed JSON.", status) from None
        wrapper = data.get("d") if isinstance(data, dict) else None
        records = wrapper.get("results") if isinstance(wrapper, dict) else None
        if not isinstance(records, list) or any(not isinstance(row, dict) for row in records):
            raise ValidationError(f"{label}: HTTP {status}, expected OData V2 d.results records.", status)
        return records, status, bool(wrapper.get("__next"))


def string_field(record, field):
    if field not in record or (record[field] is not None and not isinstance(record[field], str)):
        raise ValidationError(f"Unexpected or missing SAP string field: {field}.")
    return record[field] or ""


def boolean_field(record, field):
    if field not in record or (record[field] is not None and type(record[field]) is not bool):
        raise ValidationError(f"Unexpected or missing SAP Boolean field: {field}.")
    return record[field]


def run_validation(client, report):
    projects, status, has_more = client.collection(
        collection_url(PROJECT_BASE, PROJECT_PATH, PROJECT_FIELDS, top=PROJECT_LIMIT),
        "Enterprise Project",
    )
    if len(projects) > PROJECT_LIMIT:
        raise ValidationError("Enterprise Project: response exceeded requested five-project limit.")
    report["enterprise_project"].update(
        status="success", http_status=status, project_count=len(projects), has_more=has_more,
    )
    for project in projects:
        project_code = string_field(project, "Project")
        project_id = string_field(project, "ProjectInternalID").strip()
        project_uuid = string_field(project, "ProjectUUID")
        if not re.fullmatch(r"[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}", project_uuid):
            raise ValidationError("Enterprise Project: invalid ProjectUUID; no navigation request sent.")
        entry = {
            "project": project_code, "project_internal_id": project_id,
            "element_count": None, "wbs_ids": [], "milestone_count": None,
            "main_milestone_count": None, "gl_link_method": "not_tested",
            "gl_linked_record_count": None, "gl_queries": [],
        }
        report["projects"].append(entry)
        elements, element_status, elements_has_more = client.collection(
            collection_url(PROJECT_BASE, ELEMENT_PATH.replace("{ProjectUUID}", project_uuid), ELEMENT_FIELDS),
            "Project Elements",
        )
        wbs_ids = set()
        milestones = main_milestones = unknown_milestones = 0
        for element in elements:
            if string_field(element, "ProjectUUID") != project_uuid:
                raise ValidationError("Project Elements: returned ProjectUUID does not match its parent project.")
            wbs_id = string_field(element, "WBSElementInternalID").strip()
            if wbs_id:
                wbs_ids.add(wbs_id)
            milestone = string_field(element, "IsProjectMilestone").strip().upper()
            milestones += milestone == "X"
            unknown_milestones += element["IsProjectMilestone"] is None or milestone not in ("", "X")
            main_milestones += boolean_field(element, "IsMainMilestone") is True
        entry.update(
            element_count=len(elements), elements_http_status=element_status,
            elements_has_more=elements_has_more, wbs_ids=sorted(wbs_ids),
            milestone_count=milestones, main_milestone_count=main_milestones,
            unknown_milestone_flag_count=unknown_milestones,
        )

        def linked_query(field, identifiers):
            filter_value = " or ".join(f"{field} eq {odata_string(value)}" for value in identifiers)
            try:
                rows, http_status, more = client.collection(
                    collection_url(GL_BASE, GL_PATH, GL_FIELDS, top=GL_LIMIT, filter_value=filter_value),
                    "G/L linked query",
                )
                if len(rows) > GL_LIMIT:
                    raise ValidationError("G/L linked query: response exceeded requested 100-record limit.")
                if any(string_field(row, field) not in identifiers for row in rows):
                    raise ValidationError("G/L linked query: returned identifiers do not match the requested filter.")
            except ValidationError:
                report["gl_api"]["connectivity"] = "failed"
                raise
            report["gl_api"]["connectivity"] = "success"
            entry["gl_queries"].append({
                "method": field, "http_status": http_status,
                "returned_record_count": len(rows), "has_more": more,
            })
            return len(rows)

        linked_count = linked_query("ProjectInternalID", [project_id]) if project_id else 0
        link_method = "ProjectInternalID" if linked_count else "none"
        if not linked_count and wbs_ids:
            linked_count = linked_query("WBSElementInternalID", sorted(wbs_ids))
            link_method = "WBSElementInternalID" if linked_count else "none"
        entry.update(gl_link_method=link_method, gl_linked_record_count=linked_count)
        report["gl_api"]["any_project_join_found"] |= linked_count > 0

    if not report["gl_api"]["any_project_join_found"]:
        # Exactly one diagnostic for the entire run, never copied into project entries.
        report["gl_api"]["diagnostic_performed"] = True
        try:
            rows, status, has_more = client.collection(
                collection_url(GL_BASE, GL_PATH, GL_FIELDS, top=5), "Unlinked G/L diagnostic",
            )
            if len(rows) > 5:
                raise ValidationError("Unlinked G/L diagnostic: response exceeded requested five-record limit.")
        except ValidationError as error:
            report["gl_api"]["connectivity"] = "failed"
            report["gl_api"]["diagnostic_http_status"] = error.http_status
            raise
        report["gl_api"].update(
            connectivity="success", diagnostic_http_status=status,
            diagnostic_record_count=len(rows), diagnostic_has_more=has_more,
        )
        report["message"] = "Connectivity successful; no project-linked G/L records found in tested Sandbox data."
    else:
        report["message"] = "Connectivity successful; project-linked G/L records found in tested Sandbox data."
    report["status"] = "success"


def redact(value, api_key):
    if isinstance(value, str):
        return value.replace(api_key, "[REDACTED]") if api_key else value
    if isinstance(value, list):
        return [redact(item, api_key) for item in value]
    if isinstance(value, dict):
        return {key: redact(item, api_key) for key, item in value.items()}
    return value


def markdown_cell(value):
    text = "—" if value is None else str(value)
    return html.escape(text).replace("|", "&#124;").replace("\n", " ").replace("\r", " ")


def summary_markdown(report):
    lines = [
        "# SAP Live Validation", "", f"UTC: {report['timestamp_utc']}", "",
        markdown_cell(report["message"]), "",
        f"Enterprise Project: {report['enterprise_project']['status']}; "
        f"returned projects: {report['enterprise_project']['project_count']}", "",
        "| Project | Project Internal ID | Elements | WBS IDs | Marked milestones | Main milestones | G/L link | Linked records |",
        "| --- | --- | ---: | --- | ---: | ---: | --- | ---: |",
    ]
    for entry in report["projects"]:
        values = [entry["project"], entry["project_internal_id"], entry["element_count"],
                  ", ".join(entry["wbs_ids"]) or "none", entry["milestone_count"],
                  entry["main_milestone_count"], entry["gl_link_method"], entry["gl_linked_record_count"]]
        lines.append("| " + " | ".join(markdown_cell(value) for value in values) + " |")
    gl = report["gl_api"]
    lines.extend(["", f"G/L connectivity: {gl['connectivity']}."])
    if gl["diagnostic_performed"]:
        lines.append(f"Unlinked diagnostic: HTTP {gl['diagnostic_http_status']}; {gl['diagnostic_record_count']} records.")
        lines.append("Diagnostic records are not linked to any tested project and are not project evidence.")
    unknown = sum(entry.get("unknown_milestone_flag_count", 0) for entry in report["projects"])
    lines.extend(["", f"Unknown/missing milestone flags: {unknown}. Only string X is counted as marked; main milestones require Boolean true.",
                  "Counts cover returned pages only: up to 5 projects and 100 G/L records per linked query. No automatic pagination; has_more flags are in the JSON report. WBS joins use only returned element IDs.",
                  "This is connectivity/join feasibility, not complete project cost or DPE gate configuration."])
    return "\n".join(lines) + "\n"


def main():
    api_key = ""
    report = {
        "timestamp_utc": datetime.now(timezone.utc).isoformat(), "status": "failed",
        "message": "Validation has not completed.",
        "enterprise_project": {"status": "not_tested", "project_count": None},
        "projects": [],
        "gl_api": {"connectivity": "not_tested", "any_project_join_found": False,
                   "diagnostic_performed": False, "diagnostic_http_status": None,
                   "diagnostic_record_count": None},
    }
    try:
        try:
            api_key = os.environ["SAP_API_KEY"]
        except KeyError:
            raise ValidationError("Missing SAP_API_KEY repository secret/environment variable.") from None
        if not api_key.strip() or api_key == "PASTE_YOUR_SAP_SANDBOX_API_KEY_HERE":
            raise ValidationError("SAP_API_KEY must contain a non-empty Sandbox credential, not a placeholder.")
        run_validation(SAPClient(api_key), report)
    except ValidationError as error:
        report["message"] = str(error)
        if report["enterprise_project"]["status"] == "not_tested":
            report["enterprise_project"]["status"] = "not_completed"
    except Exception:
        # Unexpected exceptions may contain secrets; never print repr/tracebacks.
        report["message"] = "Unexpected validation script error; no sensitive exception details retained."
    safe_report = redact(report, api_key)
    try:
        Path("validation-report.json").write_text(redact(json.dumps(safe_report, indent=2), api_key) + "\n", encoding="utf-8")
        Path("validation-summary.md").write_text(redact(summary_markdown(safe_report), api_key), encoding="utf-8")
    except Exception:
        print("Validation failed: could not write report files.", file=sys.stderr)
        return 1
    if report["status"] != "success":
        # Fixed console text; detailed safe diagnosis is in the report/step summary.
        print("SAP live validation failed. See validation-summary.md for the diagnosis.", file=sys.stderr)
        return 1
    print(safe_report["message"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
