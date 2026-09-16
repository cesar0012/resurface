# Resurface Oregon Construction LLC — Sitio Web

Sitio estático de producción para **Resurface Oregon Construction LLC**
(resuperficie de tinas de porcelana, reparación y resuperficie de duchas de
fibra de vidrio, y resuperficie de cubiertas de cocina/baño), sirviendo todo
Oregon. CCB #248010.

## Estructura

```
├── index.html          Home
├── about.html          About Us          → ruta limpia /about
├── services.html       Services          → /services
├── gallery.html        Gallery           → /gallery
├── contact.html        Request a Quote   → /contact
├── 404.html            Página 404 controlada
├── css/styles.css      Estilos únicos del sitio (?v=1 para cache-busting)
├── js/main.js          Nav móvil, comparador antes/después, lightbox,
│                       filtros de galería, FAQ y formulario (defer)
├── img/                Logo (extraído de la tarjeta), favicons, og-image
│                       y fotos de galería/servicios
├── server.py           Servidor estático con rutas amigables (ver abajo)
├── sitemap.xml / robots.txt
├── Dockerfile / .dockerignore   Imagen de producción para Coolify
└── tools/              Scripts de generación de assets (excluidos del build)
    ├── extract_logo.py   Extrae el logo desde la foto de la tarjeta
    ├── make_assets.py    Genera imágenes finales (hero, servicios, galería)
    ├── make_icons.py     Favicons + og-image
    ├── stitch.py         Une tiles de captura para QA visual
    └── shots/            Capturas de página completa (QA)
```

## SEO implementado

- `<title>` y `meta description` únicos por página; canonical absoluto con
  dominio de producción (`https://resurfaceoregon.com`) — **si el dominio real
  es otro, reemplazarlo en TODAS las páginas** (canonical, `og:url`, `og:image`
  y bloques JSON-LD), además de `sitemap.xml` y `robots.txt`.
- Open Graph + Twitter Cards completos, `geo.region`/`geo.placename` (US-OR).
- JSON-LD `@graph` con `HomeAndConstructionBusiness` (teléfono internacional,
  email, `areaServed` = Oregon, licencia CCB como `identifier`), `WebSite`,
  `WebPage` por página, `BreadcrumbList`, `OfferCatalog` con los 3 servicios,
  `Service` por servicio y `FAQPage` en /services.
  Validar en https://search.google.com/test/rich-results tras publicar.
- Un solo `<h1>` por página, breadcrumb visible, jerarquía h2/h3 sin saltos.
- Imágenes con `width`/`height`, `loading="lazy"` bajo el pliegue, alt
  descriptivos; fuentes con `preconnect` + `display=swap`; JS con `defer`.
- `sitemap.xml` con rutas canónicas y `robots.txt` apuntando al sitemap.

## Rutas amigables (server.py)

- `/`, `/about`, `/services`, `/gallery`, `/contact` sirven los HTML.
- Redirección **301** de `/*.html` y de `/ruta/` hacia la ruta limpia.
- 404 controlado; sin listado de directorios; nunca expone los `.html`.
- Cabeceras de seguridad (`nosniff`, `Referrer-Policy`, `X-Frame-Options`).
- Variable `PORT` (por defecto 8080), escucha en `0.0.0.0` (listo para Coolify).
- Modo demo: `DEMO=1` activa `Cache-Control: no-store` y `X-Robots-Tag:
  noindex` (para previews). En producción NO definir `DEMO`.

### Prueba local

```bash
python server.py            # http://localhost:8080
DEMO=1 python server.py     # modo demo/noindex
```

## Formulario de cotización (Web3Forms)

- `contact.html` envía por AJAX a **Web3Forms** (`https://api.web3forms.com/submit`),
  un servicio gratuito sin backend que entrega cada solicitud al correo
  registrado en la access key.
- **Activación (1 minuto, una sola vez):**
  1. Entrar a https://web3forms.com y escribir `resurfaceoregon@gmail.com`.
  2. Llega la **access key** por correo.
  3. Pegarla en `contact.html` donde dice `PON_AQUI_TU_ACCESS_KEY_DE_WEB3FORMS`
     (input oculto `access_key`, único punto a mantener).
- Los envíos llegan automáticamente a `resurfaceoregon@gmail.com`.
- Mientras la llave no esté configurada, el formulario ofrece de inmediato
  el envío por `mailto:` pre-llenado al mismo correo (no se pierde ningún lead).
- Anti-spam: honeypot nativo `botcheck` + validación en cliente con errores
  accesibles; botón deshabilitado durante el envío.

## Logo, QR y marca

- El logo oficial del cliente vive en `img/resurface-logo.png` (original
  4302×2466); `img/logo.png` es la versión optimizada (1200px) usada en
  header, footer y JSON-LD. El logo incluye el wordmark, por eso el header
  ya no duplica el texto.
- Favicons, apple-touch-icon y `img/og-image.jpg` se generan desde el logo
  nuevo (`tools/make_icons.py` con `tools/extract_logo.py` ya no es
  necesario; usar `tools/regenerate_brand.py`).
- El footer incluye el **QR del Linktree** (`img/qr-link-tree.png`,
  enlaza a `https://linktr.ee/qr/4d7686ff-0e8a-4ca8-a8be-8b74b6b70e3d`).

## Despliegue en Coolify (desde GitHub)

1. Crear repositorio en GitHub y subir el proyecto completo (las imágenes de
   `img/` viven en el repo; `.dockerignore` excluye `tools/` y `.git`).
2. Coolify → nuevo recurso → vincular el repo → detecta el `Dockerfile`
   (python:3.12-alpine) → build y deploy. Coolify inyecta `PORT`.
3. Asignar el dominio de producción al recurso (HTTPS con el reverse proxy).
4. Verificar en producción: rutas limpias, redirecciones 301 de `.html`,
   formulario (confirmar FormSubmit la primera vez), `/sitemap.xml` y
   `/robots.txt` accesibles, y validación del JSON-LD.

## Reemplazo de fotos

El sitio ahora usa **fotos y videos reales del cliente** (carpeta `assets/`,
procesados a `img/` por `tools/make_client_assets.py`): 11 fotos optimizadas
(EXIF corregido, máx. 1600px, ~1.3MB en total) y 11 videos verticales
comprimidos a H.264 720p sin audio (~42MB en total, con póster JPG cada uno).

- La galería (`/gallery`) se compone solo de material real, con filtros por
  tipo (tinas, cocinas, lavabos) y filtro de videos; el lightbox reproduce
  videos con controles y los items muestran una previsualización en silencio
  al pasar el cursor.
- El Home usa el video vertical del cliente como fondo del hero en móvil y
  en la sección "Real Results" (comparador antes/después del fregadero +
  video del proyecto).
- Las secciones de fotos de stock que quedan (`hero-home.jpg`,
  `cta-bathroom.jpg`, `gal-process-spray.jpg`, fondo de héroes de páginas
  interiores) son tomas amplias de ambiente que el cliente aún no tiene;
  se sustituyen dejando los mismos nombres de archivo.
- Los testimonios de `/services` son textos representativos de ejemplo:
  sustituirlos por reseñas reales del cliente cuando estén disponibles.

## Videos

- Convertidos con `imageio-ffmpeg` (H.264, CRF 27, 720p, `-an`,
  `+faststart`); el servidor entrega `.mp4` con `Content-Type: video/mp4`.
- Para agregar videos nuevos: colocar el original en `assets/`, añadirlo al
  diccionario `VIDEOS` de `tools/make_client_assets.py` y reejecutarlo.

