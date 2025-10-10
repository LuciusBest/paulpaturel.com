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
| Bump site version before release | `npm run version:update` |
| Check links (source / public) | `npm run check:links:src` / `npm run check:links:public` |

Changes are authored in `src/`. Run `npm run build` before deploying or validating to ensure `public/` stays in sync.

## Deploy (GitHub Actions → o2switch)

Automated deployment runs through the workflow in `.github/workflows/deploy.yml`. Each push to `main` (or a manual trigger) builds the site and publishes `public/` via FTPS.

1. Add the following repository secrets on GitHub (`Settings → Secrets and variables → Actions → New repository secret`):
   - `FTP_HOST` — o2switch FTP hostname (ex: `ftp.paulpaturel.com` or server hostname).
   - `FTP_USERNAME` — the FTP user with access to your hosting root.
   - `FTP_PASSWORD` — password for that FTP user.
   - `FTP_PORT` — usually `21` (or `990` for implicit FTPS).
   - `FTP_REMOTE_DIR` — remote path to publish to (ex: `/public_html/`).
2. Push to `main` or trigger the workflow manually (`Actions → Deploy site via FTP → Run workflow`).
3. The workflow runs `npm run build`, then uploads only the contents of `public/`. Changes are incremental thanks to `SamKirkland/FTP-Deploy-Action`.
4. Verify the run on the Actions tab, then spot-check [paulpaturel.com](https://paulpaturel.com). Purge CDN caches if necessary.

Fallback manual deploy: run `npm run build`, then sync `public/` to the hosting root with your preferred FTP client.

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
