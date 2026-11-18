// 第六回 E2E (b)：百鬼夜行（今夜の・自由）、提灯、芸の札、大トリ、鵺、ひと休みの声かけ、320px
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
  const autoKojo = () => { window.__flash = []; document.addEventListener('DOMContentLoaded', () => { new MutationObserver(ms => { ms.forEach(m => m.addedNodes.forEach(n => { if (n.classList && n.classList.contains('g-flash')) { const si = document.querySelector('#gInfo'); window.__flash.push(n.textContent + ' @' + (si ? si.textContent : '')); } })); }).observe(document.body, { childList: true, subtree: true }); new MutationObserver(() => { const b = document.querySelector('.kojo [data-act="closeSheet"]'); if (b) setTimeout(() => b.click(), 50); }).observe(document.body, { childList: true, subtree: true }); }); };

  // 百鬼夜行を自動で遊ぶ。mode: 'perfect' | 'oneMistake' | 'allWrong'
  async function playRun(p, mode, shotPrefix) {
    const info = { stages: [], perks: [], mistakes: 0, lanAfterMistake: null, bossSeen: false, shots: {} };
    const t0 = Date.now();
    let lastIntro = '';
    while (Date.now() - t0 < 180000) {
      const st = await p.evaluate(() => {
        const m = document.querySelector('#gMain'); if (!m) return { s: 'none' };
        if (m.querySelector('.game-result')) return { s: 'result' };
        if (m.querySelector('.stage-intro')) return { s: 'intro', name: m.querySelector('.si-name').textContent };
        if (m.querySelector('.perk-card:not([disabled])')) return { s: 'perk', ids: [...m.querySelectorAll('.perk-card')].map(b => b.dataset.id) };
        if (m.querySelector('.perk-card')) return { s: 'wait' };
        const qc = [...m.querySelectorAll('#qChoices .q-choice:not([disabled])')];
        if (qc.length) {
          const t = document.querySelector('#qBubble span').textContent.replace(/^「|」$/g, '');
          const n = window.KY_NETA.LIST.find(x => x.thought === t);
          const ids = qc.map(b => b.dataset.id);
          const isRe = !!m.querySelector('.q-choice-re');
          const isTk = !isRe && document.querySelector('#qChoices').classList.contains('tk');
          return { s: 'q', ans: isRe ? 'ok' : isTk ? n.tk[0].id : n.y, ids, boss: !!m.querySelector('.boss-wrap') };
        }
        if (m.querySelector('#egGrid .eg-face') && !m.querySelector('#egGrid .eg-face.hit, #egGrid .eg-face.miss, #egGrid .eg-face.reveal')) return { s: 'egao' };
        const sc = m.querySelector('#sCard.in:not(.out-left):not(.out-right)');
        if (sc && sc.textContent) return { s: 'sort', ans: window.KY_DATA.GAME.facts.includes(sc.textContent) ? 'fact' : 'thought' };
        if (m.querySelector('#hArena')) return { s: 'hiroi' };
        return { s: 'wait' };
      });
      if (st.s === 'result') break;
      if (st.s === 'intro') {
        if (st.name !== lastIntro) { info.stages.push(st.name); lastIntro = st.name; if (!info.shots.intro) { info.shots.intro = 1; await p.screenshot({ path: path.join(OUT, shotPrefix + '-intro.png') }); } }
        await p.waitForTimeout(150); continue;
      }
      lastIntro = st.s === 'wait' ? lastIntro : '';
      if (st.s === 'perk') {
        if (!info.shots.perk) { info.shots.perk = 1; await p.screenshot({ path: path.join(OUT, shotPrefix + '-perk.png') }); }
        const id = st.ids.find(i => i !== 'nidome' && i !== 'kae') || st.ids[0];
        info.perks.push(id);
        await p.click(`.perk-card[data-id="${id}"]`).catch(() => {});
        await p.waitForTimeout(300); continue;
      }
      const wantWrong = mode === 'allWrong' || (mode === 'oneMistake' && info.mistakes === 0);
      if (st.s === 'q') {
        if (st.boss && !info.bossSeen) { info.bossSeen = true; await p.screenshot({ path: path.join(OUT, shotPrefix + '-boss.png') }); }
        if (st.boss && info.bossSeen && !info.shots.boss2) { const left = await p.$$eval('#parade .pm.leave', e => e.length); if (left >= 5) { info.shots.boss2 = 1; await p.screenshot({ path: path.join(OUT, shotPrefix + '-boss-mid.png') }); } }
        if (!st.boss && !info.shots.q) { info.shots.q = 1; await p.screenshot({ path: path.join(OUT, shotPrefix + '-q.png') }); }
        const pick = wantWrong ? st.ids.find(i => i !== st.ans) : st.ans;
        await p.click(`#qChoices .q-choice[data-id="${pick}"]`).catch(() => {});
        if (wantWrong) {
          info.mistakes++;
          await p.waitForTimeout(250);
          if (info.mistakes === 1) {
            info.lanAfterMistake = await p.evaluate(() => [document.querySelectorAll('#gLan .lan:not(.off)').length, document.querySelectorAll('#gLan .lan.off').length]);
            await p.screenshot({ path: path.join(OUT, shotPrefix + '-miss.png') });
          }
        }
        await p.waitForTimeout(200); continue;
      }
      if (st.s === 'sort') {
        if (!info.shots.sort) { info.shots.sort = 1; await p.screenshot({ path: path.join(OUT, shotPrefix + '-sort.png') }); }
        const k = wantWrong ? (st.ans === 'fact' ? 'ArrowRight' : 'ArrowLeft') : (st.ans === 'fact' ? 'ArrowLeft' : 'ArrowRight');
        await p.keyboard.press(k);
        if (wantWrong) {
          info.mistakes++;
          await p.waitForTimeout(250);
          if (info.mistakes === 1) info.lanAfterMistake = await p.evaluate(() => [document.querySelectorAll('#gLan .lan:not(.off)').length, document.querySelectorAll('#gLan .lan.off').length]);
        }
        await p.waitForTimeout(150); continue;
      }
      if (st.s === 'egao') {
        if (!info.shots.egao) { info.shots.egao = 1; await p.screenshot({ path: path.join(OUT, shotPrefix + '-egao.png') }); }
        await p.click(wantWrong ? '#egGrid .eg-face[data-k="frown"]' : '#egGrid .eg-face[data-k="smile"]').catch(() => {});
        if (wantWrong) {
          info.mistakes++;
          await p.waitForTimeout(250);
          if (info.mistakes === 1) info.lanAfterMistake = await p.evaluate(() => [document.querySelectorAll('#gLan .lan:not(.off)').length, document.querySelectorAll('#gLan .lan.off').length]);
        }
        await p.waitForTimeout(150); continue;
      }
      if (st.s === 'hiroi') {
        if (mode !== 'allWrong') {
          const els = await p.$$('#hArena .hb.ima:not(.picked):not(.reveal), #hArena .hb.body:not(.picked):not(.reveal)');
          for (const e of els.slice(0, 2)) await e.dispatchEvent('pointerdown').catch(() => {});
        }
        if (!info.shots.hiroi) { const c = await p.$$eval('#hArena .hb', e => e.length); if (c >= 4) { info.shots.hiroi = 1; await p.screenshot({ path: path.join(OUT, shotPrefix + '-hiroi.png') }); } }
        await p.waitForTimeout(200); continue;
      }
      await p.waitForTimeout(120);
    }
    await p.waitForSelector('.game-result', { timeout: 5000 }).catch(() => errors.push(shotPrefix + ' run did not end'));
    await p.screenshot({ path: path.join(OUT, shotPrefix + '-result.png') });
    info.result = (await p.textContent('.game-result').catch(() => '')).replace(/\s+/g, ' ');
    info.sec = Math.round((Date.now() - t0) / 1000);
    info.flash = await p.evaluate(() => { const f = window.__flash.filter(x => !x.includes('！')); window.__flash = []; return f; });
    return info;
  }

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.addInitScript(autoKojo);
  const p = await ctx.newPage();
  watch(p, 'main');
  await p.clock.setFixedTime(new Date('2026-11-05T13:00:00'));
  await p.goto(BASE);
  await p.waitForTimeout(700);
  await p.click('[data-act="introStart"]');
  await p.goto(BASE + '#ogiri');
  await p.waitForTimeout(500);

  // 1) 今夜の百鬼夜行：1回だけまちがえる
  await p.click('[data-act="runStart"][data-daily="1"]');
  await p.waitForTimeout(200);
  const r1 = await playRun(p, 'oneMistake', 'x1');
  notes.push('run1 ' + JSON.stringify({ stages: r1.stages, perks: r1.perks, lan: r1.lanAfterMistake, sec: r1.sec, flash: r1.flash }) + ' | ' + r1.result.slice(0, 140));
  if (r1.stages.length !== 5) errors.push('run1 stages ' + r1.stages.join(','));
  if (!r1.stages[4] || !r1.stages[4].includes('大トリ')) errors.push('boss not last');
  if (r1.perks.length !== 4) errors.push('perks picked ' + r1.perks.length);
  if (!r1.lanAfterMistake || r1.lanAfterMistake[0] !== 2 || r1.lanAfterMistake[1] !== 1) errors.push('lantern after mistake ' + JSON.stringify(r1.lanAfterMistake));
  if (!r1.result.includes('越えました')) errors.push('run1 should clear (not perfect): ' + r1.result.slice(0, 60));
  if (r1.result.includes('ひとつ消さず')) errors.push('run1 should not be perfect');
  const parade = await p.$$eval('#parade .pm', e => e.length).catch(() => 0);
  if (parade) errors.push('result should replace boss');

  // 2) 自由に挑む：完璧 → 鵺
  await p.click('.game-result [data-act="gameQuit"]');
  await p.waitForTimeout(500);
  const runStat = await p.textContent('.run-stat');
  if (!runStat.includes('今夜の記録')) errors.push('daily record not shown: ' + runStat);
  await p.click('[data-act="runStart"][data-daily="0"]');
  await p.waitForTimeout(200);
  const r2 = await playRun(p, 'perfect', 'x2');
  notes.push('run2 ' + JSON.stringify({ stages: r2.stages, perks: r2.perks, sec: r2.sec, flash: r2.flash }) + ' | ' + r2.result.slice(0, 140));
  if (!r2.result.includes('ひとつ消さずに')) errors.push('run2 not perfect: ' + r2.result.slice(0, 80));
  await p.click('.game-result [data-act="gameQuit"]');
  await p.waitForTimeout(1600);
  await p.screenshot({ path: path.join(OUT, 'x2-nue.png') });
  const ln = await p.$eval('.legend-name', e => e.textContent).catch(() => '');
  if (!ln.includes('鵺')) errors.push('nue legend not shown: ' + ln);
  for (let i = 0; i < 4; i++) { const b = await p.$('#legend-root [data-act="legendOk"]'); if (!b) break; await b.click(); await p.waitForTimeout(800); }

  // 3) 今夜の百鬼夜行をもう一度：同じ順番か・全部まちがえて終わる・ひと休みの声かけ
  await p.click('[data-act="runStart"][data-daily="1"]');
  await p.waitForTimeout(200);
  const r3 = await playRun(p, 'allWrong', 'x3');
  notes.push('run3 ' + JSON.stringify({ stages: r3.stages, sec: r3.sec }) + ' | ' + r3.result.slice(0, 200));
  if (r3.stages[0] !== r1.stages[0]) errors.push('daily order differs: ' + r1.stages[0] + ' vs ' + r3.stages[0]);
  if (!r3.result.includes('今夜はここまで')) errors.push('run3 should end early');
  if (!(await p.$('.gr-rest'))) errors.push('rest nudge missing after 3 runs');
  const rec = await p.evaluate(key => JSON.parse(localStorage.getItem(key)).game.run, KEY);
  notes.push('run record ' + JSON.stringify(rec));
  if (rec.plays !== 3 || rec.clears !== 2 || rec.perfect !== 1 || rec.daily.tries !== 2) errors.push('run record wrong ' + JSON.stringify(rec));
  await p.click('.game-result [data-act="gameQuit"]');
  await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(OUT, 'x3-ogiri-after.png'), fullPage: true });

  // 自由に挑む：順番が毎回ちがうか
  const firsts = [];
  for (let k = 0; k < 6; k++) {
    await p.click('[data-act="runStart"][data-daily="0"]');
    await p.waitForSelector('.si-name');
    firsts.push(await p.textContent('.si-name'));
    await p.click('[data-act="gameQuit"]');
    await p.waitForTimeout(150);
  }
  notes.push('free firsts ' + firsts.join(','));
  if (new Set(firsts).size < 2) errors.push('free run order never changes');

  // 途中でやめる（Escape）→ 舞台が閉じる
  await p.click('[data-act="runStart"][data-daily="0"]');
  await p.waitForTimeout(800);
  await p.keyboard.press('Escape');
  await p.waitForTimeout(300);
  if (await p.$('#game-root .game')) errors.push('escape did not close run');

  // 4) 320px・ダーク：自由に挑む（完璧）で画面崩れを見る
  const sm = await browser.newContext({ viewport: { width: 320, height: 640 }, colorScheme: 'dark' });
  await sm.addInitScript(autoKojo);
  const sp = await sm.newPage();
  watch(sp, 'small');
  await sp.clock.setFixedTime(new Date('2026-11-05T13:00:00'));
  await sp.goto(BASE);
  await sp.waitForTimeout(600);
  await sp.click('[data-act="introStart"]');
  await sp.goto(BASE + '#ogiri');
  await sp.waitForTimeout(400);
  await sp.click('[data-act="runStart"][data-daily="0"]');
  const ov = [];
  sp.on('framenavigated', () => {});
  const iv = setInterval(async () => {
    try {
      const o = await sp.evaluate(() => { const m = document.querySelector('#gMain'); const t = document.querySelector('.game-top'); return m ? [m.scrollWidth > m.clientWidth + 1, t.scrollWidth > t.clientWidth + 1] : null; });
      if (o && (o[0] || o[1])) ov.push(o.join(','));
    } catch (e) { /* noop */ }
  }, 700);
  const r4 = await playRun(sp, 'perfect', 'x4');
  clearInterval(iv);
  notes.push('run4(320) ' + JSON.stringify({ stages: r4.stages, sec: r4.sec }));
  if (ov.length) errors.push('320 overflow during run: ' + ov.slice(0, 5).join(' | '));

  await browser.close();
  console.log(notes.join('\n'));
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'ALL OK');
})();
