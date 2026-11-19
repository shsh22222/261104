// 第三回の機能の E2E
const { chromium } = require('playwright');
const path = require('path');
const OUT = require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:8765/index.html';

(async () => {
  const browser = await chromium.launch();
  // 第八回：旧テストは「細かく（スライダー）」の記録で動かす
  { const _nc = browser.newContext.bind(browser); browser.newContext = async o => { const c = await _nc(o); await c.addInitScript(() => { try { const K = 'kokoro-yose.v1'; if (!localStorage.getItem(K)) localStorage.setItem(K, JSON.stringify({ v: 1, profile: { measure: 'slider' } })); } catch (e) { /* noop */ } }); return c; }; }
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'light', hasTouch: true });
  await ctx.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { new MutationObserver(() => { const l = document.querySelector('#legend-root [data-act="legendOk"]'); if (l && !l.dataset.t) { l.dataset.t = 1; setTimeout(() => l.click(), 80); } }).observe(document.body, { childList: true, subtree: true }); }); });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  const shot = (n, full) => page.screenshot({ path: path.join(OUT, 't-' + n + '.png'), fullPage: !!full });
  const overflow = async label => {
    const w = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    if (w[0] > w[1]) errors.push(label + ' overflow ' + w.join('>'));
  };

  await page.clock.setFixedTime(new Date('2026-11-05T13:00:00'));
  await page.goto(BASE);
  await page.waitForTimeout(700);
  await page.click('[data-act="introStart"]');
  await page.waitForTimeout(300);
  await page.evaluate(() => { const k = 'kokoro-yose.v1'; const s = JSON.parse(localStorage.getItem(k)); s.xp = 10; localStorage.setItem(k, JSON.stringify(s)); });
  await page.reload();
  await page.waitForTimeout(600);
  await shot('01-home');
  await overflow('home');

  // 持ちネタ集
  await page.goto(BASE + '#mochineta');
  await page.waitForTimeout(400);
  await shot('02-lib', true);
  await overflow('lib');
  const n = await page.$$eval('.lib-item', els => els.length);
  if (n !== 24) errors.push('lib first page ' + n);
  await page.click('[data-act="libMore"]');
  await page.waitForTimeout(200);
  const nm = await page.$$eval('.lib-item', els => els.length);
  if (nm !== 48) errors.push('lib more ' + nm);
  await page.click('[data-act="libD"][data-id="sns"]');
  await page.waitForTimeout(200);
  const n2 = await page.$$eval('.lib-item', els => els.length);
  if (n2 !== 12) errors.push('sns count ' + n2);
  await page.selectOption('#libY', 'satori');
  await page.waitForTimeout(200);
  const n3 = await page.$$eval('.lib-item', els => els.length);
  if (n3 !== 1) errors.push('sns+satori count ' + n3);
  await page.click('.lib-item');
  await page.waitForTimeout(400);
  await shot('03-lib-sheet');
  await page.click('.lib-nav [data-act="libOpen"]:last-child');
  await page.waitForTimeout(300);
  // 上演（オート）
  await page.click('[data-act="libPlay"]');
  await page.waitForTimeout(2900);
  await page.click('#stAuto');
  await page.waitForTimeout(500);
  let sawTelop = false;
  const t0 = Date.now();
  for (let i = 0; i < 240; i++) {
    if (await page.$('.bubble.k-telop')) { sawTelop = true; await page.waitForTimeout(400); await shot('04-telop'); break; }
    await page.waitForTimeout(400);
  }
  if (!sawTelop) errors.push('telop never shown (auto)');
  let ended = false;
  for (let i = 0; i < 60; i++) { if ((await page.textContent('#stNext').catch(() => '')) === '閉じる') { ended = true; break; } await page.waitForTimeout(400); }
  console.log('auto show took', Math.round((Date.now() - t0) / 1000), 's');
  if (!ended) errors.push('auto did not end');
  await page.click('#stAuto');
  await page.click('#stNext');
  await page.waitForTimeout(400);

  // ネタ表のマス → 自分の漫才にする
  await page.goto(BASE + '#mochineta');
  await page.waitForTimeout(300);
  await page.click('.neta-table .cell[data-id="kudan-work"]');
  await page.waitForTimeout(300);
  await page.click('[data-act="libMine"]');
  await page.waitForTimeout(400);
  if ((await page.evaluate(() => location.hash)) !== '#manzai') errors.push('libMine no manzai');
  await page.click('[data-act="mzEmotion"][data-id="fuan"]');
  await page.click('#mzNextBtn');
  const th = await page.inputValue('#thought');
  if (th !== '明日の面接、絶対に失敗する') errors.push('libMine prefill ' + th);
  // ピッカー
  await page.click('[data-act="pickNeta"]');
  await page.waitForTimeout(300);
  await page.click('[data-act="pickD"][data-id="love"]');
  await page.waitForTimeout(200);
  await shot('05-picker');
  await page.click('.pick-item');
  await page.waitForTimeout(300);
  const th2 = await page.inputValue('#thought');
  if (!th2) errors.push('pick empty');
  await page.click('#mzNextBtn');
  await page.click('.yk-pick');
  await page.click('#mzNextBtn');
  await page.click('[data-act="kouzaGroup"][data-g="bangumi"]');
  await page.click('[data-act="kouzaFx"][data-fx="telop"]');
  await page.waitForTimeout(500);
  await shot('06-kouza-telop');
  await page.click('#mzNextBtn');
  await page.click('.tk-head');
  await page.fill('.tk-body textarea', 'テストの答え');
  await page.click('#mzNextBtn');
  await page.fill('#newThought', 'テストの言い直し');
  await page.click('#mzNextBtn');
  await page.waitForTimeout(2900);
  for (let i = 0; i < 40; i++) {
    const t = await page.textContent('#stNext').catch(() => null);
    if (t === null) break;
    if (t === '感想へ') { await page.waitForTimeout(500); await page.click('#stNext'); break; }
    await page.click('#stNext'); await page.waitForTimeout(80);
  }
  await page.waitForTimeout(300);
  await page.click('.belief-fold summary');
  await page.click('[data-act="mzBelief"][data-id="unlovable"]');
  await shot('07-rate-belief', true);
  await page.click('[data-act="mzSave"]');
  await page.waitForTimeout(1200);
  await shot('08-rank-kojo');
  const kojo = await page.$('.kojo');
  if (!kojo) errors.push('kojo not shown (xp should pass 20)');
  else await page.click('.kojo [data-act="closeSheet"]');

  // ネタ帳（日誌と奥にあるもの）
  await page.goto(BASE + '#neta');
  await page.waitForTimeout(300);
  await shot('09-neta', true);
  if (!(await page.$('.journal'))) errors.push('journal missing');
  if (!(await page.$('.belief-sum'))) errors.push('belief summary missing');

  // 図鑑の持ちネタ
  await page.goto(BASE + '#zukan');
  await page.waitForTimeout(300);
  await page.click('[data-act="zukanOpen"][data-id="satori"]');
  await page.waitForTimeout(300);
  const zl = await page.$$eval('.zk-detail .pick-item', e => e.length);
  if (zl !== 8) errors.push('zukan neta ' + zl);
  await page.click('.zk-detail .pick-item');
  await page.waitForTimeout(300);
  await shot('10-zukan-lib');

  // 文字の大きさ
  await page.goto(BASE + '#gakuya');
  await page.waitForTimeout(300);
  await page.click('input[name="gFont"][value="large"]', { force: true });
  await page.waitForTimeout(200);
  const large = await page.evaluate(() => document.documentElement.classList.contains('fs-large'));
  if (!large) errors.push('font large not applied');
  await page.goto(BASE + '#home');
  await page.waitForTimeout(300);
  await shot('11-home-large');
  await overflow('home-large');
  await page.goto(BASE + '#mochineta');
  await page.waitForTimeout(300);
  await overflow('lib-large');

  // 320px ダーク
  const d = await browser.newContext({ viewport: { width: 320, height: 640 }, colorScheme: 'dark' });
  const dp = await d.newPage();
  dp.on('pageerror', e => errors.push('dark pageerror: ' + e.message));
  await dp.goto(BASE);
  await dp.waitForTimeout(600);
  await dp.click('[data-act="introStart"]');
  for (const v of ['home', 'mochineta', 'neta', 'gakuya']) {
    await dp.goto(BASE + '#' + v); await dp.waitForTimeout(250);
    const w = await dp.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    if (w[0] > w[1]) errors.push('320 ' + v + ' overflow ' + w.join('>'));
  }
  await dp.goto(BASE + '#home');
  await dp.waitForTimeout(250);
  await dp.screenshot({ path: path.join(OUT, 't-12-home-dark-320.png'), fullPage: true });
  await dp.goto(BASE + '#mochineta');
  await dp.waitForTimeout(250);
  await dp.screenshot({ path: path.join(OUT, 't-13-lib-dark-320.png') });

  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO ERRORS');
  await browser.close();
})();
