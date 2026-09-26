#!/usr/bin/env python3
"""Local development server for the `public/` site.

The stock `python3 -m http.server --directory public` sends no Cache-Control
header, so browsers fall back to heuristic caching and keep showing stale
JavaScript after files change. This variant sends `Cache-Control: no-cache`,
which forces the browser to revalidate every file on each load (cheap 304
responses when nothing changed).

Usage: python3 serve.py [port]   (default: 8000)
"""

import functools
import http.server
import sys
from pathlib import Path


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, must-revalidate")
        super().end_headers()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    root = str(Path(__file__).resolve().parent / "public")
    handler = functools.partial(NoCacheHandler, directory=root)
    server = http.server.ThreadingHTTPServer(("", port), handler)
    print(f"Serving {root} at http://localhost:{port} (browser caching disabled)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
