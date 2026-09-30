import { readFile } from 'node:fs/promises';
import { act4NarrativeSections, act4NarrativeSources } from '../src/data/narrative/act4Narrative.ts';

const extractedPath = process.argv[2];
if (!extractedPath) {
  console.error('Usage: node --experimental-strip-types scripts/verify-act4-source.mjs <extracted-novel-text.txt>');
  process.exit(2);
}

const raw = await readFile(extractedPath, 'utf8');
const markers = [...raw.matchAll(/^(?:===== PAGE (\d+) =====|PDF_PAGE_(\d+))\r?\n/gm)];
const pages = new Map();
for (let index = 0; index < markers.length; index += 1) {
  const marker = markers[index];
  const start = marker.index + marker[0].length;
  const end = markers[index + 1]?.index ?? raw.length;
  pages.set(Number(marker[1] ?? marker[2]), raw.slice(start, end));
}

const normalize = (text) => text.normalize('NFC').replace(/\s+/gu, '');
const failures = [];
let checked = 0;
for (const section of act4NarrativeSections) {
  for (const block of section.blocks) {
    if (block.kind !== 'novel-excerpt' || !block.sourceRefId) continue;
    const source = act4NarrativeSources[block.sourceRefId];
    const sourceText = normalize(source.sourcePages.map((page) => pages.get(page) ?? '').join(''));
    for (const [paragraphIndex, paragraph] of block.paragraphs.entries()) {
      checked += 1;
      if (!sourceText.includes(normalize(paragraph))) {
        failures.push(`${section.stage}/${block.id}[${paragraphIndex + 1}] pages ${source.sourcePages.join(',')}: ${paragraph.slice(0, 64)}`);
      }
    }
  }
}

if (failures.length) {
  console.error(`${failures.length}/${checked} excerpt paragraphs did not match their cited PDF pages:`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Matched ${checked} novel excerpt paragraphs against their cited PDF pages across ${pages.size} extracted pages.`);
