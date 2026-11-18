// ながめ席の E2E
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
  const shot = (n, full) => page.screenshot({ path: path.join(OUT, 'n-' + n + '.png'), fullPage: !!full });
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

  // ながめ席
  await page.goto(BASE + '#nagame');
  await page.waitForTimeout(300);
  await page.click('#kizukiBtn');
  await page.click('#kizukiBtn');
  await page.click('[data-act="ngState"][data-id="moya"]');
  await page.waitForTimeout(300);
  await shot('02-hub', true);
  await overflow('hub');
  const k = await page.textContent('#kizukiToday');
  if (k.trim() !== '2') errors.push('kizuki count ' + k);

  // 灯籠ながし
  await page.click('[data-act="ngOpen"][data-id="toro"]');
  await page.waitForTimeout(300);
  await shot('03-toro-pre');
  await page.click('form[data-form="ngStart"] input[name="ngLen"][value="60"]', { force: true });
  await page.click('form[data-form="ngStart"] button[type="submit"]');
  await page.waitForTimeout(400);
  for (const l of ['心配', '未来', '反省会']) { await page.click(`[data-act="toroAdd"][data-label="${l}"]`); await page.waitForTimeout(700); }
  await page.fill('#toroText', 'メールの返事');
  await page.click('form[data-form="toroFree"] button[type="submit"]');
  await page.waitForTimeout(1500);
  await shot('04-toro-run');
  const toro = await page.$('.toro');
  if (toro) { await toro.click({ force: true }); await page.waitForTimeout(300); }
  await page.click('[data-act="ngEnd"]');
  await page.waitForTimeout(300);
  await page.$eval('#ngAfter', el => { el.value = 3; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await shot('05-toro-end');
  await page.click('[data-act="ngSave"]');
  await page.waitForTimeout(400);
  await shot('06-toro-result');
  await page.click('.sheet [data-act="closeSheet"].btn');
  await page.waitForTimeout(300);

  // 間をはかる
  await page.click('[data-act="ngOpen"][data-id="ma"]');
  await page.waitForTimeout(300);
  await page.click('form[data-form="ngStart"] button[type="submit"]');
  await page.waitForTimeout(400);
  await page.click('#maBtn');
  await page.waitForTimeout(1200);
  await shot('07-ma-wait');
  await page.click('#maBtn');
  await page.waitForTimeout(700);
  await shot('08-ma-came');
  for (let i = 0; i < 4; i++) { await page.click('#maBtn'); await page.waitForTimeout(500); await page.click('#maBtn'); await page.waitForTimeout(300); }
  await page.waitForTimeout(2800);
  await shot('09-ma-end');
  await page.click('[data-act="ngSave"]');
  await page.waitForTimeout(300);
  await page.click('.sheet [data-act="closeSheet"].btn');
  await page.waitForTimeout(300);

  // ハラに灯す
  await page.click('[data-act="ngOpen"][data-id="hara"]');
  await page.waitForTimeout(300);
  await shot('10-hara-pre');
  await page.click('form[data-form="ngStart"] button[type="submit"]');
  await page.waitForTimeout(800);
  await shot('11-hara-1');
  for (let i = 0; i < 4; i++) { await page.click('#gNext'); await page.waitForTimeout(300); }
  await page.waitForTimeout(2200);
  await shot('12-hara-5');
  await page.click('#gNext');
  await page.waitForTimeout(400);
  await page.click('[data-act="ngSave"]');
  await page.waitForTimeout(400);
  await shot('13-hara-result');
  await page.click('.sheet [data-act="closeSheet"].btn');
  await page.waitForTimeout(300);

  // 下足札
  await page.click('[data-act="ngOpen"][data-id="geso"]');
  await page.waitForTimeout(300);
  await page.click('[data-act="gesoChip"][data-t="仕事のこと"]');
  await page.click('form[data-form="gesoNew"] button[type="submit"]');
  await page.waitForTimeout(300);
  await shot('14-geso-fuda');
  await page.click('[data-act="closeAndRender"]');
  await page.waitForTimeout(300);
  await shot('15-hub-after', true);
  await page.click('[data-act="gesoBack"]');
  await page.waitForTimeout(300);
  await page.click('[data-act="gesoStill"]');
  await page.waitForTimeout(300);
  await shot('16-geso-still');
  await page.click('[data-act="gesoManzai"]');
  await page.waitForTimeout(400);
  const hash = await page.evaluate(() => location.hash);
  if (hash !== '#manzai') errors.push('geso→manzai hash ' + hash);
  await shot('17-manzai-feel');
  await page.click('[data-act="mzEmotion"][data-id="fuan"]');
  await page.click('#mzNextBtn');
  const prefill = await page.inputValue('#thought');
  if (prefill !== '仕事のこと') errors.push('prefill ' + prefill);
  await page.fill('#thought', 'なんとなく不安で、ずっと考えてしまう');
  await page.click('#mzNextBtn');
  await page.waitForTimeout(300);
  await shot('18-kantei-vague');
  if (!(await page.$('.vague-hint'))) errors.push('vague hint missing');

  // 図鑑
  await page.goto(BASE + '#zukan');
  await page.waitForTimeout(300);
  await shot('19-zukan', true);
  await overflow('zukan');
  await page.click('[data-act="zukanOpen"][data-id="enenra"]');
  await page.waitForTimeout(400);
  await shot('20-zukan-enenra');

  // ダーク・狭い画面
  const d = await browser.newContext({ viewport: { width: 320, height: 640 }, colorScheme: 'dark' });
  const dp = await d.newPage();
  dp.on('pageerror', e => errors.push('dark pageerror: ' + e.message));
  await dp.goto(BASE);
  await dp.waitForTimeout(600);
  await dp.click('[data-act="introStart"]');
  await dp.goto(BASE + '#nagame');
  await dp.waitForTimeout(300);
  await dp.screenshot({ path: path.join(OUT, 'n-21-hub-dark-320.png'), fullPage: true });
  for (const v of ['home', 'nagame', 'zukan']) {
    await dp.goto(BASE + '#' + v); await dp.waitForTimeout(200);
    const w = await dp.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    if (w[0] > w[1]) errors.push('320 ' + v + ' overflow ' + w.join('>'));
  }
  await dp.goto(BASE + '#nagame');
  await dp.waitForTimeout(200);
  await dp.click('[data-act="ngOpen"][data-id="hara"]');
  await dp.waitForTimeout(300);
  await dp.click('form[data-form="ngStart"] input[name="ngMode"][value="outside"]', { force: true });
  await dp.click('form[data-form="ngStart"] button[type="submit"]');
  await dp.waitForTimeout(700);
  await dp.screenshot({ path: path.join(OUT, 'n-22-hara-320.png') });

  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO ERRORS');
  await browser.close();
})();
