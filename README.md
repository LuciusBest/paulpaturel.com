# Paul Paturel — Portfolio

This repository contains the source for [paulpaturel.com](https://paulpaturel.com), a static portfolio served from the `public/` directory. Source assets live under `src/` and are copied verbatim to `public/` via the build script so production URLs remain stable.

## Project layout

```
src/
  index.html            # main portfolio entry point
  css/                  # readable CSS bundles (fonts, layout, UI)
  js/                   # vanilla JS modules grouped by domain
  images/, data/, font/ # media, copy and font assets
public/                 # build output (copied from src/)
tests/                  # QA harnesses and manual/automated test scripts
redirects.csv           # permanent redirect rules mirrored in .htaccess
REPORT-*.md             # maintenance notes (large assets, unused css)
```

Test harnesses and exploratory scripts live in `tests/`; they are excluded from the `npm run build` output so nothing under `tests/` ships to production.

## Development

| Task | Command |
| --- | --- |
| Install tools | `npm install` (installs `http-server` + `linkinator` for local workflows) |
| Start dev server from source | `npm run serve:src` (http://localhost:3000) |
| Build + serve production snapshot | `npm run build` then `npm run serve:public` (http://localhost:4000) |
| Check links (source / public) | `npm run check:links:src` / `npm run check:links:public` |

Changes are authored in `src/`. Run `npm run build` before deploying or validating to ensure `public/` stays in sync.

## Deploy (o2switch)

1. Run `npm run build`.
2. Upload the contents of `public/` (including `.htaccess`) to the hosting root.
3. Upload `redirects.csv` if your tooling expects the manifest; otherwise ensure `.htaccess` ships with the 301 rules.
4. Purge CDN caches if fronted by Cloudflare/other.

## Performance checklist

- `src/js/data/projectTexts.js` caches overlay copy so `dynamicTextOverlay` and `tags_filter` share the same fetch.
- All blocking scripts are `defer`ed and execute in DOM order.
- `css/navigation.css` merged into `css/ui.css` to cut a request while keeping styles readable.
- `<img>` elements in `index.html` now include explicit `width`/`height` attributes to reduce CLS.
- Static assets receive conservative cache hints in `.htaccess` (30 days for images/fonts/CSS/JS, 7 days for MP4).
- Heavy videos are catalogued in `REPORT-large-assets.md` with re-encode guidance; no lossy edits applied automatically.

## Redirects policy

Permanent redirects are defined in both `redirects.csv` and `src/.htaccess`:

- `/CosmaWebTypeTester/*` → canonical portfolio routes (Cosma embed now lives on the home page).
- `/css/navigation.css` → `/css/ui.css`
- `/css/toper.css` → `/css/style.css`
- `/js/media/diaporama.js` → `/js/media/diaporama_mouse.js`

Update both files together if new public paths change.

## Verification

Documented in `VERIFY.md`; run through the checklist before pushing to production.
