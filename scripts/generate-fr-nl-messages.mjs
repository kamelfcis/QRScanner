#!/usr/bin/env node
/**
 * Walks en.json, applies ui-glossary.json (English → { fr, nl }),
 * falls back to English for unmapped keys, writes fr.json and nl.json.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const enPath = join(root, 'src/messages/en.json');
const glossaryPath = join(__dirname, 'i18n/ui-glossary.json');
const frPath = join(root, 'src/messages/fr.json');
const nlPath = join(root, 'src/messages/nl.json');
const reportPath = join(__dirname, 'last-i18n-generation-report.json');

const en = JSON.parse(readFileSync(enPath, 'utf8'));
const glossary = JSON.parse(readFileSync(glossaryPath, 'utf8'));

const unmapped = new Set();
let mappedCount = 0;
let totalLeaves = 0;

function translateLeaf(value) {
  totalLeaves += 1;
  const entry = glossary[value];
  if (entry?.fr && entry?.nl) {
    mappedCount += 1;
    return { fr: entry.fr, nl: entry.nl };
  }
  unmapped.add(value);
  return { fr: value, nl: value };
}

function walk(node) {
  if (typeof node === 'string') {
    return translateLeaf(node);
  }
  if (Array.isArray(node)) {
    return node.map((item) => {
      if (typeof item === 'string') {
        const { fr, nl } = translateLeaf(item);
        return { __fr: fr, __nl: nl, __en: item };
      }
      return walk(item);
    });
  }
  if (node && typeof node === 'object') {
    const frObj = {};
    const nlObj = {};
    for (const [key, val] of Object.entries(node)) {
      if (typeof val === 'string') {
        const { fr, nl } = translateLeaf(val);
        frObj[key] = fr;
        nlObj[key] = nl;
      } else {
        const nested = walk(val);
        if (Array.isArray(nested)) {
          frObj[key] = nested.map((item) =>
            item && typeof item === 'object' && '__fr' in item ? item.__fr : item
          );
          nlObj[key] = nested.map((item) =>
            item && typeof item === 'object' && '__nl' in item ? item.__nl : item
          );
        } else {
          frObj[key] = nested.frObj;
          nlObj[key] = nested.nlObj;
        }
      }
    }
    return { frObj, nlObj };
  }
  return { frObj: node, nlObj: node };
}

const result = walk(en);
writeFileSync(frPath, `${JSON.stringify(result.frObj, null, 2)}\n`, 'utf8');
writeFileSync(nlPath, `${JSON.stringify(result.nlObj, null, 2)}\n`, 'utf8');

const report = {
  generatedAt: new Date().toISOString(),
  totalLeaves,
  mappedCount,
  unmappedCount: unmapped.size,
  coveragePercent: totalLeaves ? Math.round((mappedCount / totalLeaves) * 1000) / 10 : 0,
  unmappedSamples: [...unmapped].sort().slice(0, 50),
};

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`Generated fr.json and nl.json`);
console.log(`  Total strings: ${totalLeaves}`);
console.log(`  Glossary mapped: ${mappedCount} (${report.coveragePercent}%)`);
console.log(`  English fallback: ${unmapped.size}`);
console.log(`  Report: ${reportPath}`);
