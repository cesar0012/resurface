#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Servidor estático de Resurface Oregon Construction LLC con rutas amigables.

- Mapa de rutas limpias -> archivos HTML (sin extensiones visibles).
- Redirección 301 de /pagina.html -> /pagina y de /pagina/ -> /pagina.
- 404 controlado para rutas desconocidas; sin listado de directorios.
- Puerto por variable de entorno PORT (por defecto 8080), escucha en 0.0.0.0.
- Modo demo (env DEMO=1): Cache-Control: no-store y X-Robots-Tag: noindex.
  En producción: caché normal y el sitio es indexable.
- No bloquea curl/wget (health checks); bloquea herramientas de espejado.
"""
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get("PORT", "8080"))
DEMO = os.environ.get("DEMO", "").strip().lower() in ("1", "true", "yes")

# Mapa de rutas amigables -> archivo
ROUTES = {
    "/": "index.html",
    "/about": "about.html",
    "/services": "services.html",
    "/gallery": "gallery.html",
    "/contact": "contact.html",
}

HTML_FILES = {v: k for k, v in ROUTES.items()}

BLOCKED_UA = ("httrack", "webcopier", "webzip", "wget --mirror", "python-requests/2.0")
CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".xml": "application/xml; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".ico": "image/x-icon",
    ".woff2": "font/woff2",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.path.dirname(os.path.abspath(__file__)), **kwargs)

    # --- Utilidades -------------------------------------------------
    def _send_file(self, filename, status=200):
        path = os.path.join(os.path.dirname(os.path.abspath(__file__)), filename)
        if not os.path.isfile(path):
            self._send_file("404.html", 404)
            return
        ext = os.path.splitext(filename)[1].lower()
        ctype = CONTENT_TYPES.get(ext, "application/octet-stream")
        try:
            with open(path, "rb") as fh:
                body = fh.read()
        except OSError:
            self.send_error(500)
            return
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self._common_headers()
        if ext in (".css", ".js", ".png", ".jpg", ".jpeg", ".svg", ".webp", ".woff2", ".mp4", ".webm"):
            self.send_header("Cache-Control", "public, max-age=604800")
        elif DEMO:
            self.send_header("Cache-Control", "no-store")
        else:
            self.send_header("Cache-Control", "public, max-age=300")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _common_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("X-Frame-Options", "SAMEORIGIN")
        if DEMO:
            self.send_header("X-Robots-Tag", "noindex, nofollow")

    def _redirect(self, location):
        self.send_response(301)
        self.send_header("Location", location)
        self.send_header("Content-Length", "0")
        self._common_headers()
        self.end_headers()

    # --- Verbo principal --------------------------------------------
    def do_GET(self):
        self._handle()

    def do_HEAD(self):
        self._handle()

    def _handle(self):
        ua = (self.headers.get("User-Agent") or "").lower()
        if any(b in ua for b in BLOCKED_UA):
            self.send_error(403)
            return

        path, _, query = self.partition_path()
        raw = self.path

        # Health check para el orquestador
        if path == "/healthz":
            body = b"ok"
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self._common_headers()
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(body)
            return

        # Redirecciones 301: versiones con .html y slash final
        if path != "/" and path.endswith("/"):
            clean = path.rstrip("/")
            if clean in ROUTES:
                self._redirect(clean + ("?" + query if query else ""))
                return
        if path.endswith(".html"):
            name = path.lstrip("/")
            clean = HTML_FILES.get(name)
            if clean:
                self._redirect(clean + ("?" + query if query else ""))
                return
            # .html sin ruta limpia asociada: 404 controlado (sin exponer archivos)
            self._send_file("404.html", 404)
            return

        # Rutas limpias
        if path in ROUTES:
            self._send_file(ROUTES[path])
            return

        # Archivos estáticos (assets, robots.txt, sitemap.xml, favicon…)
        rel = path.lstrip("/")
        base = os.path.abspath(os.path.dirname(os.path.abspath(__file__)))
        full = os.path.abspath(os.path.join(base, rel))
        if rel and full.startswith(base) and os.path.isfile(full):
            # Nunca entregar los .html directamente (usan su ruta limpia)
            if rel.lower().endswith(".html"):
                self._send_file("404.html", 404)
                return
            self._send_file(rel)
            return

        # 404 controlado
        self._send_file("404.html", 404)

    def partition_path(self):
        raw = self.path
        path, _, query = raw.partition("?")
        return path, raw, query

    def log_message(self, fmt, *args):
        print("[resurface] %s - %s" % (self.address_string(), fmt % args))


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    mode = "DEMO (noindex, sin caché)" if DEMO else "PRODUCCIÓN"
    print("Resurface Oregon sirviendo en 0.0.0.0:%s — modo %s" % (PORT, mode))
    server.serve_forever()
