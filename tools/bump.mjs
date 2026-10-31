// バージョンを まとめて あげる：node tools/bump.mjs 0.9
// js/game.js の GAME_VERSION・sw.js の APP_VERSION・version.json・index.html の ?v= を おなじ ばんごうに する
// （js/changelog.js の いちばん うえに、その ばんの りれきを たすのも わすれずに）
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const v = process.argv[2];
if (!/^\d+\.\d+(\.\d+)?$/.test(v || '')) { console.error('つかいかた: node tools/bump.mjs 0.9'); process.exit(1); }
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const edit = (file, re, to) => {
  const p = join(root, file), s = readFileSync(p, 'utf8');
  if (!s.match(re)) { console.error(`ばんごうの ばしょが みつからない: ${file}`); process.exit(1); }
  writeFileSync(p, s.replace(re, to));
};
edit('js/game.js', /const GAME_VERSION = '[^']*'/, `const GAME_VERSION = '${v}'`);
edit('sw.js', /const APP_VERSION = '[^']*'/, `const APP_VERSION = '${v}'`);
edit('version.json', /"version": "[^"]*"/, `"version": "${v}"`);
edit('index.html', /\?v=[\d.]+/g, `?v=${v}`);
const log = readFileSync(join(root, 'js/changelog.js'), 'utf8');
if (!log.includes(`ver: '${v}'`)) console.warn(`ちゅうい：js/changelog.js に ver '${v}' の りれきが まだ ありません`);
console.log(`バージョンを ${v} に しました`);
