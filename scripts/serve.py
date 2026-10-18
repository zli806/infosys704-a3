"""Local static preview with a same-origin, read-only SAP Sandbox proxy."""

import argparse
from functools import partial
import gzip
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO
import json
from pathlib import Path
import re
import socket
import time
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener
import zlib


ROOT = Path(__file__).resolve().parents[1]
SAP_ORIGIN = "https://sandbox.api.sap.com"
PROXY_PREFIX = "/sap-proxy"
MAX_BODY_BYTES = 8 * 1024 * 1024
PROJECT_PATH = "/s4hanacloud/sap/opu/odata/sap/API_ENTERPRISE_PROJECT_SRV;v=0002/A_EnterpriseProject"
GL_PATH = "/s4hanacloud/sap/opu/odata/sap/API_GLACCOUNTLINEITEM/GLAccountLineItem"
PO_PATH = "/s4hanacloud/sap/opu/odata4/sap/api_purchaseorder_2/srvd_a2x/sap/purchaseorder/0001/PurchaseOrderAccountAssignment"
UUID = r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
ELEMENT_PATH = re.compile(re.escape(PROJECT_PATH) + rf"\(guid'{UUID}'\)/to_EnterpriseProjectElement")


class NoRedirects(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # Never forward the API key to a redirect target.
        return None


OPENER = build_opener(NoRedirects())


class AppHandler(SimpleHTTPRequestHandler):
    def log_request(self, code="-", size="-"):
        # No headers, query strings, credentials or response bodies in logs.
        self.log_message("%s %s", self.command, code)

    def respond(self, status, body, content_type="application/json; charset=utf-8"):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def problem(self, status, message):
        self.respond(status, json.dumps({"error": {"message": message}}).encode("utf-8"))

    def local_request(self):
        port = self.server.server_port
        hosts = {f"127.0.0.1:{port}", f"localhost:{port}"}
        host = self.headers.get("Host")
        origin = self.headers.get("Origin")
        # Loopback binding + Host validation also prevent DNS rebinding.
        if host not in hosts or (origin and origin != f"http://{host}"):
            self.problem(403, "Only same-origin localhost requests are allowed.")
            return False
        if self.headers.get("Sec-Fetch-Site", "none") not in {"none", "same-origin"}:
            self.problem(403, "Cross-origin requests are not allowed.")
            return False
        return True

    def list_directory(self, path):
        self.problem(403, "Directory listings are disabled.")
        return None

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        if not self.local_request():
            return
        target = urlsplit(self.path)
        if target.scheme or target.netloc or target.fragment:
            self.problem(400, "Use a local relative request path.")
            return
        if target.path.startswith(PROXY_PREFIX):
            if self.command != "GET":
                self.problem(405, "SAP proxy supports GET only.")
                return
            self.proxy(target)
            return
        path = Path(self.translate_path(target.path)).resolve()
        root = Path(self.directory).resolve()
        if not path.is_relative_to(root) or any(part.startswith(".") for part in Path(unquote(target.path)).parts if part != "/"):
            self.problem(403, "This local path is not available.")
            return
        if target.path in {"/", "/index.html"}:
            try:
                page = (root / "index.html").read_bytes()
            except OSError:
                self.problem(404, "The local index.html could not be loaded.")
                return
            # A normal reload can otherwise reuse a cached placeholder config or
            # pre-proxy transport script from the old python -m http.server.
            version = str(time.time_ns()).encode("ascii")
            page = re.sub(rb'(<script src=")([^"?]+)(")',
                          lambda match: match[1] + match[2] + b"?preview=" + version + match[3], page)
            self.respond(200, page, "text/html; charset=utf-8")
            return
        if target.path == "/config.local.js":
            try:
                configuration = path.read_bytes()
            except OSError:
                self.problem(404, "Create config.local.js from config.example.js first.")
                return
            # Enable the proxy for this server only; never edit the user's file/key.
            configuration += b'\nwindow.APP_CONFIG.SAP_PROXY_BASE_URL = "/sap-proxy";\n'
            self.respond(200, configuration, "text/javascript; charset=utf-8")
            return
        if self.command == "HEAD":
            super().do_HEAD()
        else:
            super().do_GET()

    def proxy(self, target):
        path = target.path[len(PROXY_PREFIX):]
        if path not in {PROJECT_PATH, GL_PATH, PO_PATH} and not ELEMENT_PATH.fullmatch(path):
            self.problem(404, "This SAP resource is not enabled in the local proxy.")
            return
        key = self.headers.get("APIKey", "").strip()
        if not key or key == "PASTE_YOUR_SAP_SANDBOX_API_KEY_HERE":
            self.problem(401, "Please add your SAP Sandbox API key to config.local.js first.")
            return
        url = SAP_ORIGIN + path + ("?" + target.query if target.query else "")
        request = Request(url, headers={"APIKey": key, "Accept": "application/json", "Accept-Encoding": "identity"})
        try:
            try:
                upstream = OPENER.open(request, timeout=25)
            except HTTPError as error:
                # Retain real SAP error statuses/bodies, but never follow redirects.
                upstream = error
            with upstream:
                status = upstream.code
                if 300 <= status < 400:
                    self.problem(502, "SAP returned a redirect; the local proxy did not follow it.")
                    return
                body = upstream.read(MAX_BODY_BYTES + 1)
                if len(body) > MAX_BODY_BYTES:
                    self.problem(502, "SAP response exceeded the local proxy size limit.")
                    return
                encoding = upstream.headers.get("Content-Encoding", "").strip().lower()
                if encoding == "gzip":
                    with gzip.GzipFile(fileobj=BytesIO(body)) as compressed:
                        body = compressed.read(MAX_BODY_BYTES + 1)
                elif encoding == "deflate":
                    decompressor = zlib.decompressobj()
                    body = decompressor.decompress(body, MAX_BODY_BYTES + 1)
                    if len(body) <= MAX_BODY_BYTES and not decompressor.eof:
                        raise ValueError("Incomplete compressed response")
                elif encoding not in {"", "identity"}:
                    self.problem(502, "SAP returned an unsupported response encoding.")
                    return
                if len(body) > MAX_BODY_BYTES:
                    self.problem(502, "SAP response exceeded the local proxy size limit.")
                    return
                content_type = upstream.headers.get("Content-Type", "application/json; charset=utf-8")
            self.respond(status, body.replace(key.encode("utf-8"), b"[REDACTED]"), content_type)
        except (TimeoutError, socket.timeout):
            self.problem(504, "SAP request timed out. Retry the request.")
        except (URLError, OSError, ValueError, EOFError, zlib.error):
            self.problem(502, "Could not read the SAP response. Check your connection and retry.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8786)
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error("port must be between 1 and 65535")
    try:
        server = ThreadingHTTPServer(("127.0.0.1", args.port), partial(AppHandler, directory=str(ROOT)))
    except OSError:
        parser.exit(1, f"Cannot bind port {args.port}. Stop your existing preview server or choose --port <free-port>.\n")
    print(f"Open http://127.0.0.1:{args.port}/ (same-origin SAP proxy enabled). Ctrl+C to stop.", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
