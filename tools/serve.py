#!/usr/bin/env python3
"""Local HTTP server for the pure-code B-29 Hiroshima 1945 WebGL2 simulation."""
import argparse
import functools
import http.server
import os
import socketserver
import webbrowser


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "application/javascript; charset=utf-8",
        ".mjs": "application/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".html": "text/html; charset=utf-8",
        ".json": "application/json; charset=utf-8",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="0.0.0.0", help="Bind host (0.0.0.0 for LAN + localhost)")
    parser.add_argument("--port", type=int, default=8788)
    parser.add_argument("--open", action="store_true", help="Open default browser")
    args = parser.parse_args()

    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    handler = functools.partial(QuietHandler, directory=root)
    socketserver.ThreadingTCPServer.allow_reuse_address = True

    port = args.port
    while port < args.port + 20:
        try:
            httpd = socketserver.ThreadingTCPServer((args.host, port), handler)
            break
        except OSError:
            port += 1
    else:
        raise RuntimeError("No available port in range")

    url = f"http://127.0.0.1:{port}/index.html"
    print(f"B-29 Hiroshima 1945 WebGL2 server listening on {args.host}:{port} -> {url}", flush=True)
    if args.open:
        webbrowser.open(url)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
