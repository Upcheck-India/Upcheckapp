#!/usr/bin/env node
/**
 * Docs link checker — fails if any relative markdown link points at a file
 * that doesn't exist. Keeps the docs/ cross-links honest as they evolve.
 *
 * Usage:  node scripts/check-doc-links.mjs
 * Scans every *.md in the repo (excluding node_modules/.git). Only relative
 * links (starting with '.') are checked; http(s) and #anchors are ignored.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const IGNORE = /(^|\/)(node_modules|\.git|dist|build|coverage)(\/|$)/;

/** @type {string[]} */
const mdFiles = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (IGNORE.test(p)) continue;
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.md')) mdFiles.push(p);
  }
})(ROOT);

const linkRe = /\]\((\.[^)\s]+?)(#[^)]*)?\)/g;
let checked = 0;
const broken = [];

for (const file of mdFiles) {
  const text = fs.readFileSync(file, 'utf8');
  const dir = path.dirname(file);
  for (const m of text.matchAll(linkRe)) {
    const target = m[1];
    checked++;
    const resolved = path.normalize(path.join(dir, target));
    if (!fs.existsSync(resolved)) {
      broken.push({ file: path.relative(ROOT, file), target });
    }
  }
}

if (broken.length) {
  console.error(`\n✗ ${broken.length} broken relative link(s) found:\n`);
  for (const b of broken) console.error(`  ${b.file} → ${b.target}`);
  console.error(`\nChecked ${checked} relative links across ${mdFiles.length} markdown files.`);
  process.exit(1);
}

console.log(`✓ ${checked} relative links across ${mdFiles.length} markdown files — all resolve.`);
