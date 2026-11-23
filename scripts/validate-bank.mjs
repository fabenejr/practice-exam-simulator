// Validates question banks. Usage:
//   node scripts/validate-bank.mjs                 -> every .js/.json bank in data/
//   node scripts/validate-bank.mjs path/to/bank.json [more files...]
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const Core = require('../js/core.js');

const dataDir = fileURLToPath(new URL('../data/', import.meta.url));
const args = process.argv.slice(2);
const files = args.length
  ? args.map((f) => resolve(f))
  : readdirSync(dataDir).filter((f) => ['.js', '.json'].includes(extname(f))).map((f) => join(dataDir, f));

if (!files.length) {
  console.error('No question banks found.');
  process.exit(1);
}

let failed = false;
for (const file of files) {
  let bank;
  try {
    bank = extname(file) === '.json' ? JSON.parse(readFileSync(file, 'utf8')) : require(file);
  } catch (e) {
    console.error(`FAIL ${file}\n  could not load: ${e.message}`);
    failed = true;
    continue;
  }
  const result = Core.validateBank(bank);
  if (result.ok) {
    console.log(`ok   ${file} (${bank.questions.length} questions, ${bank.domains.length} domains)`);
  } else {
    failed = true;
    console.error(`FAIL ${file}`);
    result.errors.forEach((m) => console.error('  - ' + m));
  }
}
process.exit(failed ? 1 : 0);
