# Bejustt

A legal community founded by law students, for law students.
Static site on GitHub Pages: https://theworldmind.github.io/BEJUSTT/

## How it is built
- Page content lives in `src/` (only the `<main>` part of each page).
- `python3 tools/build.py` wraps each page with the shared head, menu, footer and language sheet, and writes the final HTML files. It also writes `sitemap.xml` and `robots.txt`.
- Translations (8 languages) live in `assets/i18n.js`. Any element with `data-i18n="key"` gets its text from there.

## Common tasks
- **Own domain:** change `SITE` in `tools/build.py`, run the build, then set the domain in GitHub → Settings → Pages.
- **New article:** copy `src/article-template.html`, add it to `PAGES` in `tools/build.py`, run the build, link it from `src/magazine.html`.
- **New language:** add it to `BJ_LANGS` and `BJ_I18N` in `assets/i18n.js` and to `LANGS` in `tools/build.py`.
