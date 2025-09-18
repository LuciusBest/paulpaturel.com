# Verification Checklist

## Prerequisites
- Node.js 18+
- npm dependencies installed (`npm install`)

## Build
1. `npm run build`
2. Confirm `public/` contains `.htaccess`, `index.html`, and the expected asset directories.

## Local review
1. In one terminal run `npm run serve:src` and visit http://localhost:3000
2. In another terminal run `npm run serve:public` and visit http://localhost:4000
3. For both origins:
   - Navigate the horizontal slider and ensure videos autoplay/mute as before.
   - Test the Cosma tester slide (typing, sliders, theme cycling).
   - Toggle overlay tags and language (EN/FR).
   - Hover interactive elements to confirm the custom cursor and pagination UI.
   - Check browser console for warnings or errors.

## Link checks
1. With the servers running, execute `npm run check:links:src`
2. Execute `npm run check:links:public`

## Forms & external links
- Click the Camille Leprince video → opens the external site in a new tab.
- Activate contact chips (mailto + Instagram) in the left overlay.

## Media
- Scroll through every project; confirm videos loop and pause when off-screen.
- Ensure all images load without layout shifts (width/height attributes present).

## Deployment validation (post-upload)
- Hit https://paulpaturel.com/, force refresh.
- Load a removed legacy path (e.g. `/CosmaWebTypeTester/`) and verify the 301 redirect.
