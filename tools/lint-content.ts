// Checks the content files before every build: `npm run lint:content`.
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { validateContent } from '../src/validate';
import type { Content } from '../src/types';

const load = (name: string) => parse(readFileSync(new URL(`../content/${name}.yaml`, import.meta.url), 'utf8')) ?? [];
const content = { school: load('school'), parts: load('parts'), systems: load('systems'), protocols: load('protocols') } as Content;
const errs = validateContent(content);
if (errs.length) {
  console.error(`内容有 ${errs.length} 个问题:`);
  for (const e of errs) console.error('  - ' + e);
  process.exit(1);
}
const checked = content.protocols.filter((p) => p.checked).length;
console.log(`内容没问题:${content.systems.length} 张系统卡,${content.protocols.length} 张 protocol 卡(已核对 ${checked} 张)。`);
