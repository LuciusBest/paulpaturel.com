#!/usr/bin/env node
/**
 * Update the site metadata (semantic version + timestamps).
 *
 * CLI usage:
 *   node scripts/updateVersion.js [major|minor|patch|none]
 *
 * - default bump: patch
 * - "none": keep existing semantic version, only refresh timestamps
 *
 * The script persists payload to:
 *   • src/data/siteVersion.json (for fetch at runtime)
 *   • src/js/data/siteVersionInline.js (for inline boot)
 */

const fs = require('fs');
const path = require('path');

const versionFile = path.join(__dirname, '..', 'src', 'data', 'siteVersion.json');
const inlineVersionFile = path.join(__dirname, '..', 'src', 'js', 'data', 'siteVersionInline.js');

function pad(value) {
  return String(value).padStart(2, '0');
}

function parseSemantic(value) {
  const match = /^V?(\d{1,3})\.(\d{2})\.(\d{2})$/.exec(value || '');
  if (!match) {
    return { major: 0, minor: 0, patch: 0 };
  }
  const [major, minor, patch] = match.slice(1).map((part) => Number(part) || 0);
  return {
    major: clamp(major, 0, 999),
    minor: clamp(minor, 0, 99),
    patch: clamp(patch, 0, 99)
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatSemantic(parts) {
  const major = clamp(parts.major ?? 0, 0, 999);
  const minor = clamp(parts.minor ?? 0, 0, 99);
  const patch = clamp(parts.patch ?? 0, 0, 99);
  return `V${String(major)}.${pad(minor)}.${pad(patch)}`;
}

function bumpSemantic(current, bumpType) {
  const base = parseSemantic(current);
  let { major, minor, patch } = base;
  switch (bumpType) {
    case 'major':
      major = (major + 1) % 1000;
      minor = 0;
      patch = 0;
      break;
    case 'minor':
      minor = (minor + 1) % 100;
      patch = 0;
      if (minor === 0) {
        major = (major + 1) % 1000;
      }
      break;
    case 'patch':
      patch += 1;
      if (patch > 99) {
        patch = 0;
        minor += 1;
        if (minor > 99) {
          minor = 0;
          major = (major + 1) % 1000;
        }
      }
      break;
    case 'none':
    default:
      break;
  }
  return formatSemantic({ major, minor, patch });
}

function formatTimestamp(date) {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}/${month}/${day}/${minutes}/${seconds}`;
}

function resolveBumpType(argv) {
  const alt = String(argv[2] || '').trim().toLowerCase();
  if (alt === 'major' || alt === 'minor' || alt === 'patch' || alt === 'none') {
    return alt;
  }
  return 'patch';
}

function readCurrentVersion(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`⚠️  Unable to read existing version file (${error.message}). Resetting.`);
    return null;
  }
}

function writeVersion(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function writeInlineVersion(filePath, payload) {
  const content = [
    `window.SiteVersion = ${JSON.stringify(payload)};`,
    typeof payload.cacheToken === 'string' && payload.cacheToken.length > 0
      ? `window.__assetVersion = '${payload.cacheToken}';`
      : ''
  ]
    .filter(Boolean)
    .join('\n')
    .concat('\n');
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function makeCacheToken({ semantic, timestamp, updatedAt }) {
  const pieces = [semantic, timestamp, updatedAt]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean);
  const raw = pieces.length > 0 ? pieces.join('-') : new Date().toISOString();
  const cleaned = raw.replace(/[^0-9A-Za-z]+/g, '');
  const sliced = cleaned.slice(-64);
  return sliced || `${Date.now()}`;
}

function main() {
  const now = new Date();
  const current = readCurrentVersion(versionFile);
  const bumpType = resolveBumpType(process.argv);
  const baseSemantic = current?.semantic || 'V0.00.00';
  const nextSemantic = bumpSemantic(baseSemantic, bumpType);
  const timestamp = formatTimestamp(now);

  const payload = {
    semantic: nextSemantic,
    timestamp,
    updatedAt: now.toISOString()
  };
  payload.cacheToken = makeCacheToken(payload);

  writeVersion(versionFile, payload);
  writeInlineVersion(inlineVersionFile, payload);

  const note = bumpType === 'none' ? 'timestamp refreshed' : `${bumpType} bump`;
  console.log(`Updated site metadata → ${payload.timestamp} (${note})`);
}

main();
