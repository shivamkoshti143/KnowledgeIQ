import http.client
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

BACKEND_HOST = "127.0.0.1"
BACKEND_PORT = 4001
STATIC_DIR = os.path.dirname(os.path.abspath(__file__))

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def proxy_api(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length) if length > 0 else None

        headers = {}
        for key, value in self.headers.items():
            if key.lower() not in ("host", "connection", "content-length"):
                headers[key] = value

        headers["Host"] = f"{BACKEND_HOST}:{BACKEND_PORT}"
        headers["Connection"] = "close"
        if body:
            headers["Content-Length"] = str(len(body))

        conn = http.client.HTTPConnection(
            BACKEND_HOST,
            BACKEND_PORT,
            timeout=30
        )

        try:
            conn.request(
                self.command,
                self.path,
                body=body,
                headers=headers
            )

            response = conn.getresponse()
            data = response.read()

            self.send_response(response.status, response.reason)

            for key, value in response.getheaders():
                if key.lower() not in (
                    "connection",
                    "transfer-encoding",
                    "content-length"
                ):
                    self.send_header(key, value)

            self.send_header("Content-Length", str(len(data)))
            self.send_header("Connection", "close")
            self.end_headers()

            if self.command != "HEAD":
                self.wfile.write(data)

        except Exception as e:
            self.send_response(502, "Bad Gateway")
            self.send_header("Content-Type", "application/json")
            self.send_header("Connection", "close")
            err_msg = f'{{"message":"Backend service unavailable: {str(e)}"}}'.encode("utf-8")
            self.send_header("Content-Length", str(len(err_msg)))
            self.end_headers()
            self.wfile.write(err_msg)
        finally:
            conn.close()

    def do_GET(self):
        if self.path.startswith("/api/") or self.path.startswith("/uploads/"):
            self.proxy_api()
        else:
            # For client-side routes (SPA), serve index.html if requested file does not exist
            path = self.translate_path(self.path)
            if not os.path.exists(path):
                self.path = "/index.html"
            super().do_GET()

    def do_POST(self):
        if self.path.startswith("/api/") or self.path.startswith("/uploads/"):
            self.proxy_api()
        else:
            self.send_error(405)

    def do_PUT(self):
        if self.path.startswith("/api/") or self.path.startswith("/uploads/"):
            self.proxy_api()
        else:
            self.send_error(405)

    def do_DELETE(self):
        if self.path.startswith("/api/") or self.path.startswith("/uploads/"):
            self.proxy_api()
        else:
            self.send_error(405)


server = ThreadingHTTPServer(("0.0.0.0", 80), Handler)

print("ABM React server running on port 80")
print("Frontend: http://192.168.100.12/")
print(f"API proxy: /api/* -> http://{BACKEND_HOST}:{BACKEND_PORT}/api/*")

server.serve_forever()
