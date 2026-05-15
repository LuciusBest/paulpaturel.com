#!/usr/bin/env node
/**
 * Build the static public directory from src.
 *
 * Source assets are kept in src, but deploy-only output excludes heavyweight
 * originals when lighter production formats are already referenced by HTML.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

const EXCLUDED_PUBLIC_ASSETS = new Set([
  'images/LAMANT/lamant_cover.jpg',
  'images/CamilleLeprince_Site/CAMILLE_LEPRINCE.FR.MP4',
  'images/GRIME_INDEX/GrimeIndexScreenRecordWEB.mp4',
  'images/LOTTOFPRINTS/LOTTOFPRINT_JINGLE_WEB.MP4',
  'images/SENS_UNIK/SENS_UNIK_VIDEO.MP4',
  'images/STENCIL_POSTER/IMG_8419.MP4',
  'images/STENCIL_POSTER/IMG_8477.MP4',
  'images/STENCIL_POSTER/StencilPoster3D.MP4',
  'images/UV_OBISTRIPE/UV_OBISTRIPE_00.png',
  'images/UV_OBISTRIPE/UV_OBISTRIPE_01.png',
  'images/UV_OBISTRIPE/UV_OBISTRIPE_02.png',
  'images/UV_OBISTRIPE/UV_OBISTRIPE_03.png'
]);

function toPosix(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function shouldSkip(relativePath, entryName) {
  if (entryName === '.DS_Store') {
    return true;
  }
  return EXCLUDED_PUBLIC_ASSETS.has(toPosix(relativePath));
}

function copyEntry(sourcePath, targetPath, relativePath) {
  const entryName = path.basename(sourcePath);
  if (shouldSkip(relativePath, entryName)) {
    return 1;
  }

  const stat = fs.statSync(sourcePath);
  if (stat.isDirectory()) {
    fs.mkdirSync(targetPath, { recursive: true });
    let skipped = 0;
    for (const entry of fs.readdirSync(sourcePath)) {
      const childSource = path.join(sourcePath, entry);
      const childTarget = path.join(targetPath, entry);
      const childRelative = path.join(relativePath, entry);
      skipped += copyEntry(childSource, childTarget, childRelative);
    }
    return skipped;
  }

  if (stat.isFile()) {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);
  }
  return 0;
}

function main() {
  if (!fs.existsSync(SRC_DIR)) {
    throw new Error('src/ directory not found.');
  }

  fs.rmSync(PUBLIC_DIR, { recursive: true, force: true });
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });

  let skipped = 0;
  for (const entry of fs.readdirSync(SRC_DIR)) {
    skipped += copyEntry(path.join(SRC_DIR, entry), path.join(PUBLIC_DIR, entry), entry);
  }

  console.log(`build: copied src/ to public/ (${skipped} deploy-only file(s) skipped).`);
}

try {
  main();
} catch (error) {
  console.error(`build failed: ${error.message}`);
  process.exitCode = 1;
}
