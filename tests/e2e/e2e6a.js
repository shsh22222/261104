// 第六回 E2E (a)：大喜利の入口・事実か考えか・段位・言い直し・いまひろい（いろなし・福・増える考え）・見分けの星
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
  const notes = [];
  const watch = (p, tag) => {
    p.on('console', m => { if (m.type() === 'error') errors.push(tag + ' console: ' + m.text()); });
    p.on('pageerror', e => errors.push(tag + ' pageerror: ' + e.message));
  };
  const overflow = async (p, label) => {
    const w = await p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    if (w[0] > w[1]) errors.push(label + ' overflow ' + w.join('>'));
  };
  const autoDismiss = () => { document.addEventListener('DOMContentLoaded', () => { new MutationObserver(() => { const b = document.querySelector('.kojo [data-act="closeSheet"]'); if (b) setTimeout(() => b.click(), 50); const l = document.querySelector('#legend-root [data-act="legendOk"]'); if (l && !window.__keepLegend) setTimeout(() => l.click(), 300); }).observe(document.body, { childList: true, subtree: true }); }); };

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.addInitScript(autoDismiss);
  const p = await ctx.newPage();
  watch(p, 'main');
  await p.clock.setFixedTime(new Date('2026-11-05T13:00:00'));
  await p.goto(BASE);
  await p.waitForTimeout(700);
  await p.click('[data-act="introStart"]');
  await p.goto(BASE + '#ogiri');
  await p.waitForTimeout(500);

  // ---- 入口 ----
  await p.screenshot({ path: path.join(OUT, 'w-01-ogiri.png'), fullPage: true });
  await overflow(p, 'ogiri');
  if (!(await p.$('.run-card [data-act="runStart"][data-daily="1"]'))) errors.push('daily run button missing');
  const lv = await p.$$eval('.lv', es => es.map(e => [e.dataset.level, e.disabled]));
  if (JSON.stringify(lv) !== JSON.stringify([['zenza', false], ['shinuchi', true], ['meijin', true]])) errors.push('levels ' + JSON.stringify(lv));
  if ((await p.$$eval('.eye-item', e => e.length)) !== 12) errors.push('eye items != 12');
  if ((await p.$$eval('.legend-hint', e => e.length)) !== 2) errors.push('legend hints != 2');
  if (await p.$('.gc-focus')) errors.push('focus button should be hidden before any play');

  // ---- 事実か考えか ----
  await p.click('[data-act="sortStart"]');
  await p.waitForTimeout(700);
  // 最初の1枚はスワイプ（マウスで左右にドラッグ）
  {
    await p.waitForSelector('#sCard.in');
    const t = await p.textContent('#sCard');
    const isFact = await p.evaluate(t => window.KY_DATA.GAME.facts.includes(t), t);
    const box = await p.$eval('#sCard', e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await p.mouse.move(box.x, box.y); await p.mouse.down();
    await p.mouse.move(box.x + (isFact ? -60 : 60), box.y, { steps: 4 });
    await p.mouse.move(box.x + (isFact ? -140 : 140), box.y, { steps: 4 });
    await p.mouse.up();
    await p.waitForTimeout(150);
    const fb = await p.$eval('#sFb', e => e.className);
    if (!fb.includes('good')) errors.push('swipe sort not judged good: ' + fb);
  }
  let sorted = 0, wrongDone = false;
  for (let k = 0; k < 400; k++) {
    if (await p.$('.game-result')) break;
    const c = await p.$('#sCard.in:not(.out-left):not(.out-right)');
    if (!c) { await p.waitForTimeout(60); continue; }
    const t = await c.textContent();
    if (!t) { await p.waitForTimeout(60); continue; }
    const isFact = await p.evaluate(t => window.KY_DATA.GAME.facts.includes(t), t);
    let key = isFact ? 'ArrowLeft' : 'ArrowRight';
    if (sorted === 6 && !wrongDone) { key = isFact ? 'ArrowRight' : 'ArrowLeft'; wrongDone = true; }
    if (sorted % 2) await p.keyboard.press(key);
    else await p.click(key === 'ArrowLeft' ? '.sort-btn.fact' : '.sort-btn.thought').catch(() => {});
    sorted++;
    if (sorted === 3) await p.screenshot({ path: path.join(OUT, 'w-02-sort.png') });
    if (wrongDone && sorted === 7) { await p.waitForTimeout(200); await p.screenshot({ path: path.join(OUT, 'w-03-sort-wrong.png') }); const fbt = await p.textContent('#sFb'); if (!/事実|考え/.test(fbt)) errors.push('sort wrong feedback: ' + fbt); }
    await p.waitForTimeout(120);
  }
  await p.waitForSelector('.game-result', { timeout: 45000 });
  await p.screenshot({ path: path.join(OUT, 'w-04-sort-result.png') });
  const sortStats = await p.textContent('.gr-stats');
  notes.push('sort: ' + sortStats.replace(/\s+/g, ' ') + ' score ' + (await p.textContent('.gr-score')));
  if (!sortStats.includes('仕分けた')) errors.push('sort result missing');
  await p.click('[data-act="gameQuit"]');
  await p.waitForTimeout(400);

  // ---- 妖怪当て・前座（わざと1問まちがえて「次へ」） ----
  const answerQ = async (wrong) => {
    await p.waitForSelector('#qChoices .q-choice:not([disabled])', { timeout: 15000 });
    const q = await p.evaluate(() => {
      const t = document.querySelector('#qBubble span').textContent.replace(/^「|」$/g, '');
      const n = window.KY_NETA.LIST.find(x => x.thought === t);
      const ids = [...document.querySelectorAll('#qChoices .q-choice')].map(b => b.dataset.id);
      const isRe = !!document.querySelector('#qChoices .q-choice-re');
      const isTk = !isRe && document.querySelector('#qChoices').classList.contains('tk');
      const ans = isRe ? 'ok' : isTk ? n.tk[0].id : n.y;
      const conf = (!isRe && !isTk) ? (window.KY_DATA.GAME.confuse[n.y] || []).filter(id => ids.includes(id)).length : 0;
      return { ans, ids, kind: isRe ? 're' : isTk ? 'tk' : 'yokai', conf };
    });
    const pick = wrong ? q.ids.find(i => i !== q.ans) : q.ans;
    await p.click(`#qChoices .q-choice[data-id="${pick}"]`);
    return q;
  };
  await p.click('.lv[data-level="zenza"]');
  await p.waitForTimeout(900);
  for (let i = 0; i < 10; i++) {
    const q = await answerQ(i === 2);
    if (i === 2) {
      await p.waitForSelector('#qFb .btn', { timeout: 3000 });
      await p.screenshot({ path: path.join(OUT, 'w-05-quiz-wrong.png') });
      const fb = await p.textContent('#qFb');
      if (!fb.includes('正解は') && !fb.includes('言い直し')) errors.push('wrong feedback ' + fb);
      await p.click('#qFb .btn');
    } else await p.waitForTimeout(1050);
    if (q.kind === 'yokai' && q.ids.length !== 4) errors.push('zenza choices ' + q.ids.length);
  }
  await p.waitForSelector('.game-result', { timeout: 5000 });
  await p.screenshot({ path: path.join(OUT, 'w-06-quiz-result.png') });
  if (!(await p.$('.gr-missed'))) errors.push('missed list missing');
  if (!(await p.$('.game-result [data-focus="1"]'))) errors.push('focus retry missing');
  await p.click('[data-act="gameQuit"]');
  await p.waitForTimeout(400);
  if (!(await p.$('.gc-focus'))) errors.push('focus button missing after play');
  const eyeN = await p.$$eval('.eye-item .eye-acc', es => es.filter(e => e.textContent !== '—').length);
  if (eyeN < 1) errors.push('eye accuracy not recorded');

  // ---- 名人を開けて：6択・言い直し・まぎらわしい選択肢 ----
  await p.evaluate(key => { const s = JSON.parse(localStorage.getItem(key)); s.game.quiz.levelBest = { zenza: 1700, shinuchi: 1900 }; localStorage.setItem(key, JSON.stringify(s)); }, KEY);
  await p.reload();
  await p.waitForTimeout(800);
  const lv2 = await p.$$eval('.lv', es => es.map(e => e.disabled));
  if (lv2.some(Boolean)) errors.push('levels should be open: ' + lv2);
  await p.click('.lv[data-level="meijin"]');
  await p.waitForTimeout(900);
  const kinds = {}; let confSeen = 0, sixSeen = 0;
  for (let i = 0; i < 10; i++) {
    const q = await answerQ(false);
    kinds[q.kind] = (kinds[q.kind] || 0) + 1;
    if (q.kind === 'yokai') { if (q.ids.length === 6) sixSeen++; if (q.conf > 0) confSeen++; }
    if (q.kind === 're' && !kinds.reShot) { kinds.reShot = 1; await p.waitForTimeout(150); await p.screenshot({ path: path.join(OUT, 'w-07-re.png') }); }
    if (q.kind === 'yokai' && !kinds.sixShot) { kinds.sixShot = 1; await p.waitForTimeout(150); await p.screenshot({ path: path.join(OUT, 'w-08-meijin-six.png') }); }
    await p.waitForTimeout(1050);
  }
  notes.push('meijin kinds ' + JSON.stringify(kinds) + ' six ' + sixSeen + ' conf ' + confSeen);
  if (!kinds.re) errors.push('no re question in meijin');
  if (kinds.yokai && sixSeen !== kinds.yokai) errors.push('meijin yokai should be 6 choices');
  if (kinds.yokai && !confSeen) errors.push('no confusable distractor seen');
  await p.waitForSelector('.game-result', { timeout: 5000 });
  if (!(await p.textContent('.gr-k')).includes('全問正解')) errors.push('meijin not perfect');
  await p.click('[data-act="gameQuit"]');
  await p.waitForTimeout(1500);

  // ---- いまひろい（いろなし）：見た目が同じか・福の長押し・増える考え ----
  await p.click('[data-act="hiroiStart"][data-mode="neutral"]');
  await p.waitForTimeout(3700);
  if (!(await p.$('#hArena.neutral'))) errors.push('arena not neutral');
  let savored = false, split = false, sameLook = null, t0 = Date.now();
  while (Date.now() - t0 < 40000) {
    if (sameLook == null) {
      sameLook = await p.evaluate(() => {
        const a = document.querySelector('#hArena .hb.ima:not(.reveal)'), b = document.querySelector('#hArena .hb.kangae:not(.reveal)');
        if (!a || !b) return null;
        return getComputedStyle(a).backgroundImage + getComputedStyle(a).backgroundColor === getComputedStyle(b).backgroundImage + getComputedStyle(b).backgroundColor;
      });
    }
    if (!savored) {
      const f = await p.$('#hArena .hb.fuku:not(.picked)');
      if (f) {
        await f.dispatchEvent('pointerdown').catch(() => {});
        await p.waitForTimeout(250);
        await p.screenshot({ path: path.join(OUT, 'w-09-hiroi-hold.png') });
        await p.waitForTimeout(500);
        await p.evaluate(() => window.dispatchEvent(new PointerEvent('pointerup')));
        savored = true;
      }
    }
    if (!split) {
      const kg = await p.$('#hArena .hb.kangae:not(.grabbed):not(.small)');
      if (kg) {
        const before = await p.$$eval('#hArena .hb.kangae.small:not(.grabbed)', e => e.length);
        await kg.dispatchEvent('pointerdown').catch(() => {});
        await p.waitForTimeout(80);
        const after = await p.$$eval('#hArena .hb.kangae.small:not(.grabbed)', e => e.length);
        if (after >= before + 2) split = true; else notes.push('split check ' + before + '->' + after);
        split = split || after > before;
        await p.screenshot({ path: path.join(OUT, 'w-10-hiroi-split.png') });
        if (!split) split = 'tried';
      }
    }
    const im = await p.$('#hArena .hb.ima:not(.picked):not(.reveal), #hArena .hb.body:not(.picked):not(.reveal)');
    if (im) await im.dispatchEvent('pointerdown').catch(() => {});
    if (await p.$('.game-result')) break;
    await p.waitForTimeout(250);
  }
  await p.waitForSelector('.game-result', { timeout: 15000 });
  await p.screenshot({ path: path.join(OUT, 'w-11-hiroi-result.png') });
  const hn = await p.textContent('.game-result');
  notes.push('hiroi neutral: sameLook ' + sameLook + ' savored ' + savored + ' split ' + split + ' result ' + hn.replace(/\s+/g, ' ').slice(0, 120));
  if (sameLook === false) errors.push('neutral bubbles look different');
  if (savored && !hn.includes('味わいました')) errors.push('savor not counted');
  if (split !== true) errors.push('split thoughts not observed: ' + split);
  await p.click('[data-act="gameQuit"]');
  await p.waitForTimeout(400);
  const hb = await p.textContent('.game-card-hiroi .gc-stat');
  if (!/いろなし \d+点/.test(hb.replace(/\s/g, ' ')) || /いろなし 0点/.test(hb)) errors.push('neutral best not saved: ' + hb);

  // ---- 図鑑：見分けの星 ----
  const someY = await p.evaluate(key => Object.keys(JSON.parse(localStorage.getItem(key)).game.eye)[0], KEY);
  await p.goto(BASE + '#zukan');
  await p.waitForTimeout(500);
  await p.click(`[data-act="zukanOpen"][data-id="${someY}"]`);
  await p.waitForTimeout(400);
  const zk = await p.$eval('.zk-eye', e => e.textContent).catch(() => '');
  if (!zk.includes('正しく見分けた')) errors.push('zukan eye stars missing');
  await p.screenshot({ path: path.join(OUT, 'w-12-zukan-eye.png') });
  await p.keyboard.press('Escape');

  // ---- 狭い画面・ダーク ----
  const sm = await browser.newContext({ viewport: { width: 320, height: 640 }, colorScheme: 'dark' });
  await sm.addInitScript(autoDismiss);
  const sp = await sm.newPage();
  watch(sp, 'small');
  await sp.clock.setFixedTime(new Date('2026-11-05T13:00:00'));
  await sp.goto(BASE);
  await sp.waitForTimeout(600);
  await sp.click('[data-act="introStart"]');
  await sp.goto(BASE + '#ogiri');
  await sp.waitForTimeout(500);
  await overflow(sp, 'ogiri-320');
  await sp.screenshot({ path: path.join(OUT, 'w-13-ogiri-320.png'), fullPage: true });
  await sp.click('[data-act="sortStart"]');
  await sp.waitForTimeout(900);
  await sp.screenshot({ path: path.join(OUT, 'w-14-sort-320.png') });
  await sp.click('[data-act="gameQuit"]');
  await sp.click('[data-act="hiroiStart"][data-mode="color"]');
  await sp.waitForTimeout(9000);
  await sp.screenshot({ path: path.join(OUT, 'w-15-hiroi-320.png') });
  const legendWrap = await sp.$eval('.hiroi-legend', e => e.scrollWidth <= e.clientWidth + 1);
  if (!legendWrap) errors.push('hiroi legend overflows at 320');
  await sp.click('[data-act="gameQuit"]');
  await sp.click('.lv[data-level="zenza"]');
  await sp.waitForTimeout(900);
  await sp.screenshot({ path: path.join(OUT, 'w-16-quiz-320.png') });
  const topOk = await sp.$eval('.game-top', e => e.scrollWidth <= e.clientWidth + 1);
  if (!topOk) errors.push('game-top overflows at 320');
  await sp.click('[data-act="gameQuit"]');

  await browser.close();
  console.log(notes.join('\n'));
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'ALL OK');
})();
