// ココロ寄席 ― E2Eテストの実行
// 使い方: node tests/run.mjs            （全部）
//         node tests/run.mjs e2e9 e2e8  （指定したものだけ）
// 必要なもの: Node.js と Playwright（require('playwright') が使えること）
// アプリを 127.0.0.1:8765 で配信し、tests/e2e/*.js を1本ずつ順に実行します（並列にすると、時間に依存するテストが不安定になるため）。
// スクリーンショットは tests/e2e/out/ に出ます（git には入れません）。
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'tests', 'e2e');
const PORT = 8765;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };

const server = createServer(async (req, res) => {
  try {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = normalize(join(root, p === '/' ? 'index.html' : p));
    if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch (e) { res.writeHead(404); res.end('not found'); }
});

function runOne(name) {
  return new Promise(done => {
    const t0 = Date.now();
    let out = '';
    const ch = spawn(process.execPath, [join(dir, name + '.js')], { cwd: root, env: { ...process.env, BASE: `http://127.0.0.1:${PORT}/index.html` } });
    ch.stdout.on('data', d => { out += d; });
    ch.stderr.on('data', d => { out += d; });
    ch.on('close', code => {
      const ok = code === 0 && /ALL OK|NO ERRORS/.test(out) && !/ERRORS:/.test(out);
      done({ name, ok, sec: Math.round((Date.now() - t0) / 1000), out });
    });
  });
}

const want = process.argv.slice(2);
const all = (await readdir(dir)).filter(f => /^e2e.*\.js$/.test(f)).map(f => f.replace(/\.js$/, '')).sort();
const list = want.length ? all.filter(n => want.includes(n)) : all;
await new Promise(r => server.listen(PORT, '127.0.0.1', r));
const results = [];
for (const name of list) {
  process.stdout.write(`▶ ${name} … `);
  const r = await runOne(name);
  results.push(r);
  console.log(`${r.ok ? 'OK' : 'NG'}（${r.sec}秒）`);
  if (!r.ok) console.log(r.out.split('\n').slice(-25).join('\n'));
}
server.close();
const ng = results.filter(r => !r.ok);
console.log(`\n${results.length - ng.length}/${results.length} 本が通りました${ng.length ? '。NG: ' + ng.map(r => r.name).join(', ') : ''}`);
process.exit(ng.length ? 1 : 0);
