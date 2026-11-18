// 第四回の機能の E2E：福さがし・ながめ席の新演目・おまかせ・あなたに合う演目
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
  await ctx.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { new MutationObserver(() => { const b = document.querySelector('.kojo [data-act="closeSheet"]'); if (b) setTimeout(() => b.click(), 50); const l = document.querySelector('#legend-root [data-act="legendOk"]'); if (l && !l.dataset.t) { l.dataset.t = 1; setTimeout(() => l.click(), 80); } }).observe(document.body, { childList: true, subtree: true }); }); });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  const shot = (n, full) => page.screenshot({ path: path.join(OUT, 'f-' + n + '.png'), fullPage: !!full });
  const overflow = async label => {
    const w = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    if (w[0] > w[1]) errors.push(label + ' overflow ' + w.join('>'));
  };

  await page.clock.setFixedTime(new Date('2026-11-05T13:00:00'));
  await page.goto(BASE);
  await page.waitForTimeout(700);
  await page.click('[data-act="introStart"]');
  await page.waitForTimeout(300);
  await shot('01-home', true);
  if (await page.$('a[href="#yogen"]')) errors.push('yogen link still on home');
  const yogenTab = await page.$('[data-tab="yogen"]');
  if (yogenTab) errors.push('yogen tab still present');

  // 福さがし
  await page.goto(BASE + '#fuku');
  await page.waitForTimeout(300);
  await shot('02-fuku', true);
  await overflow('fuku');
  const odai1 = await page.textContent('.odai-t');
  await page.fill('#findNote', '駅の赤いポスト');
  await page.click('form[data-form="fukuFind"] button[type="submit"]');
  await page.waitForTimeout(300);
  const fc = await page.textContent('.find-count');
  if (!fc.includes('1')) errors.push('find count ' + fc);
  await page.click('[data-act="fukuOdaiNext"]');
  await page.waitForTimeout(200);
  const odai2 = await page.textContent('.odai-t');
  if (odai1 === odai2) errors.push('odai did not change');
  await page.click('[data-act="fukuEx"][data-i="1"]');
  await page.fill('#good1', '同僚に「ありがとう」と言われた');
  await page.click('form[data-form="fukuGood"] button[type="submit"]');
  await page.waitForTimeout(400);
  const goods = await page.$$eval('.good-list li', e => e.length);
  if (goods !== 2) errors.push('goods ' + goods);
  await page.click('[data-act="fukuSavor"]');
  await page.waitForTimeout(300);
  await page.click('#savorBtn');
  await page.waitForTimeout(5200);
  await shot('03-savor');
  await page.waitForTimeout(16000);
  const savored = await page.$('.sheet .yg-result');
  if (!savored) errors.push('savor did not finish');
  await page.click('[data-act="closeAndRender"]');
  await page.waitForTimeout(300);
  await page.fill('#good0', '夕焼けがきれいだった');
  await page.click('form[data-form="fukuGood"] button[type="submit"]');
  await page.waitForTimeout(400);
  await page.click('[data-act="fukuBiki"]');
  await page.waitForTimeout(300);
  await shot('04-fukubiki');
  if (!(await page.$('.savor'))) errors.push('fukubiki no savor');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await shot('05-fuku-after', true);

  // ながめ席の入口
  await page.goto(BASE + '#nagame');
  await page.waitForTimeout(300);
  await shot('06-nagame', true);
  await overflow('nagame');
  const shelves = await page.$$eval('.shelf', e => e.length);
  if (shelves !== 4) errors.push('shelves ' + shelves);
  const cards = await page.$$eval('.ng-card', e => e.length);
  if (cards !== 10) errors.push('practice cards ' + cards);

  // 一服
  await page.click('[data-act="ngOpen"][data-id="ippuku"]');
  await page.waitForTimeout(300);
  await page.click('form[data-form="ngStart"] button[type="submit"]');
  await page.waitForTimeout(700);
  await page.click('#gNext'); await page.click('#gNext');
  await page.waitForTimeout(600);
  await shot('07-ippuku');
  for (let i = 0; i < 3; i++) { await page.click('#gNext'); await page.waitForTimeout(200); }
  await page.waitForTimeout(300);
  await page.$eval('#ngAfter', el => { el.value = 2; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.click('[data-act="ngSave"]');
  await page.waitForTimeout(400);
  await page.click('.sheet [data-act="closeSheet"].btn');
  await page.waitForTimeout(300);

  // ぎゅっとふわっ
  await page.click('[data-act="ngOpen"][data-id="gyuto"]');
  await page.waitForTimeout(300);
  await page.click('form[data-form="ngStart"] button[type="submit"]');
  await page.waitForTimeout(1500);
  await shot('08-gyuto-gyu');
  await page.waitForTimeout(4500);
  await shot('09-gyuto-fuwa');
  for (let i = 0; i < 5; i++) { await page.click('#gNext'); await page.waitForTimeout(200); }
  await page.waitForTimeout(300);
  await page.$eval('#ngAfter', el => { el.value = 3; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.click('[data-act="ngSave"]');
  await page.waitForTimeout(400);
  await page.click('.sheet [data-act="closeSheet"].btn');
  await page.waitForTimeout(300);

  // お囃子の聞き分け
  await page.click('[data-act="ngOpen"][data-id="ohayashi"]');
  await page.waitForTimeout(300);
  await page.click('form[data-form="ngStart"] button[type="submit"]');
  await page.waitForTimeout(1200);
  await shot('10-ohayashi');
  const on1 = await page.$$eval('.inst.on', e => e.map(x => x.dataset.inst));
  if (on1.join() !== 'taiko') errors.push('focus taiko ' + on1);
  for (let i = 0; i < 4; i++) { await page.click('#gNext'); await page.waitForTimeout(250); }
  await page.waitForTimeout(4500);
  const sw = await page.$$eval('.inst.on', e => e.length);
  if (sw !== 1) errors.push('switch focus count ' + sw);
  await page.click('#gNext');
  await page.waitForTimeout(400);
  const all = await page.$$eval('.inst.on', e => e.length);
  if (all !== 4) errors.push('all focus ' + all);
  await shot('11-ohayashi-all');
  await page.click('#gNext');
  await page.waitForTimeout(400);
  await page.click('[data-act="ngSave"]');
  await page.waitForTimeout(400);
  await page.click('.sheet [data-act="closeSheet"].btn');
  await page.waitForTimeout(300);

  // おまかせ（寝る前 → おやすみ席：ぎゅっとふわっ → ハラに灯す）
  await page.click('[data-act="ngState"][data-id="nemuri"]');
  await page.waitForTimeout(300);
  await shot('12-omakase-card');
  await page.click('[data-act="ngOmakase"]');
  await page.waitForTimeout(300);
  await shot('13-omakase-sheet');
  await page.click('form[data-form="ngStartSet"] button[type="submit"]');
  await page.waitForTimeout(600);
  const t1 = await page.textContent('.calm-title');
  if (!t1.includes('おやすみ席')) errors.push('set title ' + t1);
  for (let i = 0; i < 5; i++) { await page.click('#gNext'); await page.waitForTimeout(200); }
  await page.waitForTimeout(400);
  await shot('14-inter');
  if (!(await page.$('.calm-inter'))) errors.push('no interstitial');
  await page.waitForTimeout(5600);
  const t2 = await page.textContent('.calm-title');
  if (!t2.includes('エレベーター')) errors.push('auto next part ' + t2);
  await page.waitForTimeout(1500);
  await page.click('[data-act="ngEnd"]');
  await page.waitForTimeout(400);
  await shot('15-set-end');
  const done = await page.$$eval('.set-done li', e => e.length);
  if (done !== 2) errors.push('set parts ' + done);
  await page.$eval('#ngAfter', el => { el.value = 1; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.click('[data-act="ngSave"]');
  await page.waitForTimeout(400);
  await page.click('.sheet [data-act="closeSheet"].btn');
  await page.waitForTimeout(300);

  // もう一度一服して、「あなたに合う演目」が出るか
  await page.click('[data-act="ngOpen"][data-id="ippuku"]');
  await page.waitForTimeout(300);
  await page.click('form[data-form="ngStart"] button[type="submit"]');
  await page.waitForTimeout(500);
  await page.click('[data-act="ngEnd"]');
  await page.waitForTimeout(300);
  await page.$eval('#ngAfter', el => { el.value = 1; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.click('[data-act="ngSave"]');
  await page.waitForTimeout(400);
  await page.click('.sheet [data-act="closeSheet"].btn');
  await page.waitForTimeout(300);
  await shot('16-nagame-fit', true);
  const fit = await page.$('.fit');
  if (!fit) errors.push('fit not shown');
  else { const ft = await fit.textContent(); if (!ft.includes('一服')) errors.push('fit text ' + ft); }

  // 図鑑の福の棚
  await page.goto(BASE + '#zukan');
  await page.waitForTimeout(300);
  await page.click('[data-act="zukanOpen"][data-id="zashiki"]');
  await page.waitForTimeout(300);
  await shot('17-zukan-zashiki');

  // ネタ帳の日誌
  await page.goto(BASE + '#neta');
  await page.waitForTimeout(300);
  const jt = await page.textContent('.journal');
  if (!jt.includes('福')) errors.push('journal no fuku');

  // 狭い画面・ダーク
  const d = await browser.newContext({ viewport: { width: 320, height: 640 }, colorScheme: 'dark' });
  const dp = await d.newPage();
  dp.on('pageerror', e => errors.push('dark pageerror: ' + e.message));
  await dp.goto(BASE);
  await dp.waitForTimeout(600);
  await dp.click('[data-act="introStart"]');
  for (const v of ['home', 'fuku', 'nagame', 'zukan']) {
    await dp.goto(BASE + '#' + v); await dp.waitForTimeout(250);
    const w = await dp.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    if (w[0] > w[1]) errors.push('320 ' + v + ' overflow ' + w.join('>'));
  }
  await dp.goto(BASE + '#fuku');
  await dp.waitForTimeout(250);
  await dp.screenshot({ path: path.join(OUT, 'f-18-fuku-dark-320.png'), fullPage: true });
  await dp.goto(BASE + '#nagame');
  await dp.waitForTimeout(250);
  await dp.click('[data-act="ngOpen"][data-id="ohayashi"]');
  await dp.waitForTimeout(300);
  await dp.click('form[data-form="ngStart"] button[type="submit"]');
  await dp.waitForTimeout(800);
  await dp.screenshot({ path: path.join(OUT, 'f-19-ohayashi-320.png') });

  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO ERRORS');
  await browser.close();
})();
