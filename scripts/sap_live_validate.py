"""Read-only SAP Sandbox connectivity/join checks; Python standard library only."""

import gzip
import html
import json
import os
from pathlib import Path
import re
import sys
import zlib
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import HTTPRedirectHandler, Request, build_opener


PROJECT_BASE = (
    "https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/"
    "API_ENTERPRISE_PROJECT_SRV;v=0002"
)
GL_BASE = "https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/API_GLACCOUNTLINEITEM"
PO_BASE = "https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata4/sap/api_purchaseorder_2/srvd_a2x/sap/purchaseorder/0001"
RESP_BASE_CANDIDATES = (
    "https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata4/sap/api_respymgmt_team_srv/srvd_a2x/sap/ce_api_respym_team_srv/0002",
    "https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata4/sap/API_RESPYMGMT_TEAM_SRV/srvd_a2x/sap/CE_API_RESPYM_TEAM_SRV/0002",
)
PROJECT_PATH = "/A_EnterpriseProject"
ELEMENT_PATH = "/A_EnterpriseProject(guid'{ProjectUUID}')/to_EnterpriseProjectElement"
GL_PATH = "/GLAccountLineItem"
PO_PATH = "/PurchaseOrderAccountAssignment"
PROJECT_LIMIT = 5
GL_LIMIT = 100
PO_LIMIT = 100
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
PO_FIELDS = (
    "PurchaseOrder", "PurchaseOrderItem", "AccountAssignmentNumber", "WBSElementInternalID",
    "WBSElementExternalID", "DocumentCurrency", "PurgDocNetAmount", "Quantity",
    "OrderQuantityUnit", "MultipleAcctAssgmtDistrPercent", "GLAccount", "CompanyCode",
    "IsDeleted", "IsFinallyInvoiced", "CreationDate", "IsAcctLineFinal", "AcctLineFinalReason",
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


def collection_url(base, path, fields, top=None, filter_value=None, format_json=True):
    query = {"$select": ",".join(fields)}
    if format_json:
        query["$format"] = "json"
    if top is not None:
        query["$top"] = str(top)
    if filter_value is not None:
        query["$filter"] = filter_value
    return base + path + "?" + urlencode(query)


class SAPClient:
    def __init__(self, api_key):
        self.api_key = api_key
        self.opener = build_opener(NoRedirects())

    def json_response(self, url, label):
        request = Request(url, headers={"APIKey": self.api_key, "Accept": "application/json", "Accept-Encoding": "identity"})
        try:
            with self.opener.open(request, timeout=TIMEOUT_SECONDS) as response:
                status = response.status
                if not 200 <= status < 300:
                    raise ValidationError(f"{label}: HTTP {status}.")
                content_type = response.headers.get("Content-Type", "")
                content_encoding = response.headers.get("Content-Encoding", "")
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
        encoding = content_encoding.strip().lower()
        try:
            if encoding == "gzip":
                body = gzip.decompress(body)
            elif encoding == "deflate":
                body = zlib.decompress(body)
            elif encoding not in ("", "identity"):
                raise ValidationError(
                    f"{label}: HTTP {status}, unsupported Content-Encoding={encoding[:40]}.",
                    status,
                )
        except (OSError, zlib.error):
            raise ValidationError(
                f"{label}: HTTP {status}, could not decompress Content-Encoding={encoding or 'unknown'}.",
                status,
            ) from None
        if len(body) > MAX_RESPONSE_BYTES:
            raise ValidationError(f"{label}: decompressed response exceeded the safety size limit.", status)
        try:
            text_body = body.decode("utf-8-sig")
            data = json.loads(text_body)
        except (ValueError, UnicodeError):
            safe_type = re.sub(r"[^A-Za-z0-9_./;+ =-]", "?", content_type)[:120]
            safe_encoding = re.sub(r"[^A-Za-z0-9_.+-]", "?", content_encoding)[:40]
            raise ValidationError(
                f"{label}: HTTP {status}, malformed JSON "
                f"(Content-Type={safe_type or 'unknown'}, Content-Encoding={safe_encoding or 'none'}).",
                status,
            ) from None
        return data, status

    def collection(self, url, label):
        data, status = self.json_response(url, label)
        wrapper = data.get("d") if isinstance(data, dict) else None
        records = wrapper.get("results") if isinstance(wrapper, dict) else None
        if not isinstance(records, list) or any(not isinstance(row, dict) for row in records):
            raise ValidationError(f"{label}: HTTP {status}, expected OData V2 d.results records.", status)
        return records, status, bool(wrapper.get("__next"))

    def collection_v4(self, url, label):
        data, status = self.json_response(url, label)
        records = data.get("value") if isinstance(data, dict) else None
        if not isinstance(records, list) or any(not isinstance(row, dict) for row in records):
            raise ValidationError(f"{label}: HTTP {status}, expected OData V4 value records.", status)
        return records, status, bool(data.get("@odata.nextLink"))


def string_field(record, field):
    if field not in record or (record[field] is not None and not isinstance(record[field], str)):
        raise ValidationError(f"Unexpected or missing SAP string field: {field}.")
    return record[field] or ""


def boolean_field(record, field):
    if field not in record or (record[field] is not None and type(record[field]) is not bool):
        raise ValidationError(f"Unexpected or missing SAP Boolean field: {field}.")
    return record[field]


def project_ids_equivalent(left, right):
    if not isinstance(left, str) or not isinstance(right, str) or not left or not right:
        return False
    if left == right:
        return True
    return bool(re.fullmatch(r"[0-9]+", left) and re.fullmatch(r"[0-9]+", right)) and (left.lstrip("0") or "0") == (right.lstrip("0") or "0")


def project_id_variants(value):
    return list(dict.fromkeys([value, value.lstrip("0") or "0"])) if re.fullmatch(r"[0-9]+", value) else [value]


def validate_purchase_orders(client, entry, report):
    wbs_ids = entry["wbs_ids"]
    if not wbs_ids:
        entry.update(po_linked_record_count=0, po_filter_integrity="not_tested", po_purchase_orders=[])
        return
    filter_value = " or ".join(f"WBSElementInternalID eq {odata_string(value)}" for value in wbs_ids)
    try:
        rows, status, has_more = client.collection_v4(
            collection_url(PO_BASE, PO_PATH, PO_FIELDS, top=PO_LIMIT, filter_value=filter_value, format_json=False),
            "Purchase Order WBS query",
        )
        if len(rows) > PO_LIMIT:
            raise ValidationError("Purchase Order: response exceeded requested 100-record limit.", status)
        linked = [row for row in rows if isinstance(row.get("WBSElementInternalID"), str) and row["WBSElementInternalID"] in wbs_ids]
        unexpected = [row for row in rows if not (isinstance(row.get("WBSElementInternalID"), str) and row["WBSElementInternalID"] in wbs_ids)]
        purchase_orders = sorted({string_field(row, "PurchaseOrder") for row in linked})
    except ValidationError:
        report["purchase_order_api"]["connectivity"] = "failed"
        raise
    integrity = "mismatch" if unexpected else "ok"
    entry.update(
        po_linked_record_count=len(linked), po_filter_integrity=integrity,
        po_purchase_orders=purchase_orders, po_http_status=status, po_has_more=has_more,
        po_returned_record_count=len(rows), po_discarded_record_count=len(unexpected),
        po_unexpected_identifiers=sorted({row.get("WBSElementInternalID") if isinstance(row.get("WBSElementInternalID"), str) else "(missing or non-string)" for row in unexpected})[:10],
    )
    report["purchase_order_api"]["connectivity"] = "success"
    report["purchase_order_api"]["any_project_join_found"] |= bool(linked)
    report["purchase_order_api"]["filter_integrity_warning"] |= bool(unexpected)


def safe_responsibility_sample(record):
    """Retain non-personal sample values only for API suitability assessment."""
    safe = {}
    for key, value in record.items():
        lowered = key.lower()
        if any(token in lowered for token in ("name", "email", "phone", "address", "person", "user")):
            continue
        if isinstance(value, (str, int, float, bool)) or value is None:
            safe[key] = value
    return safe


def probe_responsibility_management(client, report):
    """Exploratory, non-gating probe for a governed Decision Owner data source."""
    result = report["responsibility_management_api"]
    entities = ("TeamHeaders", "TeamMembers", "TeamMemberFunctions", "TeamOwners")
    last_error = None
    for base in RESP_BASE_CANDIDATES:
        candidate = {"base_variant": "lowercase" if base == RESP_BASE_CANDIDATES[0] else "documented-case", "entities": {}}
        try:
            for entity in entities:
                rows, status, has_more = client.collection_v4(
                    base + "/" + entity + "?%24top=5",
                    f"Responsibility Management {entity}",
                )
                candidate["entities"][entity] = {
                    # Schema/count/status only: never emit member/sample values.
                    "http_status": status,
                    "record_count": len(rows),
                    "has_more": has_more,
                    "sample_keys": sorted(rows[0].keys()) if rows else [],
                }
            result.update(
                status="success",
                selected_base_variant=candidate["base_variant"],
                entities=candidate["entities"],
                note="Read-only Sandbox probe succeeded. Suitability still depends on whether returned team/member/function semantics match IT investment governance decision rights.",
            )
            return
        except ValidationError as error:
            last_error = error
            result["attempts"].append({
                "base_variant": candidate["base_variant"],
                "http_status": error.http_status,
                "result": str(error),
            })
    result.update(
        status="unavailable",
        note="No tested SAP Sandbox URL variant returned usable Responsibility Management collections with the current APIKey pattern.",
        last_http_status=last_error.http_status if last_error else None,
    )


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
        project_id = string_field(project, "ProjectInternalID")
        project_uuid = string_field(project, "ProjectUUID")
        if not re.fullmatch(r"[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}", project_uuid):
            raise ValidationError("Enterprise Project: invalid ProjectUUID; no navigation request sent.")
        entry = {
            "project": project_code, "project_internal_id": project_id,
            "element_count": None, "wbs_ids": [], "milestone_count": None,
            "main_milestone_count": None, "gl_link_method": "not_tested",
            "gl_linked_record_count": None, "gl_queries": [],
            "po_linked_record_count": None, "po_filter_integrity": "not_tested", "po_purchase_orders": [],
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
            wbs_id = string_field(element, "WBSElementInternalID")
            if wbs_id.strip():
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
            query_ids = project_id_variants(identifiers[0]) if field == "ProjectInternalID" else identifiers
            filter_value = " or ".join(f"{field} eq {odata_string(value)}" for value in query_ids)
            try:
                rows, http_status, more = client.collection(
                    collection_url(GL_BASE, GL_PATH, GL_FIELDS, top=GL_LIMIT, filter_value=filter_value),
                    "G/L linked query",
                )
                if len(rows) > GL_LIMIT:
                    raise ValidationError("G/L linked query: response exceeded requested 100-record limit.")
                observed = [string_field(row, field) for row in rows]
                exact_count = sum(value in identifiers for value in observed)
                accepted = [value for value in observed if (project_ids_equivalent(value, identifiers[0]) if field == "ProjectInternalID" else value in identifiers)]
                unexpected = sorted({value for value in observed if value not in accepted})
            except ValidationError:
                report["gl_api"]["connectivity"] = "failed"
                raise
            report["gl_api"]["connectivity"] = "success"
            if unexpected:
                report["gl_api"]["filter_integrity_warning"] = True
            entry["gl_queries"].append({
                "method": field, "http_status": http_status,
                "returned_record_count": len(rows), "exact_match_count": exact_count,
                "numeric_equivalent_match_count": len(accepted) - exact_count,
                "filter_integrity": "ok" if not unexpected else "mismatch",
                "unexpected_identifiers": unexpected[:10], "has_more": more,
            })
            # WBS matches stay exact; numeric-only equivalence is confined to project-ID fallback.
            # Unexpected Sandbox rows are diagnostic only and never attached to the project.
            return len(accepted)

        linked_count = linked_query("WBSElementInternalID", sorted(wbs_ids)) if wbs_ids else 0
        link_method = "WBSElementInternalID" if linked_count else "none"
        if not linked_count and project_id.strip():
            linked_count = linked_query("ProjectInternalID", [project_id])
            link_method = "ProjectInternalID" if linked_count else "none"
        entry.update(gl_link_method=link_method, gl_linked_record_count=linked_count)
        report["gl_api"]["any_project_join_found"] |= linked_count > 0
        validate_purchase_orders(client, entry, report)

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
    if not report["purchase_order_api"]["any_project_join_found"]:
        po = report["purchase_order_api"]
        po["diagnostic_performed"] = True
        try:
            rows, status, has_more = client.collection_v4(
                collection_url(PO_BASE, PO_PATH, PO_FIELDS, top=5, format_json=False),
                "Unlinked Purchase Order diagnostic",
            )
            if len(rows) > 5:
                raise ValidationError("Purchase Order diagnostic exceeded requested five-record limit.", status)
        except ValidationError as error:
            po.update(connectivity="failed", diagnostic_http_status=error.http_status)
            raise
        po.update(connectivity="success", diagnostic_http_status=status,
                  diagnostic_record_count=len(rows), diagnostic_has_more=has_more)
    report["message"] += (" Purchase Order connectivity successful; "
                          + ("exact WBS-linked assignments found." if report["purchase_order_api"]["any_project_join_found"] else "no project-linked assignments found in tested Sandbox data."))
    probe_responsibility_management(client, report)
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
        "| Project | Project Internal ID | Elements | WBS IDs | Marked milestones | Main milestones | G/L link | G/L records | PO assignments | PO filter | PO numbers |",
        "| --- | --- | ---: | --- | ---: | ---: | --- | ---: | ---: | --- | --- |",
    ]
    for entry in report["projects"]:
        values = [entry["project"], entry["project_internal_id"], entry["element_count"],
                  ", ".join(entry["wbs_ids"]) or "none", entry["milestone_count"],
                  entry["main_milestone_count"], entry["gl_link_method"], entry["gl_linked_record_count"],
                  entry["po_linked_record_count"], entry["po_filter_integrity"], ", ".join(entry["po_purchase_orders"]) or "none"]
        lines.append("| " + " | ".join(markdown_cell(value) for value in values) + " |")
    gl = report["gl_api"]
    lines.extend(["", f"G/L connectivity: {gl['connectivity']}."])
    if gl.get("filter_integrity_warning"):
        lines.append("Warning: SAP Sandbox filtered G/L responses included unrelated identifiers. Only validated matches were counted (exact WBS; numeric-only leading-zero equivalence for secondary project IDs). Unexpected rows are not evidence.")
    if gl["diagnostic_performed"]:
        lines.append(f"Unlinked diagnostic: HTTP {gl['diagnostic_http_status']}; {gl['diagnostic_record_count']} records.")
        lines.append("Diagnostic records are not linked to any tested project and are not project evidence.")
    po = report["purchase_order_api"]
    lines.extend(["", f"Purchase Order connectivity: {po['connectivity']}."])
    if po["filter_integrity_warning"]:
        lines.append("Purchase Order filter-integrity warning: unrelated rows were discarded; only exact loaded WBS matches count as procurement evidence. Unexpected IDs/counts are in the JSON report.")
    if po["diagnostic_performed"]:
        lines.append(f"Unlinked PO diagnostic: HTTP {po['diagnostic_http_status']}; {po['diagnostic_record_count']} records. These are not project evidence.")
    responsibility = report["responsibility_management_api"]
    lines.extend(["", f"Responsibility Management exploratory probe: {responsibility['status']}.", responsibility.get("note", "")])
    if responsibility["status"] == "success":
        for entity, details in responsibility["entities"].items():
            lines.append(f"- {entity}: HTTP {details['http_status']}; {details['record_count']} records returned (top 5 probe).")
    elif responsibility.get("attempts"):
        for attempt in responsibility["attempts"]:
            lines.append(f"- {attempt['base_variant']}: {attempt['result']}")
    unknown = sum(entry.get("unknown_milestone_flag_count", 0) for entry in report["projects"])
    lines.extend(["", f"Unknown/missing milestone flags: {unknown}. Only string X is counted as marked; main milestones require Boolean true.",
                  "Counts cover returned pages only: up to 5 projects and 100 G/L/PO records per linked query. No automatic pagination; has_more flags are in the JSON report. WBS joins use only returned element IDs.",
                  "This is connectivity/join feasibility, not complete project cost, exact outstanding PO liability or DPE gate configuration."])
    return "\n".join(lines) + "\n"


def main():
    api_key = ""
    report = {
        "timestamp_utc": datetime.now(timezone.utc).isoformat(), "status": "failed",
        "message": "Validation has not completed.",
        "enterprise_project": {"status": "not_tested", "project_count": None},
        "projects": [],
        "gl_api": {"connectivity": "not_tested", "any_project_join_found": False,
                   "filter_integrity_warning": False,
                   "diagnostic_performed": False, "diagnostic_http_status": None,
                   "diagnostic_record_count": None},
        "purchase_order_api": {"connectivity": "not_tested", "any_project_join_found": False,
                               "filter_integrity_warning": False, "diagnostic_performed": False,
                               "diagnostic_http_status": None, "diagnostic_record_count": None},
        "responsibility_management_api": {"status": "not_tested", "attempts": [], "entities": {},
                                          "selected_base_variant": None, "note": ""},
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
