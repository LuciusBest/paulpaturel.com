#!/usr/bin/env node
/**
 * Inject the current cache/version token into built HTML assets.
 *
 * The script replaces the placeholder "__ASSET_VERSION__" with the token derived
 * from src/data/siteVersion.json (cacheToken → updatedAt → timestamp → semantic).
 *
 * Usage: node scripts/injectAssetVersion.js
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const VERSION_FILE = path.join(ROOT_DIR, 'src', 'data', 'siteVersion.json');
const PLACEHOLDER = '__ASSET_VERSION__';

function ensureVersionToken() {
  if (!fs.existsSync(VERSION_FILE)) {
    throw new Error(`Missing version file: ${path.relative(ROOT_DIR, VERSION_FILE)}`);
  }
  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to parse version JSON (${error.message})`);
  }
  const candidates = [
    payload && payload.cacheToken,
    payload && payload.updatedAt,
    payload && payload.timestamp,
    payload && payload.semantic,
    new Date().toISOString()
  ];
  const raw = candidates
    .map((candidate) => (typeof candidate === 'string' ? candidate.trim() : ''))
    .find((candidate) => candidate.length > 0);
  if (!raw) {
    throw new Error('Unable to derive asset version token from siteVersion.json');
  }
  return encodeURIComponent(raw);
}

function listHtmlFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const absPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listHtmlFiles(absPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
      files.push(absPath);
    }
  }
  return files;
}

function injectTokenIntoFile(filePath, token) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes(PLACEHOLDER)) {
    return false;
  }
  const updated = content.replace(new RegExp(PLACEHOLDER, 'g'), token);
  if (updated !== content) {
    fs.writeFileSync(filePath, updated, 'utf8');
    return true;
  }
  return false;
}

function main() {
  if (!fs.existsSync(PUBLIC_DIR)) {
    throw new Error('public/ directory not found – run the build before injecting versions.');
  }
  const token = ensureVersionToken();
  const htmlFiles = listHtmlFiles(PUBLIC_DIR);
  let touched = 0;
  htmlFiles.forEach((file) => {
    if (injectTokenIntoFile(file, token)) {
      touched += 1;
    }
  });
  if (touched === 0) {
    console.warn('injectAssetVersion: no placeholders replaced; check that files reference "__ASSET_VERSION__".');
  } else {
    console.log(`injectAssetVersion: injected token into ${touched} file(s).`);
  }
}

try {
  main();
} catch (error) {
  console.error(`injectAssetVersion failed: ${error.message}`);
  process.exitCode = 1;
}

