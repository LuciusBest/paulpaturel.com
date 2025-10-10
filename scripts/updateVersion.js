#!/usr/bin/env node
/**
 * Increment the site version and write both semantic and timestamp formats.
 *
 * - semantic: V00.00.00 (two-digit major/minor/patch, zero-padded)
 * - timestamp: YYYY/MM/DD/MinMin/SS (minutes labelled "Min" to avoid confusion with month)
 *
 * The script is idempotent per run and will carry values across executions via
 * src/data/siteVersion.json. Run it before committing/pushing a production update.
 */

const fs = require('fs');
const path = require('path');

const versionFile = path.join(__dirname, '..', 'src', 'data', 'siteVersion.json');

function pad(value) {
  return String(value).padStart(2, '0');
}

function parseSemantic(value) {
  const match = /^V(\d{2})\.(\d{2})\.(\d{2})$/.exec(value || '');
  if (!match) {
    return { major: 0, minor: 0, patch: 0 };
  }

  const [major, minor, patch] = match.slice(1).map(Number);
  return { major, minor, patch };
}

function incrementSemantic(current) {
  const { major, minor, patch } = parseSemantic(current);
  let nextMajor = major;
  let nextMinor = minor;
  let nextPatch = patch + 1;

  if (nextPatch > 99) {
    nextPatch = 0;
    nextMinor += 1;
  }

  if (nextMinor > 99) {
    nextMinor = 0;
    nextMajor += 1;
  }

  if (nextMajor > 99) {
    nextMajor = 0;
  }

  return `V${pad(nextMajor)}.${pad(nextMinor)}.${pad(nextPatch)}`;
}

function formatTimestamp(date) {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}/${month}/${day}/${minutes}/${seconds}`;
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

function main() {
  const now = new Date();
  const current = readCurrentVersion(versionFile);
  const nextSemantic = incrementSemantic(current?.semantic);
  const timestamp = formatTimestamp(now);

  const payload = {
    semantic: nextSemantic,
    timestamp,
    updatedAt: now.toISOString()
  };

  writeVersion(versionFile, payload);

  console.log(`Updated site version → ${payload.semantic} (${payload.timestamp})`);
}

main();
