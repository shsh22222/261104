// 第五回の機能の E2E：夜の福日記・息といのち・伝説と金色・大喜利・時間帯の入口
const { chromium } = require('playwright');
const path = require('path');
const OUT = require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:8765/index.html';
const KEY = 'kokoro-yose.v1';

(async () => {
  const browser = await chromium.launch();
  // 第八回：旧テストは「細かく（スライダー）」の記録で動かす
  { const _nc = browser.newContext.bind(browser); browser.newContext = async o => { const c = await _nc(o); await c.addInitScript(() => { try { const K = 'kokoro-yose.v1'; if (!localStorage.getItem(K)) localStorage.setItem(K, JSON.stringify({ v: 1, profile: { measure: 'slider' } })); } catch (e) { /* noop */ } }); return c; }; }
  const errors = [];
  const watch = (p, tag) => {
    p.on('console', m => { if (m.type() === 'error') errors.push(tag + ' console: ' + m.text()); });
    p.on('pageerror', e => errors.push(tag + ' pageerror: ' + e.message));
  };
  const overflow = async (p, label) => {
    const w = await p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    if (w[0] > w[1]) errors.push(label + ' overflow ' + w.join('>'));
  };
  const dismissLegends = async p => {
    for (let i = 0; i < 12; i++) {
      const b = await p.$('#legend-root [data-act="legendOk"]');
      if (!b) { await p.waitForTimeout(500); if (!(await p.$('#legend-root [data-act="legendOk"]'))) break; continue; }
      await b.click(); await p.waitForTimeout(700);
    }
  };

  // ---- 夜（21時）：時間帯の入口と福日記 → おやすみ席 ----
  const night = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const np = await night.newPage();
  watch(np, 'night');
  await np.clock.setFixedTime(new Date('2026-11-05T21:00:00'));
  await np.goto(BASE);
  await np.waitForTimeout(700);
  await np.click('[data-act="introStart"]');
  await np.waitForTimeout(400);
  await np.screenshot({ path: path.join(OUT, 'v-01-home-night.png'), fullPage: true });
  if (!(await np.$('.time-night'))) errors.push('night card missing');
  await np.goto(BASE + '#fuku');
  await np.waitForTimeout(400);
  const first = await np.$eval('.nikki, .odai', el => el.className);
  if (!first.includes('nikki')) errors.push('night should show diary first: ' + first);
  await np.fill('#good0', 'みそ汁がおいしかった');
  await np.click('[data-act="fukuKiri"][data-line="0"][data-id="warai"]');
  const kq = await np.textContent('#kiriQ0');
  if (!kq.includes('笑った')) errors.push('kiri did not change: ' + kq);
  if ((await np.inputValue('#good0')) !== 'みそ汁がおいしかった') errors.push('kiri change cleared input');
  await np.click('.rewind summary');
  await np.click('[data-act="fukuRewind"][data-k="hiru"]');
  const rq = await np.$$eval('#rewindQ li', e => e.length);
  if (rq !== 3) errors.push('rewind questions ' + rq);
  await np.fill('#good1', '同僚が手伝ってくれた');
  await np.fill('#good2', 'ちゃんと定時で帰れた');
  await np.screenshot({ path: path.join(OUT, 'v-02-nikki.png'), fullPage: true });
  await np.click('form[data-form="fukuGood"] button[type="submit"]');
  await np.waitForTimeout(500);
  await np.screenshot({ path: path.join(OUT, 'v-03-nikki-saved.png') });
  if (!(await np.$('[data-act="fukuToBed"]'))) errors.push('to-bed offer missing');
  else {
    await np.click('[data-act="fukuToBed"]');
    await np.waitForTimeout(900);
    const sheetT = await np.$eval('.sheet-title', e => e.textContent).catch(() => '');
    if (!sheetT.includes('おやすみ席')) errors.push('omakase sheet not opened: ' + sheetT);
    await np.keyboard.press('Escape');
  }

  // ---- ながめ席：息といのち ----
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { new MutationObserver(() => { const b = document.querySelector('.kojo [data-act="closeSheet"]'); if (b) setTimeout(() => b.click(), 50); }).observe(document.body, { childList: true, subtree: true }); }); });
  const p = await ctx.newPage();
  watch(p, 'main');
  await p.goto(BASE);
  await p.waitForTimeout(700);
  await p.click('[data-act="introStart"]');
  await p.goto(BASE + '#nagame');
  await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(OUT, 'v-04-nagame.png'), fullPage: true });
  if ((await p.$$eval('.shelf', e => e.length)) !== 4) errors.push('shelves != 4');
  if ((await p.$$eval('.ng-card', e => e.length)) !== 10) errors.push('cards != 10');
  await overflow(p, 'nagame');

  await p.click('[data-act="ngOpen"][data-id="innerbody"]');
  await p.waitForTimeout(300);
  await p.click('form[data-form="ngStart"] button[type="submit"]');
  await p.waitForTimeout(600);
  for (let i = 0; i < 4; i++) { await p.click('#gNext'); await p.waitForTimeout(250); }
  await p.waitForTimeout(1500);
  await p.screenshot({ path: path.join(OUT, 'v-05-innerbody.png') });
  const lit = await p.$eval('#gFig', e => e.className);
  if (!lit.includes('lit-whole')) errors.push('innerbody lit ' + lit);
  await p.click('#gNext'); await p.waitForTimeout(250); await p.click('#gNext'); await p.waitForTimeout(400);
  await p.click('[data-act="ngSave"]'); await p.waitForTimeout(400);
  await p.click('.sheet [data-act="closeSheet"].btn'); await p.waitForTimeout(300);

  await p.click('[data-act="ngOpen"][data-id="imakoko"]');
  await p.waitForTimeout(300);
  await p.click('form[data-form="ngStart"] button[type="submit"]');
  await p.waitForTimeout(2500);
  await p.click('[data-act="ikBack"]'); await p.click('[data-act="ikBack"]');
  await p.waitForTimeout(3200);
  await p.screenshot({ path: path.join(OUT, 'v-06-imakoko.png') });
  if ((await p.textContent('#ikBack')).trim() !== '2') errors.push('ikBack count');
  await p.click('[data-act="ngEnd"]'); await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(OUT, 'v-07-imakoko-end.png') });
  await p.click('[data-act="ngSave"]'); await p.waitForTimeout(400);
  await p.click('.sheet [data-act="closeSheet"].btn'); await p.waitForTimeout(300);

  await p.click('[data-act="ngOpen"][data-id="elevator"]');
  await p.waitForTimeout(300);
  await p.click('form[data-form="ngStart"] button[type="submit"]');
  await p.waitForTimeout(800);
  await p.screenshot({ path: path.join(OUT, 'v-08-elevator-5f.png') });
  await p.waitForTimeout(20500);
  await p.screenshot({ path: path.join(OUT, 'v-09-elevator-down.png') });
  const fl = await p.$eval('#evCount', e => +e.textContent);
  if (!(fl >= 1)) errors.push('elevator no rounds ' + fl);
  await p.click('[data-act="ngEnd"]'); await p.waitForTimeout(300);
  await p.click('[data-act="ngSave"]'); await p.waitForTimeout(400);
  await p.click('.sheet [data-act="closeSheet"].btn'); await p.waitForTimeout(300);

  // ---- 大喜利：妖怪当て（全問正解 → 雷獣） ----
  await p.goto(BASE + '#ogiri');
  await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(OUT, 'v-10-ogiri.png'), fullPage: true });
  await overflow(p, 'ogiri');
  await p.click('[data-act="quizStart"]');
  await p.waitForTimeout(900);
  await p.screenshot({ path: path.join(OUT, 'v-11-quiz.png') });
  for (let i = 0; i < 10; i++) {
    await p.waitForSelector('#qChoices .q-choice:not([disabled])', { timeout: 5000 });
    const target = await p.evaluate(() => {
      const t = document.querySelector('#qBubble span').textContent.replace(/^「|」$/g, '');
      const n = window.KY_NETA.LIST.find(x => x.thought === t);
      const isTk = document.querySelector('#qChoices').classList.contains('tk');
      return isTk ? n.tk[0].id : n.y;
    });
    if (i === 3) await p.screenshot({ path: path.join(OUT, 'v-12-quiz-mid.png') });
    await p.click(`#qChoices .q-choice[data-id="${target}"]`);
    await p.waitForTimeout(1250);
  }
  await p.waitForTimeout(500);
  await p.screenshot({ path: path.join(OUT, 'v-13-quiz-result.png') });
  const grk = await p.textContent('.gr-k');
  if (!grk.includes('全問正解')) errors.push('quiz not perfect: ' + grk);
  await p.click('[data-act="gameQuit"]');
  await p.waitForTimeout(1400);
  await p.screenshot({ path: path.join(OUT, 'v-14-legend-raiju.png') });
  const legendName = await p.$eval('.legend-name', e => e.textContent).catch(() => '');
  if (!legendName.includes('雷獣')) errors.push('raiju legend not shown: ' + legendName);
  await dismissLegends(p);

  // ---- いまひろい ----
  await p.click('[data-act="hiroiStart"]');
  await p.waitForTimeout(3600);
  for (let k = 0; k < 12; k++) {
    await p.waitForTimeout(800);
    const ima = await p.$('#hArena .hb.ima:not(.picked)');
    if (ima) await ima.dispatchEvent('pointerdown').catch(() => {});
    if (k === 5) { const kg = await p.$('#hArena .hb.kangae:not(.grabbed)'); if (kg) await kg.dispatchEvent('pointerdown').catch(() => {}); await p.screenshot({ path: path.join(OUT, 'v-15-hiroi.png') }); }
  }
  await p.waitForTimeout(36000);
  await p.screenshot({ path: path.join(OUT, 'v-16-hiroi-result.png') });
  const hs = await p.$eval('.gr-stats', e => e.textContent).catch(() => '');
  if (!hs.includes('拾った')) errors.push('hiroi result missing');
  await p.click('[data-act="gameQuit"]');
  await p.waitForTimeout(600);

  // ---- 伝説と金色：条件を満たす記録を入れて、出現を確認 ----
  await p.evaluate(key => {
    const s = JSON.parse(localStorage.getItem(key));
    s.scripts.push({ id: 'x1', date: new Date().toISOString(), emotion: 'fuan', emoBefore: 70, emoAfter: 30, situation: '', thought: 'テスト', beliefBefore: 90, beliefAfter: 40, yokai: ['satori'], tk: [{ id: 'esper', a: 'a' }, { id: 'evidence', a: 'b' }, { id: 'friend', a: 'c' }], newThought: 'n' });
    ['nurikabe', 'itsumo', 'hitotsume', 'magure', 'satori', 'kudan', 'namazu', 'kagami', 'bekibouzu', 'karakasa', 'obariyon', 'noppera'].forEach(id => { s.yokai[id] = s.yokai[id] || { met: 1, friend: 1 }; s.yokai[id].met = Math.max(1, s.yokai[id].met); });
    s.yokai.satori.friend = 5;
    localStorage.setItem(key, JSON.stringify(s));
  }, KEY);
  await p.goto(BASE + '#zukan');
  await p.reload();
  await p.waitForTimeout(1600);
  const seen = [];
  for (let i = 0; i < 6; i++) {
    const nm = await p.$eval('.legend-name', e => e.textContent).catch(() => null);
    if (!nm) break;
    seen.push(nm);
    if (i === 0) await p.screenshot({ path: path.join(OUT, 'v-17-legend-first.png') });
    await p.click('#legend-root [data-act="legendOk"]');
    await p.waitForTimeout(900);
  }
  if (!seen.some(s => s.includes('サトリ'))) errors.push('golden satori not shown ' + seen.join('|'));
  if (!seen.some(s => s.includes('大天狗'))) errors.push('daitengu not shown ' + seen.join('|'));
  if (!seen.some(s => s.includes('白澤'))) errors.push('hakutaku not shown ' + seen.join('|'));
  await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(OUT, 'v-18-zukan.png'), fullPage: true });
  await overflow(p, 'zukan');
  await p.click('[data-act="zukanOpen"][data-id="baku"]');
  await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(OUT, 'v-19-legend-detail.png') });

  // ---- 朝（7時）・狭い画面・ダーク ----
  const morn = await browser.newContext({ viewport: { width: 320, height: 640 }, colorScheme: 'dark' });
  const mp = await morn.newPage();
  watch(mp, 'morning');
  await mp.clock.setFixedTime(new Date('2026-11-05T07:30:00'));
  await mp.goto(BASE);
  await mp.waitForTimeout(600);
  await mp.click('[data-act="introStart"]');
  await mp.waitForTimeout(300);
  if (!(await mp.$('.time-morning'))) errors.push('morning card missing');
  for (const v of ['home', 'fuku', 'nagame', 'ogiri', 'zukan']) {
    await mp.goto(BASE + '#' + v); await mp.waitForTimeout(300);
    const w = await mp.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    if (w[0] > w[1]) errors.push('320 ' + v + ' overflow ' + w.join('>'));
  }
  await mp.goto(BASE + '#home'); await mp.waitForTimeout(300);
  await mp.screenshot({ path: path.join(OUT, 'v-20-home-morning-320.png'), fullPage: true });
  await mp.goto(BASE + '#fuku'); await mp.waitForTimeout(300);
  const firstM = await mp.$eval('.nikki, .odai', el => el.className);
  if (!firstM.includes('odai')) errors.push('morning should show odai first');

  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO ERRORS');
  await browser.close();
})();
