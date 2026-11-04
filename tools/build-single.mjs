// ココロ寄席 ― 1ファイル版をつくる
// 使い方: node tools/build-single.mjs [出力先]
//   CSS と JS を index.html に埋め込み、PWA 用のタグ（ARTIFACT:STRIP の範囲）を取り除いた
//   「ページの中身だけ」の HTML を書き出します（Claude の Artifact などで公開する用）。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(process.argv[2] || join(root, 'dist', 'kokoro-yose.html'));
const read = p => readFileSync(join(root, p), 'utf8');

let html = read('index.html');

// PWA 専用の部分を削除
html = html.replace(/<!-- ARTIFACT:STRIP -->[\s\S]*?<!-- \/ARTIFACT:STRIP -->\n?/g, () => '');

// CSS と JS を埋め込む
html = html.replace(/<link rel="stylesheet" href="(css\/[^"]+)">/g, (_, p) => `<style>\n${read(p)}\n</style>`);
html = html.replace(/<script src="(js\/[^"]+)"><\/script>/g, (_, p) => {
  const js = read(p);
  if (js.includes('</script')) throw new Error(p + ' に </script が含まれています');
  return `<script>\n${js}\n</script>`;
});

// 文書の骨組みを外し、head の中身と body の中身を並べる
const head = (html.match(/<head>([\s\S]*?)<\/head>/) || [, ''])[1]
  .replace(/<meta charset="utf-8">\n?/, () => '')
  .replace(/<meta name="viewport"[^>]*>\n?/, () => '');
const body = (html.match(/<body>([\s\S]*?)<\/body>/) || [, ''])[1];
const fragment = head.trim() + '\n' + body.trim() + '\n';

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, fragment);
console.log('wrote', out, (fragment.length / 1024).toFixed(1) + ' KB');
