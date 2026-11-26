#!/usr/bin/env python3
"""Bejustt site builder.

Pages are written once in /src (only the <main> part). This script wraps each
one with the shared head, navigation, footer and language sheet, and writes
the final HTML files. Run from the repo root:  python3 tools/build.py

{R} inside a page means "path back to the site root" (e.g. "" or "../").
To move to your own domain later, change SITE below and run the script again.
"""
from pathlib import Path
from urllib.parse import urlparse

SITE = "https://bejustt.org/"
SW = r"""/* Bejustt service worker — v__V__ */
const C = "bejustt-__V__";
const CORE = ["./", "magazine/", "join/", "app/", "assets/style.css?v=__V__", "assets/site.js?v=__V__", "assets/i18n.js?v=__V__", "assets/depth.js?v=__V__", "assets/logo.png", "assets/icon-192.png", "manifest.webmanifest"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(C).then((c) => c.addAll(CORE).catch(() => {})).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== C).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const r = e.request; if (r.method !== "GET" || new URL(r.url).origin !== location.origin) return;
  if (r.mode === "navigate") {
    e.respondWith(fetch(r).then((res) => { const cp = res.clone(); caches.open(C).then((c) => c.put(r, cp)); return res; })
      .catch(() => caches.match(r).then((m) => m || caches.match("./"))));
    return;
  }
  e.respondWith(caches.match(r).then((m) => m || fetch(r).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(C).then((c) => c.put(r, cp)); } return res; })));
});
"""
V = "23"  # bump to refresh browser caches after a change
ROOT = Path(__file__).resolve().parent.parent
LANGS = ["en", "tr", "fr", "it", "es", "de", "uk", "ro"]

PAGES = [
    # src file, output, root prefix, title key, default title, description, nav key
    ("home.html", "index.html", "", "title.home", "Bejustt — By law students, for law students",
     "Bejustt is a legal community founded by law students, for law students. A voice for those at the beginning of their journey in law.", "home"),
    ("magazine.html", "magazine/index.html", "../", "title.mag", "Magazine — Bejustt",
     "The Bejustt Magazine: writing by law students from different countries. Issue 01 is in preparation.", "mag"),
    ("join.html", "join/index.html", "../", "title.join", "Join — Bejustt",
     "Join the Bejustt team: country representatives, student writers, interviewers and academic team.", "join"),
    ("app.html", "app/index.html", "../", "title.app", "App — Bejustt",
     "Install the Bejustt app on iPhone, Android, Mac and PC.", "app"),
    ("privacy.html", "privacy/index.html", "../", "title.privacy", "Privacy — Bejustt",
     "How the Bejustt website handles your privacy. No cookies, no trackers.", "privacy"),
    ("article-template.html", "magazine/_template.html", "../", "title.mag", "Article — Bejustt Magazine",
     "Bejustt Magazine article.", "mag"),
]

GLOBE = ('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
         'stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5c2.8 2.6 '
         '4.2 5.8 4.2 9.5s-1.4 6.9-4.2 9.5c-2.8-2.6-4.2-5.8-4.2-9.5S9.2 5.1 12 2.5z"/></svg>')


def head(R, tkey, title, desc, path, noindex=False):
    url = SITE + path.replace("index.html", "")
    alts = "\n".join(f'  <link rel="alternate" hreflang="{l}" href="{url}?lang={l}">' for l in LANGS)
    return f"""<!doctype html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>{title}</title>
  <meta name="description" content="{desc}">
  {'<meta name="robots" content="noindex">' if noindex else f'<link rel="canonical" href="{url}">'}
{'' if noindex else alts + chr(10) + f'  <link rel="alternate" hreflang="x-default" href="{url}">'}
  <meta name="theme-color" content="#050a16">
  <meta name="color-scheme" content="dark light">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Bejustt">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{desc}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="{SITE}assets/og.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="{SITE}assets/og.png">
  <link rel="icon" type="image/png" href="{R}assets/favicon.png">
  <link rel="apple-touch-icon" href="{R}assets/apple-touch-icon.png">
  <link rel="manifest" href="{R}manifest.webmanifest">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="Bejustt">
  <link rel="preload" href="{R}assets/fonts/InterDisplay-ExtraBold.woff" as="font" type="font/woff" crossorigin>
  <link rel="preload" href="{R}assets/fonts/Inter-Medium.woff" as="font" type="font/woff" crossorigin>
  <script>try{{var t=localStorage.getItem("bj-theme")||"dark";if(t==="auto")t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.documentElement.dataset.theme=t;}}catch(e){{}}</script>
  <link rel="stylesheet" href="{R}assets/style.css?v={V}">
</head>"""


def nav(R, key):
    cur = lambda k: ' aria-current="page"' if k == key else ""
    cta = '<a class="nav-cta" href="https://ig.me/m/bejustt.law" target="_blank" rel="noopener" data-i18n="nav.join">Join us</a>'
    return f"""
<a class="skip" href="#main" data-i18n="a11y.skip">Skip to content</a>
<header class="nav">
  <a class="nav-logo" href="{R or './'}" aria-label="Bejustt home"><img src="{R}assets/logo-sm.png" alt="Bejustt" width="113" height="27"></a>
  <ul class="nav-links">
    <li><a href="{R}#about" data-i18n="nav.about">About</a></li>
    <li><a href="{R}magazine/" data-i18n="nav.mag"{cur('mag')}>Magazine</a></li>
    <li><a href="{R}join/" data-i18n="nav.team"{cur('join')}>Team</a></li>
    <li><a href="{R}app/" data-i18n="nav.app"{cur('app')}>App</a></li>
    <li>{cta}</li>
  </ul>
  <button class="lang-btn"  aria-expanded="false" aria-label="Language">{GLOBE}<span class="lang-code">EN</span></button>
  <button class="nav-toggle" aria-label="Menu" aria-expanded="false"><span></span></button>
</header>
"""


