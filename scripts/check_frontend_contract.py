"""Credential-free HTML/normal-script contract check; standard library only."""

from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
REQUIRED_IDS = (
    "load-projects", "connection-status", "message", "error-details", "projects-body", "raw-response",
    "elements-panel", "selected-project", "elements-message", "elements-error", "elements-body", "raw-elements-response",
    "gl-panel", "load-financial-evidence", "gl-project", "gl-message", "gl-error", "gl-summary", "gl-body",
    "raw-gl-response", "gl-diagnostic", "raw-gl-diagnostic",
    "po-panel", "load-po-evidence", "po-project", "po-message", "po-error", "po-summary", "po-body", "raw-po-response",
    "nav-dashboard", "nav-investments", "nav-reviews", "page-title", "storage-notice",
    "dashboard-view", "dashboard-cards", "dashboard-decisions", "dashboard-portfolio-count", "page-eyebrow", "decision-queue-title", "dashboard-filter-count", "queue-help", "queue-help-trigger", "recent-decisions-title",
    "investments-view", "detail-view", "investment-context", "detail-review-status", "start-review", "view-last-decision",
    "detail-lifecycle-overview", "reload-lifecycle", "load-review-evidence", "detail-financial-overview", "detail-procurement-overview",
    "reviews-view", "reviews-body", "review-chrome", "current-review-project", "review-steps",
    "workflow-message", "review-back-investment", "assessment-view", "assessment-form",
    "review-basis", "assessment-alignment", "assessment-benefits", "assessment-delivery", "assessment-financial-evidence",
    "assessment-cost", "assessment-risk", "assessment-value", "assessment-comments", "assessment-dependencies", "assessment-owner",
    "assessment-save-summary", "summary-view", "review-summary", "back-assessment", "proceed-decision", "decision-view", "decision-form",
    "decision-outcome", "decision-rationale", "decision-owner", "decision-requirements", "decision-action", "decision-action-owner",
    "decision-next-date", "back-summary", "confirm-decision", "confirmation-view", "confirmation-record", "return-investment", "back-dashboard",
    "dashboard-attention", "review-trigger", "governance-directory-status", "decision-owner-help",
    "decision-follow-up", "decision-follow-up-title", "confirmation-outcome",
    "project-refresh-error", "retry-projects", "project-diagnostics", "investment-technical-details", "technical-evidence-context", "decision-incomplete",
    "detail-source", "showcase-investment-context", "technical-source", "showcase-project-payload", "raw-showcase-project", "reset-showcase",
    "signals-help", "decision-context-title", "decision-context-counts", "decision-rationale-help",
    "summary-decision-overview", "decision-next-date-help",
)
REQUIRED_SCRIPTS = (
    "config.local.js", "api-config.js", "js/data/showcase-portfolio.js", "js/core/state.js", "js/core/utils.js", "js/core/review-rules.js",
    "js/services/sap-http.js", "js/services/project-service.js", "js/services/gl-service.js",
    "js/services/po-service.js", "js/services/governance-directory.js", "js/services/showcase-service.js", "js/services/review-store.js", "js/ui/renderers.js", "js/ui/governance.js", "app.js",
)


class FrontendHTML(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = []
        self.scripts = []
        self.errors = []

    def handle_starttag(self, tag, attrs):
        if sum(name == "id" for name, _ in attrs) > 1:
            self.errors.append("Multiple id attributes on one element are not allowed.")
        self.ids.extend(value for name, value in attrs if name == "id")
        if tag == "script":
            if any(count > 1 for count in Counter(name for name, _ in attrs).values()):
                self.errors.append("Duplicate script attributes are not allowed.")
            self.scripts.append(dict(attrs))

    def handle_startendtag(self, tag, attrs):
        if tag == "script":
            self.errors.append("Script elements must have closing tags, not self-closing syntax.")
        self.handle_starttag(tag, attrs)


def validate_html(text):
    parser = FrontendHTML()
    parser.feed(text)
    parser.close()
    errors = list(parser.errors)
    duplicates = [value for value, count in Counter(parser.ids).items() if count > 1]
    if duplicates:
        errors.append("Duplicate HTML IDs: " + ", ".join(str(value) for value in duplicates))
    if any(not value for value in parser.ids):
        errors.append("HTML IDs must not be empty.")
    missing = [value for value in REQUIRED_IDS if value not in parser.ids]
    if missing:
        errors.append("Missing functional IDs: " + ", ".join(missing))
    sources = [script.get("src") for script in parser.scripts]
    missing_scripts = [source for source in REQUIRED_SCRIPTS if source not in sources]
    if missing_scripts:
        errors.append("Missing required scripts: " + ", ".join(missing_scripts))
    # Intentional strict order: update this manifest when the runtime contract changes.
    if sources != list(REQUIRED_SCRIPTS):
        errors.append("Script list/order must match the contract: local config first, dependencies next, app.js last.")
    for script in parser.scripts:
        if "defer" not in script or "async" in script:
            errors.append("All scripts must use defer without async.")
            break
    if any((script.get("type") or "").strip().lower() not in ("", "text/javascript", "application/javascript") for script in parser.scripts):
        errors.append("Only normal JavaScript scripts are allowed; no ES modules.")
    return errors


def main():
    try:
        errors = validate_html((ROOT / "index.html").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        print("FAIL: could not read/parse index.html.", file=sys.stderr)
        return 1
    for source in REQUIRED_SCRIPTS:
        # The ignored local credential need not exist in CI and is never opened.
        if source != "config.local.js" and not (ROOT / source).is_file():
            errors.append("Referenced JavaScript file does not exist: " + source)
    if errors:
        for error in errors:
            print("FAIL: " + error, file=sys.stderr)
        return 1
    print(f"PASS: {len(REQUIRED_IDS)} functional IDs; unique IDs; deferred dependency order; local config first; app.js last.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
