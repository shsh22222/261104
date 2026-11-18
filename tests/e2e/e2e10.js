// 第十回 E2E：記録の守り（壊れた記録・控え・書き出しの形式・版）、番組の引き算（番組表・書きかけ）、一言漫才
const { chromium } = require('playwright');
const path = require('path');
const OUT = require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || 'http://127.0.0.1:8765/index.html';
const KEY = 'kokoro-yose.v1';

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const notes = [];
  const watch = (p, tag) => {
    p.on('console', m => { if (m.type() === 'error') errors.push(tag + ' console: ' + m.text()); });
    p.on('pageerror', e => errors.push(tag + ' pageerror: ' + e.message));
  };
  const overflow = async (p, label) => {
    const w = await p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    if (w[0] > w[1]) errors.push(label + ' overflow ' + w.join('>'));
  };
  const autoKojo = () => { document.addEventListener('DOMContentLoaded', () => { new MutationObserver(() => { const b = document.querySelector('.kojo [data-act="closeSheet"]'); if (b) setTimeout(() => b.click(), 50); const l = document.querySelector('#legend-root [data-act="legendOk"]'); if (l) setTimeout(() => l.click(), 300); }).observe(document.body, { childList: true, subtree: true }); }); };
  const shot = (p, n, full) => p.screenshot({ path: path.join(OUT, 'e-' + n + '.png'), fullPage: !!full });
  const state = p => p.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.addInitScript(autoKojo);
  const p = await ctx.newPage();
  watch(p, 'main');
  await p.goto(BASE);
  await p.waitForTimeout(700);
  await p.click('[data-act="introStart"]');
  await p.waitForTimeout(300);

  // ---- 番組：番組表は畳まれている・開いた状態を覚える ----
  if (await p.$('.bangumi-fold[open]')) errors.push('program list should start folded');
  const acts = await p.$$eval('.program .act', e => e.length);
  const label = await p.textContent('.bangumi-sum-s');
  if (!label.includes('（' + acts + '）')) errors.push('program count label ' + label + ' vs ' + acts);
  if (!(await p.$('.quick-btn'))) errors.push('quick button missing');
  await shot(p, '01-home', true);
  await p.click('.bangumi-sum'); await p.waitForTimeout(200);
  await p.reload(); await p.waitForTimeout(600);
  if (!(await p.$('.bangumi-fold[open]'))) errors.push('program open state not remembered');
  await p.click('.bangumi-sum'); await p.waitForTimeout(200);

  // ---- 一言漫才 ----
  await p.click('.quick-btn'); await p.waitForTimeout(400);
  await p.fill('#qmThought', 'どうせ、みんなに嫌われてる');
  await shot(p, '02-quick-1');
  await p.click('#qmNext'); await p.waitForTimeout(250);
  const yname = await p.textContent('.quick-y-n');
  notes.push('quick yokai ' + yname);
  await shot(p, '03-quick-2');
  await p.click('.quick-tk-b'); await p.waitForTimeout(200);
  await p.fill('#qmAns', '昨日も話しかけてくれた人がいた');
  await p.click('[data-act="qmNext"]'); await p.waitForTimeout(250);
  const c0 = await p.textContent('.quick-ochi-b');
  if (!c0.includes('昨日も話しかけてくれた')) errors.push('ochi candidate should use answer: ' + c0);
  await p.click('.quick-ochi-b'); await p.waitForTimeout(150);
  await shot(p, '04-quick-3');
  await p.click('#qmGo'); await p.waitForTimeout(2600);
  for (let i = 0; i < 40; i++) {
    const t = await p.textContent('#stNext').catch(() => null);
    if (t === null) break;
    if (t === '感想へ') { await p.waitForTimeout(800); await p.click('#stNext'); break; }
    await p.click('#stNext'); await p.waitForTimeout(80);
  }
  await p.waitForTimeout(500);
  if (!(await p.$('.done'))) errors.push('quick done screen missing');
  await shot(p, '05-quick-done', true);
  const S1 = await state(p);
  const sc = S1.scripts[0];
  notes.push('quick script ' + JSON.stringify({ quick: sc.quick, y: sc.yokai, tk: sc.tk, nt: sc.newThought }));
  if (!sc.quick || sc.thought !== 'どうせ、みんなに嫌われてる' || !sc.newThought.includes('昨日も')) errors.push('quick script ' + JSON.stringify(sc));
  if (!(S1.yokai[sc.yokai[0]] && S1.yokai[sc.yokai[0]].met === 1)) errors.push('yokai not met');
  if (S1.v !== 2) errors.push('schema v ' + S1.v);
  await p.goto(BASE + '#neta'); await p.waitForTimeout(300);
  await overflow(p, 'neta');

  // ---- 書きかけのネタ → 番組に「続きから」 ----
  await p.goto(BASE + '#home'); await p.waitForTimeout(200);
  await p.click('.seat-tsukkomi'); await p.waitForTimeout(200);
  await p.click('[data-act="mzEmotion"][data-id="fuan"]');
  await p.click('#mzNextBtn'); await p.fill('#thought', '発表で失敗する'); await p.waitForTimeout(500);
  await p.click('[data-act="mzQuit"]'); await p.waitForTimeout(200);
  await p.click('[data-act="mzQuitKeep"]'); await p.waitForTimeout(300);
  if (!(await p.$('.resume-draft'))) errors.push('resume draft missing');
  await p.click('.resume-draft'); await p.waitForTimeout(300);
  if ((await p.inputValue('#thought').catch(() => '')) !== '発表で失敗する') errors.push('resume did not restore draft');
  await p.goto(BASE + '#home'); await p.waitForTimeout(200);

  // ---- 書き出し：包み紙つき。読み込み：包み紙も、旧形式も ----
  await p.goto(BASE + '#gakuya'); await p.waitForTimeout(300);
  await p.click('[data-act="exportData"]'); await p.waitForTimeout(300);
  const exp = JSON.parse(await p.inputValue('#exportBox'));
  if (exp.app !== 'kokoro-yose' || exp.schema !== 2 || !exp.data || !Array.isArray(exp.data.scripts)) errors.push('export wrapper ' + Object.keys(exp));
  await p.click('[data-act="copyExport"]'); await p.waitForTimeout(200);
  if (!(await state(p)).profile.lastBackup) errors.push('lastBackup not set');
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  // 旧形式（v なし）を読み込む
  const old = JSON.parse(JSON.stringify(exp.data)); delete old.v; old.scripts = []; old.profile.name = 'ココロ亭テスト';
  await p.click('[data-act="importData"]'); await p.waitForTimeout(300);
  await p.fill('#importBox', JSON.stringify(old));
  await p.click('form[data-form="importData"] button[type="submit"]'); await p.waitForTimeout(300);
  await p.click('[data-act="confirmYes"]'); await p.waitForTimeout(400);
  const S2 = await state(p);
  if (S2.profile.name !== 'ココロ亭テスト' || S2.v !== 2 || S2.scripts.length !== 0) errors.push('old import ' + JSON.stringify({ n: S2.profile.name, v: S2.v }));
  // 新しすぎる版は断る
  const future = { app: 'kokoro-yose', schema: 99, data: Object.assign({}, old, { v: 99 }) };
  await p.click('[data-act="importData"]'); await p.waitForTimeout(300);
  await p.fill('#importBox', JSON.stringify(future));
  await p.click('form[data-form="importData"] button[type="submit"]'); await p.waitForTimeout(300);
  if (await p.$('[data-act="confirmYes"]')) errors.push('future schema should be refused');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  // 包み紙の書き出しを読み込んで戻す（読み込み前の記録は控えに）
  await p.click('[data-act="importData"]'); await p.waitForTimeout(300);
  await p.fill('#importBox', JSON.stringify(exp));
  await p.click('form[data-form="importData"] button[type="submit"]'); await p.waitForTimeout(300);
  await p.click('[data-act="confirmYes"]'); await p.waitForTimeout(400);
  const S3 = await state(p);
  if (S3.scripts.length !== 1) errors.push('wrapper import scripts ' + S3.scripts.length);
  const bak = await p.evaluate(k => JSON.parse(localStorage.getItem(k + '.bak')), KEY);
  if (!bak || bak.data.profile.name !== 'ココロ亭テスト') errors.push('pre-import state not kept as backup');
  await p.goto(BASE + '#gakuya'); await p.waitForTimeout(300);
  if (!(await p.$('[data-act="restoreBak"]'))) errors.push('restore button missing');
  if (!(await p.textContent('#view')).includes('最後に控えをとった日')) errors.push('last backup date not shown');
  await shot(p, '06-gakuya', true);

  // ---- 壊れた記録：上書きせずに別名で残し、控えから戻す ----
  const good = await p.evaluate(k => localStorage.getItem(k), KEY);
  await p.evaluate(([k, g]) => { localStorage.setItem(k + '.bak', JSON.stringify({ date: '2026-01-01', data: JSON.parse(g) })); localStorage.setItem(k, '{"broken": tru'); }, [KEY, good]);
  await p.goto(BASE + '#home'); await p.reload(); await p.waitForTimeout(700);
  const notice = await p.textContent('.notice').catch(() => '');
  if (!notice.includes('控えに戻しました')) errors.push('restore notice ' + notice);
  const keys = await p.evaluate(() => Object.keys(localStorage));
  if (!keys.some(k => k.startsWith('kokoro-yose.v1.broken-'))) errors.push('broken data not preserved');
  const S4 = await state(p);
  if (!S4 || S4.scripts.length !== 1) errors.push('not restored from backup');
  await shot(p, '07-restored');

  // ---- 控えを促す ----
  await p.evaluate(k => { const s = JSON.parse(localStorage.getItem(k)); s.profile.lastBackup = null; for (let i = 0; i < 10; i++) s.fuku.goods.push({ id: 'g' + i, date: new Date().toISOString(), text: 'x', kind: 'yoi', lens: 'よかったこと' }); localStorage.setItem(k, JSON.stringify(s)); }, KEY);
  await p.reload(); await p.waitForTimeout(600);
  if (!(await p.$('.notice-link[href="#gakuya"]'))) errors.push('backup reminder missing');

  // ---- 320px ----
  const sm = await browser.newContext({ viewport: { width: 320, height: 640 }, colorScheme: 'dark' });
  await sm.addInitScript(autoKojo);
  const sp = await sm.newPage();
  watch(sp, 'small');
  await sp.goto(BASE); await sp.waitForTimeout(600);
  await sp.click('[data-act="introStart"]');
  await overflow(sp, '320 home');
  await sp.screenshot({ path: path.join(OUT, 'e-08-home-320.png'), fullPage: true });
  await sp.click('.quick-btn'); await sp.waitForTimeout(300);
  await sp.fill('#qmThought', 'ミスしたから、全部台無しだ'); await sp.click('#qmNext'); await sp.waitForTimeout(300);
  await overflow(sp, '320 quick');
  await sp.screenshot({ path: path.join(OUT, 'e-09-quick-320.png') });

  await browser.close();
  console.log(notes.join('\n'));
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'ALL OK');
})();