def footer(R):
    return f"""
<footer class="footer">
  <div class="wrap">
    <div class="f-brand">
      <img src="{R}assets/logo-sm.png" alt="Bejustt" width="113" height="27">
      <div data-i18n="foot.tag">A legal community founded by law students, for law students.</div>
      <div>© <span data-year></span> Bejustt</div>
      <div class="by-oneside"><span data-i18n="foot.by">by</span> <img class="os-word" src="{R}assets/os-word.png" alt="oneside" width="191" height="80"></div>
    </div>
    <div class="f-side">
      <nav aria-label="Footer">
        <a href="{R}magazine/" data-i18n="foot.mag">Magazine</a>
        <a href="{R}join/" data-i18n="foot.join">Join</a>
        <a href="{R}privacy/" data-i18n="foot.privacy">Privacy</a>
        <a href="https://instagram.com/bejustt.law" target="_blank" rel="noopener">Instagram</a>
      </nav>
      <div class="f-controls">
        <div class="seg" role="radiogroup" aria-label="Appearance">
          <span class="seg-thumb" aria-hidden="true"></span>
          <button role="radio" data-theme-set="dark" data-i18n="th.dark">Dark</button>
          <button role="radio" data-theme-set="light" data-i18n="th.light">Light</button>
          <button role="radio" data-theme-set="auto" data-i18n="th.auto">Auto</button>
        </div>
        <button class="switch" role="switch" aria-checked="true"><span class="tr"></span><span data-i18n="foot.sounds">Sounds</span></button>
      </div>
    </div>
  </div>
</footer>

<div class="join-dock" role="complementary" aria-label="Join our team">
  <a href="https://ig.me/m/bejustt.law" target="_blank" rel="noopener">
    <span class="jd-ig" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5.2"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none"/></svg></span>
    <span class="jd-t"><b data-i18n="dock.t">Want to join our team?</b><small data-i18n="dock.s">Message us on Instagram</small></span>
    <span class="jd-go" aria-hidden="true">›</span>
  </a>
  <button class="jd-x" type="button" aria-label="Close">×</button>
</div>

<div class="lang-scrim" aria-hidden="true"></div>
<div class="lang-sheet" role="dialog" aria-modal="true" aria-labelledby="lang-title">
  <div class="grabber" aria-hidden="true"></div>
  <div class="lang-head">
    <p class="lang-title" id="lang-title" data-i18n="lang.title">Language</p>
    <button class="lang-done" data-i18n="lang.done">Done</button>
  </div>
  <div class="lwheel-wrap">
    <div class="wheel-lens" aria-hidden="true"></div>
    <div class="wheel lwheel" tabindex="0" role="listbox" aria-labelledby="lang-title"><ul></ul></div>
  </div>
</div>

<script src="{R}assets/depth.js?v={V}"></script>
<script src="{R}assets/i18n.js?v={V}"></script>
<script src="{R}assets/site.js?v={V}"></script>
{{GLOBE}}</body>
</html>
"""


JSONLD = """<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Bejustt",
"url":"%s","logo":"%sassets/icon-512.png","description":"A legal community founded by law students, for law students.",
"sameAs":["https://instagram.com/bejustt.law"]}</script>""" % (SITE, SITE)

INTRO = """<div class="intro" aria-hidden="true"><img src="assets/logo.png" alt=""><i></i></div>"""


def build():
    for src, out, R, tkey, title, desc, key in PAGES:
        body = (ROOT / "src" / src).read_text().replace("{R}", R)
        noindex = out.endswith("_template.html")
        html = head(R, tkey, title, desc, out, noindex)
        if key == "home":
            html = html.replace("</head>", JSONLD + "\n</head>")
        html += f'\n<body data-title="{tkey}" data-page="{key}">\n'
        g = (f'<script src="{R}assets/map-data.js?v={V}"></script>\n<script src="{R}assets/europe-map.js?v={V}"></script>\n'
             if "map-stage" in body else "")
        if "poster" in body: g += f'<script src="{R}assets/frost.js?v={V}"></script>\n'
        html += nav(R, key) + "\n" + body + footer(R).replace("{GLOBE}", g)
        p = ROOT / out
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(html)
        print("built", out)

    # 404: GitHub Pages serves it at any depth, so it uses absolute paths from the site root
    A = urlparse(SITE).path  # e.g. "/BEJUSTT/" now, "/" on your own domain
    body = (ROOT / "src" / "404.html").read_text().replace("{R}", A).replace('href="./"', f'href="{A}"')
    html = head(A, "title.404", "Not found — Bejustt", "This page does not exist.", "404.html", True)
    html += '\n<body data-title="title.404" data-page="404">\n' + nav(A, "404") + "\n" + body + footer(A).replace("{GLOBE}", "")
    (ROOT / "404.html").write_text(html)
    print("built 404.html")

    urls = "".join(f"  <url><loc>{SITE}{p}</loc></url>\n" for p in ["", "magazine/", "join/", "app/", "privacy/"])
    (ROOT / "sitemap.xml").write_text(
        f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}</urlset>\n')
    # service worker: makes Bejustt installable in one tap and keeps it fast offline
    (ROOT / "sw.js").write_text(SW.replace("__V__", V))
    (ROOT / "robots.txt").write_text(f"User-agent: *\nDisallow: /magazine/_template.html\nSitemap: {SITE}sitemap.xml\n")


if __name__ == "__main__":
    build()
