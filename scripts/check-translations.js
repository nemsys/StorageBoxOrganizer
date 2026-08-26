#!/usr/bin/env node
/**
 * Consistency check for src/translations.
 *
 * Catches the four ways this setup drifts:
 *   1. a key that exists in one language but not the other
 *   2. a {{box.the}} style reference that the glossary can't resolve
 *   3. a runtime parameter used in one language's string but not the other's
 *   4. a key used in the code but missing from the files (or defined and unused)
 *
 * Run with `npm run translations:check`.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'src', 'translations');
const LANGS = ['en', 'bg'];

const read = (name) => JSON.parse(readFileSync(join(dir, name), 'utf8'));

const strings = Object.fromEntries(LANGS.map((l) => [l, read(`${l}.json`)]));
const glossary = Object.fromEntries(LANGS.map((l) => [l, read(`terms.${l}.json`)]));

const problems = [];
const warnings = [];
const fail = (msg) => problems.push(msg);
const warn = (msg) => warnings.push(msg);

const refsIn = (template) =>
  [...template.matchAll(/\{\{([^{}]+)\}\}/g)].map((m) => m[1].trim().replace(/^\^/, ''));

const baseKey = (key) => key.replace(/_(one|other)$/, '');

// ── 1. key parity ────────────────────────────────────────────────────────────
for (const lang of LANGS) {
  for (const other of LANGS.filter((l) => l !== lang)) {
    for (const key of Object.keys(strings[lang])) {
      if (!(key in strings[other])) fail(`${other}.json is missing key "${key}" (present in ${lang}.json)`);
    }
  }
}

// ── 2. glossary references resolve ───────────────────────────────────────────
for (const lang of LANGS) {
  const { terms, forms } = glossary[lang];
  const usedTerms = new Set();
  const usedForms = new Set();

  for (const [key, template] of Object.entries(strings[lang])) {
    for (const ref of refsIn(template)) {
      const [termKey, formKey] = ref.split('.');
      if (formKey === undefined) continue; // runtime parameter, checked below
      const term = terms[termKey];
      if (!term) {
        fail(`${lang}.json "${key}": unknown term "${termKey}" in {{${ref}}}`);
        continue;
      }
      usedTerms.add(termKey);
      if (term[formKey] !== undefined) continue;
      if (forms[formKey] === undefined) {
        fail(`${lang}.json "${key}": "${termKey}" has no form "${formKey}", and terms.${lang}.json has no shared form of that name`);
        continue;
      }
      usedForms.add(formKey);
      const shared = forms[formKey];
      if (typeof shared !== 'string' && shared[term.g] === undefined) {
        fail(`terms.${lang}.json: shared form "${formKey}" has no entry for gender "${term.g}" (needed by term "${termKey}")`);
      }
    }
  }

  for (const termKey of Object.keys(terms)) {
    if (!usedTerms.has(termKey)) warn(`terms.${lang}.json: term "${termKey}" is never referenced`);
  }
  for (const formKey of Object.keys(forms)) {
    if (!usedForms.has(formKey)) warn(`terms.${lang}.json: shared form "${formKey}" is never referenced`);
  }
}

// ── 3. runtime parameters match across languages ─────────────────────────────
const paramsOf = (template) => new Set(refsIn(template).filter((r) => !r.includes('.')));
for (const key of Object.keys(strings.en)) {
  if (!(key in strings.bg)) continue;
  const [a, b] = [paramsOf(strings.en[key]), paramsOf(strings.bg[key])];
  for (const p of a) if (!b.has(p)) fail(`bg.json "${key}": missing parameter {{${p}}} that en.json uses`);
  for (const p of b) if (!a.has(p)) fail(`en.json "${key}": missing parameter {{${p}}} that bg.json uses`);
}

// ── 4. keys used in the code ─────────────────────────────────────────────────
const sourceFiles = [];
(function walk(path) {
  for (const entry of readdirSync(path)) {
    const full = join(path, entry);
    if (statSync(full).isDirectory()) walk(full);
    else if (/\.jsx?$/.test(entry)) sourceFiles.push(full);
  }
})(join(root, 'src'));

const usedKeys = new Set();
for (const file of sourceFiles) {
  const code = readFileSync(file, 'utf8');
  for (const m of code.matchAll(/\bt\(\s*['"]([\w.]+)['"]/g)) usedKeys.add(m[1]);
  // Keys handed to a component as data rather than translated on the spot.
  for (const m of code.matchAll(/\b(?:tKey|phaseKey|labelKey)\s*[:=]\s*['"]([\w.]+)['"]/g)) usedKeys.add(m[1]);
}

const defined = new Set(Object.keys(strings.en).map(baseKey));
for (const key of usedKeys) {
  if (!defined.has(key)) fail(`code uses t("${key}") but no such key exists in en.json`);
}
for (const key of defined) {
  if (!usedKeys.has(key)) warn(`"${key}" is defined but never used in the code`);
}

// ── report ───────────────────────────────────────────────────────────────────
for (const w of warnings) console.warn(`  warning: ${w}`);
for (const p of problems) console.error(`  error:   ${p}`);

const counts = `${Object.keys(strings.en).length} keys, ${LANGS.length} languages`;
if (problems.length) {
  console.error(`\ntranslations: ${problems.length} error(s), ${warnings.length} warning(s) — ${counts}`);
  process.exit(1);
}
console.log(`translations: OK — ${counts}${warnings.length ? `, ${warnings.length} warning(s)` : ''}`);
