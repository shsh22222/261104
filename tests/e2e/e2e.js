// ココロ寄席 E2E：主要な流れを通しで操作し、エラーとスクリーンショットを集める
const { chromium } = require('playwright');
const path = require('path');
const OUT = require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || 'http://127.0.0.1:8765/index.html';

(async () => {
  const browser = await chromium.launch();
  // 第八回：旧テストは「細かく（スライダー）」の記録で動かす
  { const _nc = browser.newContext.bind(browser); browser.newContext = async o => { const c = await _nc(o); await c.addInitScript(() => { try { const K = 'kokoro-yose.v1'; if (!localStorage.getItem(K)) localStorage.setItem(K, JSON.stringify({ v: 1, profile: { measure: 'slider' } })); } catch (e) { /* noop */ } }); return c; }; }
  const errors = [];
  async function newPage(scheme) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: scheme, hasTouch: true });
    await ctx.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { new MutationObserver(() => { const b = document.querySelector('.kojo [data-act="closeSheet"]'); if (b) setTimeout(() => b.click(), 50); const l = document.querySelector('#legend-root [data-act="legendOk"]'); if (l && !l.dataset.t) { l.dataset.t = 1; setTimeout(() => l.click(), 80); } }).observe(document.body, { childList: true, subtree: true }); }); });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') errors.push(scheme + ' console: ' + m.text()); });
    page.on('pageerror', e => errors.push(scheme + ' pageerror: ' + e.message));
    return page;
  }
  const shot = async (page, name) => page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: false });
  const shotFull = async (page, name) => page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true });
  const overflow = async (page, label) => {
    const w = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    if (w[0] > w[1]) errors.push(label + ' horizontal overflow ' + w.join('>'));
  };

  const page = await newPage('light');
  await page.clock.setFixedTime(new Date('2026-11-05T13:00:00'));
  await page.goto(BASE);
  await page.waitForTimeout(900);
  await shot(page, '01-intro');
  // 見本の漫才
  await page.click('[data-act="introSample"]');
  await page.waitForTimeout(2800);
  await shot(page, '02-stage-open');
  for (let i = 0; i < 6; i++) { await page.click('#stNext'); await page.waitForTimeout(250); }
  await page.waitForTimeout(200);
  await shot(page, '03-stage-tsukkomi');
  for (let i = 0; i < 30; i++) {
    const t = await page.textContent('#stNext').catch(() => null);
    if (t === null) break;
    if (t === '閉じる') { await page.waitForTimeout(1300); await shot(page, '04-stage-oiri'); await page.click('#stNext'); break; }
    await page.click('#stNext'); await page.waitForTimeout(120);
  }
  await page.waitForTimeout(300);
  await shotFull(page, '05-home');
  await overflow(page, 'home');

  // 妖怪漫才
  await page.click('[data-act="startManzai"]');
  await page.waitForTimeout(300);
  await page.click('[data-act="mzEmotion"][data-id="fuan"]');
  await shot(page, '06-feel');
  await page.click('#mzNextBtn');
  await page.fill('#situation', '明日、会議で発表する');
  await page.fill('#thought', 'どうせ失敗して、みんなに呆れられるに決まってる');
  await shot(page, '07-boke');
  await page.click('#mzNextBtn');
  await page.waitForTimeout(200);
  await shotFull(page, '08-kantei');
  await page.click('[data-act="mzYokai"][data-id="kudan"]');
  await page.click('[data-act="mzYokai"][data-id="satori"]');
  await page.click('#mzNextBtn');
  await page.click('[data-act="kouzaFx"][data-fx="helium"]');
  await page.waitForTimeout(300);
  await shot(page, '09-kouza');
  await page.click('#mzNextBtn');
  await page.click('[data-act="tkToggle"][data-id="worst"]');
  await page.fill('#tk-worst', '最悪：言葉につまる／最高：案が通る／いちばんありそう：質問がいくつか来る');
  await page.click('[data-act="tkToggle"][data-id="esper"]');
  await page.fill('#tk-esper', '呆れられたことは確かめていない。前回はうなずいてもらえた。');
  await shot(page, '10-tsukkomi');
  await page.click('#mzNextBtn');
  await page.click('[data-act="mzStem"][data-i="0"]');
  await page.type('#newThought', 'つまっても、言いたいことは伝わる。');
  await shot(page, '11-iinaoshi');
  await page.click('#mzNextBtn');
  await page.waitForTimeout(2700);
  for (let i = 0; i < 40; i++) {
    const t = await page.textContent('#stNext').catch(() => null);
    if (t === null) break;
    if (t === '感想へ') { await page.waitForTimeout(800); await page.click('#stNext'); break; }
    await page.click('#stNext'); await page.waitForTimeout(80);
  }
  await page.waitForTimeout(300);
  await page.fill('#beliefAfter', '40').catch(() => {});
  await page.$eval('#beliefAfter', el => { el.value = 40; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.$eval('#emoAfter', el => { el.value = 35; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await shot(page, '12-rate');
  await page.click('[data-act="mzSave"]');
  await page.waitForTimeout(400);
  await shotFull(page, '13-done');
  await overflow(page, 'done');

  // 図鑑
  await page.goto(BASE + '#zukan');
  await page.waitForTimeout(300);
  await shotFull(page, '14-zukan');
  await overflow(page, 'zukan');
  await page.click('[data-act="zukanOpen"][data-id="kudan"]');
  await page.waitForTimeout(400);
  await shot(page, '15-zukan-detail');
  await page.keyboard.press('Escape');

  // 福さがし（予言くだんの後継）
  await page.goto(BASE + '#fuku');
  await page.waitForTimeout(300);
  await page.click('form[data-form="fukuFind"] button[type="submit"]');
  await page.waitForTimeout(400);
  await page.fill('#good0', 'お茶がおいしかった');
  await page.click('form[data-form="fukuGood"] button[type="submit"]');
  await page.waitForTimeout(400);
  await shotFull(page, '18-fuku');
  await overflow(page, 'fuku');

  // おみくじ
  await page.goto(BASE + '#omikuji');
  await page.waitForTimeout(300);
  await shotFull(page, '19-omikuji');
  await page.click('button.btn[data-act="mkDraw"]');
  await page.waitForTimeout(1700);
  await shotFull(page, '20-omikuji-drawn');
  await overflow(page, 'omikuji');
  await page.click('[data-act="mkGo"]');
  await page.waitForTimeout(5600);
  await page.click('[data-act="mkDone"]');
  await page.waitForTimeout(300);
  await page.$eval('#mkAct', el => { el.value = 7; el.dispatchEvent(new Event('input', { bubbles: true })); }).catch(() => {}); // 凶（休む）には数字がない
  await page.click('form[data-form="mkDone"] button[type="submit"]');
  await page.waitForTimeout(300);
  await shot(page, '21-omikuji-result');

  // ネタ帳・楽屋・休憩所
  await page.goto(BASE + '#neta');
  await page.waitForTimeout(300);
  await shotFull(page, '22-neta');
  await page.goto(BASE + '#gakuya');
  await page.waitForTimeout(300);
  await shotFull(page, '23-gakuya');
  await page.click('.sos-btn');
  await page.waitForTimeout(400);
  await shot(page, '24-sos');
  await page.keyboard.press('Escape');

  // 安全：危険な言葉
  await page.goto(BASE + '#home');
  await page.waitForTimeout(200);
  await page.click('[data-act="startManzai"]');
  await page.click('[data-act="mzEmotion"][data-id="ochikomi"]');
  await page.click('#mzNextBtn');
  await page.fill('#thought', 'もう消えたい');
  await page.click('#mzNextBtn');
  await page.waitForTimeout(400);
  await shot(page, '25-risk');
  const riskShown = await page.$('.risk');
  if (!riskShown) errors.push('risk sheet not shown');

  // ダーク
  const dark = await newPage('dark');
  await dark.goto(BASE);
  await dark.waitForTimeout(700);
  await dark.click('[data-act="introStart"]');
  await dark.waitForTimeout(300);
  await shotFull(dark, '26-home-dark');
  await dark.goto(BASE + '#zukan');
  await dark.waitForTimeout(300);
  await shot(dark, '27-zukan-dark');
  await overflow(dark, 'dark-zukan');

  // 狭い画面
  const narrow = await browser.newContext({ viewport: { width: 320, height: 640 }, colorScheme: 'light' });
  const np = await narrow.newPage();
  np.on('pageerror', e => errors.push('narrow pageerror: ' + e.message));
  await np.goto(BASE);
  await np.waitForTimeout(600);
  await np.click('[data-act="introStart"]');
  for (const v of ['home', 'zukan', 'fuku', 'omikuji', 'neta', 'gakuya', 'nagame']) {
    await np.goto(BASE + '#' + v); await np.waitForTimeout(200);
    const w = await np.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    if (w[0] > w[1]) errors.push('narrow ' + v + ' overflow ' + w.join('>'));
  }
  await np.screenshot({ path: path.join(OUT, '28-narrow-home.png') });

  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO ERRORS');
  await browser.close();
})();
