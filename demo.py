#!/usr/bin/env python3
"""Resurface Oregon — demo launcher: local server + Cloudflare quick tunnel.

Qué hace
  1. Levanta el servidor de rutas limpias (server.py) en el puerto 8091 en
     modo DEMO (X-Robots-Tag: noindex + Cache-Control: no-store, según
     LINEAMIENTOS.md) — el enlace del cliente no se indexa en Google.
  2. Abre un Cloudflare quick tunnel hacia ese puerto (URL pública https,
     sin cuenta necesaria) usando tools/cloudflared.exe.
  3. Guarda la URL pública en demo-url.txt y la imprime en pantalla.
  4. Si el túnel se cae, lo reinicia solo y actualiza demo-url.txt
     (los quick tunnels generan una URL aleatoria nueva en cada arranque).

Puerto 8091 por defecto para no chocar con el sitio de Caizero (8080) ni con
el servidor de desarrollo de este proyecto (8090). Se puede cambiar con la
variable de entorno PORT.

Parar con Ctrl+C o cerrando la ventana. El cliente solo ve la URL
https://*.trycloudflare.com — tu equipo y tu red local quedan expuestos.
"""
import os
import re
import signal
import subprocess
import sys
import threading
import time

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(os.environ.get("PORT", "8091"))
URL_FILE = os.path.join(ROOT, "demo-url.txt")
CFA = os.path.join(ROOT, "tools", "cloudflared.exe")

proc_tunnel = None
proc_server = None
stop = threading.Event()


def log(msg):
    print(f"[demo] {msg}", flush=True)


def start_server():
    env = dict(os.environ, DEMO="1", PORT=str(PORT))
    subprocess.run([sys.executable, os.path.join(ROOT, "server.py")],
                   env=env, check=False)


def tail_url():
    """Lee el stderr de cloudflared hasta que aparezca la URL pública."""
    regex = re.compile(rb"https://[a-z0-9-]+\.trycloudflare\.com")
    buf = b""
    while not stop.is_set():
        byte = proc_tunnel.stderr.read(1)
        if not byte:
            return None
        buf = (buf + byte)[-4096:]
        m = regex.search(buf)
        if m:
            return m.group(0).decode()


def tunnel_loop():
    global proc_tunnel
    attempt = 0
    while not stop.is_set():
        attempt += 1
        log(f"iniciando cloudflared (intento {attempt})...")
        proc_tunnel = subprocess.Popen(
            [CFA, "tunnel", "--url", f"http://localhost:{PORT}",
             "--no-autoupdate", "--protocol", "http2"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
        )
        url = tail_url()
        if url and not stop.is_set():
            with open(URL_FILE, "w") as fh:
                fh.write(url + "\n")
            print("\n" + "=" * 62, flush=True)
            print("  ENLACE DEMO (envía este a tu cliente):", flush=True)
            print(f"  {url}", flush=True)
            print("=" * 62 + "\n", flush=True)
            rc = proc_tunnel.wait()  # bloquea hasta que el túnel muera
            if not stop.is_set():
                log(f"túnel caído (exit {rc}) — reiniciando en 5s...")
                time.sleep(5)
        elif not stop.is_set():
            log("no se pudo leer la URL del túnel — reintentando en 10s...")
            proc_tunnel.kill()
            time.sleep(10)


def main():
    global proc_server
    if not os.path.exists(CFA):
        log(f"ERROR: {CFA} no existe — coloca cloudflared.exe en tools/.")
        sys.exit(1)

    signal.signal(signal.SIGINT, lambda *a: None)  # Ctrl+C se maneja abajo

    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()
    time.sleep(1)

    t = threading.Thread(target=tunnel_loop, daemon=True)
    t.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        log("cerrando...")
        stop.set()
        for p in (proc_tunnel, proc_server):
            if p and p.poll() is None:
                p.terminate()
        log("listo")


if __name__ == "__main__":
    main()
