"""Credential-free local server/proxy regressions; never contact SAP."""

from functools import partial
import gzip
from http.client import HTTPConnection
from http.server import ThreadingHTTPServer
import importlib.util
from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Thread
import unittest
from unittest.mock import patch
from urllib.error import HTTPError, URLError
import zlib


spec = importlib.util.spec_from_file_location("serve", Path(__file__).resolve().parents[1] / "scripts/serve.py")
serve = importlib.util.module_from_spec(spec)
spec.loader.exec_module(serve)


class ProxyTests(unittest.TestCase):
    def setUp(self):
        self.directory = TemporaryDirectory()
        root = Path(self.directory.name)
        (root / "index.html").write_text('<script src="config.local.js" defer></script><script src="js/services/sap-http.js" defer></script><h1>Local preview</h1>', encoding="utf-8")
        (root / "config.local.js").write_text('window.APP_CONFIG = { SAP_API_KEY: "unit-test-key" };', encoding="utf-8")
        (root / ".git").mkdir()
        (root / ".git/config").write_text("private", encoding="utf-8")
        self.log_patch = patch.object(serve.AppHandler, "log_message")
        self.log_patch.start()
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), partial(serve.AppHandler, directory=str(root)))
        self.thread = Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.opener_patch = patch.object(serve, "OPENER")
        self.opener = self.opener_patch.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.opener_patch.stop()
        self.log_patch.stop()
        self.directory.cleanup()

    def request(self, path, method="GET", headers=None):
        connection = HTTPConnection("127.0.0.1", self.server.server_port, timeout=5)
        try:
            connection.request(method, path, headers=headers or {})
            response = connection.getresponse()
            return response.status, dict(response.getheaders()), response.read()
        finally:
            connection.close()

    def upstream(self, body=b'{"d":{"results":[]}}', status=200, headers=None):
        response = BytesIO(body)
        response.code = status
        response.headers = headers or {"Content-Type": "application/json"}
        self.opener.open.return_value = response

    def test_preview_enables_proxy_without_modifying_local_configuration(self):
        path = Path(self.directory.name) / "config.local.js"
        before = path.read_bytes()
        status, headers, body = self.request("/config.local.js")
        self.assertEqual(status, 200)
        self.assertIn(b'SAP_PROXY_BASE_URL = "/sap-proxy"', body)
        self.assertIn(before, body)
        self.assertEqual(path.read_bytes(), before)
        self.assertEqual(headers["Cache-Control"], "no-store")
        self.assertEqual(self.request("/")[0], 200)
        self.assertEqual(self.request("/", method="HEAD")[2], b"")
        self.opener.open.assert_not_called()

    def test_only_application_routes_are_forwarded_with_query_and_safe_headers(self):
        for path in [serve.PROJECT_PATH, serve.GL_PATH, serve.PO_PATH,
                     serve.PROJECT_PATH + "(guid'12345678-1234-1234-1234-123456789abc')/to_EnterpriseProjectElement"]:
            with self.subTest(path=path):
                self.upstream()
                status, headers, body = self.request(serve.PROXY_PREFIX + path + "?%24top=5&%24select=ProjectUUID%2CProject", headers={
                    "APIKey": "unit-test-key", "Cookie": "private=never-forward", "Authorization": "never-forward",
                    "Origin": f"http://127.0.0.1:{self.server.server_port}", "Sec-Fetch-Site": "same-origin"})
                self.assertEqual(status, 200)
                self.assertIn(b'"results":[]', body)
                self.assertNotIn("Access-Control-Allow-Origin", headers)
                request = self.opener.open.call_args.args[0]
                self.assertEqual(request.full_url, serve.SAP_ORIGIN + path + "?%24top=5&%24select=ProjectUUID%2CProject")
                self.assertEqual(request.get_method(), "GET")
                self.assertEqual(request.get_header("Apikey"), "unit-test-key")
                self.assertEqual(request.get_header("Accept"), "application/json")
                self.assertFalse(request.has_header("Cookie"))
                self.assertFalse(request.has_header("Authorization"))
                self.assertEqual(self.opener.open.call_args.kwargs["timeout"], 25)

    def test_preview_bypasses_cached_placeholder_configuration_and_old_scripts(self):
        source = (Path(self.directory.name) / "index.html").read_bytes()
        with patch.object(serve.time, "time_ns", side_effect=[123, 456]):
            status, headers, first = self.request("/")
            _, _, second = self.request("/index.html")
        self.assertEqual(status, 200)
        self.assertEqual(headers["Cache-Control"], "no-store")
        self.assertIn(b'src="config.local.js?preview=123" defer', first)
        self.assertIn(b'src="js/services/sap-http.js?preview=123" defer', first)
        self.assertIn(b'src="config.local.js?preview=456" defer', second)
        self.assertEqual((Path(self.directory.name) / "index.html").read_bytes(), source)
        status, _, config = self.request("/config.local.js?preview=123")
        self.assertEqual(status, 200)
        self.assertIn(b'SAP_PROXY_BASE_URL = "/sap-proxy"', config)
        self.opener.open.assert_not_called()

    def test_unsupported_targets_and_methods_never_reach_sap(self):
        for path in ["/sap-proxy/https://example.com", "/sap-proxy//example.com", "/sap-proxy" + serve.PROJECT_PATH + "/../$metadata", "/sap-proxy" + serve.PROJECT_PATH + "/$value"]:
            self.assertEqual(self.request(path, headers={"APIKey": "unit-test-key"})[0], 404)
        self.assertEqual(self.request(serve.PROXY_PREFIX + serve.PROJECT_PATH, method="HEAD")[0], 405)
        self.assertEqual(self.request(serve.PROXY_PREFIX + serve.PROJECT_PATH, method="POST")[0], 501)
        self.opener.open.assert_not_called()

    def test_missing_key_and_cross_origin_requests_are_rejected(self):
        path = serve.PROXY_PREFIX + serve.PROJECT_PATH
        self.assertEqual(self.request(path)[0], 401)
        for headers in [{"Host": "attacker.example"}, {"Origin": "https://attacker.example"}, {"Sec-Fetch-Site": "cross-site"}, {"Sec-Fetch-Site": "same-site"}]:
            self.assertEqual(self.request(path, headers={"APIKey": "unit-test-key", **headers})[0], 403)
        self.opener.open.assert_not_called()

    def test_redirects_are_not_forwarded_to_the_browser(self):
        self.opener.open.side_effect = HTTPError(serve.SAP_ORIGIN, 302, "Found", {"Location": "https://example.com"}, BytesIO(b"redirect"))
        status, headers, body = self.request(serve.PROXY_PREFIX + serve.PROJECT_PATH, headers={"APIKey": "unit-test-key"})
        self.assertEqual(status, 502)
        self.assertNotIn("Location", headers)
        self.assertIn(b"did not follow", body)
        self.assertIsNone(serve.NoRedirects().redirect_request(None, None, 302, "Found", {}, "https://example.com"))

    def test_sap_http_errors_are_preserved_and_key_is_redacted(self):
        self.opener.open.side_effect = HTTPError(serve.SAP_ORIGIN, 403, "Forbidden", {"Content-Type": "application/json"}, BytesIO(b'{"error":"unit-test-key"}'))
        status, headers, body = self.request(serve.PROXY_PREFIX + serve.PROJECT_PATH, headers={"APIKey": "unit-test-key"})
        self.assertEqual(status, 403)
        self.assertEqual(headers["Content-Type"], "application/json")
        self.assertIn(b"[REDACTED]", body)
        self.assertNotIn(b"unit-test-key", body)

    def test_compressed_and_invalid_response_bodies(self):
        path = serve.PROXY_PREFIX + serve.PROJECT_PATH
        self.upstream(gzip.compress(b'{"d":{"results":[]}}'), headers={"Content-Encoding": "gzip"})
        status, headers, body = self.request(path, headers={"APIKey": "unit-test-key"})
        self.assertEqual(status, 200)
        self.assertEqual(body, b'{"d":{"results":[]}}')
        self.assertNotIn("Content-Encoding", headers)
        self.upstream(zlib.compress(b'{"value":[]}'), headers={"Content-Encoding": "deflate"})
        self.assertEqual(self.request(path, headers={"APIKey": "unit-test-key"})[2], b'{"value":[]}')
        self.upstream(b"invalid gzip", headers={"Content-Encoding": "gzip"})
        self.assertEqual(self.request(path, headers={"APIKey": "unit-test-key"})[0], 502)
        self.upstream(b"unknown", headers={"Content-Encoding": "unknown"})
        self.assertEqual(self.request(path, headers={"APIKey": "unit-test-key"})[0], 502)
        with patch.object(serve, "MAX_BODY_BYTES", 8):
            self.upstream(b"response too long")
            self.assertEqual(self.request(path, headers={"APIKey": "unit-test-key"})[0], 502)
        # Exercise the decompressed-size guard with an input that fits.
        with patch.object(serve, "MAX_BODY_BYTES", 100):
            self.upstream(gzip.compress(b"x" * 101), headers={"Content-Encoding": "gzip"})
            self.assertEqual(self.request(path, headers={"APIKey": "unit-test-key"})[0], 502)

    def test_timeouts_and_network_errors_have_safe_diagnostics(self):
        for error, expected in [(TimeoutError("private"), 504), (URLError("private"), 502)]:
            self.opener.open.side_effect = error
            status, _, body = self.request(serve.PROXY_PREFIX + serve.PROJECT_PATH, headers={"APIKey": "unit-test-key"})
            self.assertEqual(status, expected)
            self.assertNotIn(b"private", body)

    def test_hidden_paths_and_directory_listings_are_not_served(self):
        self.assertEqual(self.request("/.git/config")[0], 403)
        self.assertEqual(self.request("/%2egit/config")[0], 403)
        (Path(self.directory.name) / "empty").mkdir()
        self.assertEqual(self.request("/empty/")[0], 403)
        self.opener.open.assert_not_called()


if __name__ == "__main__":
    unittest.main()
