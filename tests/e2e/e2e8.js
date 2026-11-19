// 第八回 E2E：福日記の切り口・エレベーターの呼吸・記録のしかた（ワンタップ／なし）・おみくじの掟・笑顔さがし・心の五力・三題噺
const { chromium } = require('playwright');
const path = require('path');
const OUT = require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:8765/index.html';
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
  const shot = (p, n, full) => p.screenshot({ path: path.join(OUT, n + '.png'), fullPage: !!full });
  const state = p => p.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);

  async function manzai(p, tag, mode) {
    await p.goto(BASE + '#home'); await p.waitForTimeout(300);
    await p.click('[data-act="startManzai"]');
    await p.waitForTimeout(300);
    await p.click('[data-act="mzEmotion"][data-id="fuan"]');
    if (mode === 'tap') {
      const n5 = await p.$$eval('fieldset#emoBefore input[type="radio"]', e => e.length);
      if (n5 !== 5) errors.push(tag + ' emo tap radios ' + n5);
      await p.click('fieldset#emoBefore label:nth-child(4)');
      await shot(p, tag + '-feel');
    } else {
      if (await p.$('#emoBefore')) errors.push(tag + ' emo scale should be hidden in off');
    }
    await p.click('#mzNextBtn');
    await p.fill('#thought', '発言したら、みんなに変な人だと思われる');
    if (mode === 'tap') await p.click('fieldset#beliefBefore label:nth-child(5)');
    else if (await p.$('#beliefBefore')) errors.push(tag + ' belief scale should be hidden in off');
    await p.click('#mzNextBtn'); await p.waitForTimeout(150);
    await p.click('[data-act="mzYokai"][data-id="satori"]'); await p.waitForTimeout(150);
    await p.click('#mzNextBtn'); await p.waitForTimeout(150);
    await p.click('#mzNextBtn'); await p.waitForTimeout(150);
    await p.click('[data-act="tkToggle"][data-id="esper"]');
    await p.fill('#tk-esper', '誰にも確かめていない。前はうなずいてもらえた。');
    await p.click('#mzNextBtn'); await p.waitForTimeout(150);
    await p.fill('#newThought', 'たしかに不安。でも、前はうなずいてもらえた。');
    await p.click('#mzNextBtn');
    await p.waitForTimeout(2700);
    for (let i = 0; i < 40; i++) {
      const t = await p.textContent('#stNext').catch(() => null);
      if (t === null) break;
      if (t === '感想へ') { await p.waitForTimeout(800); await p.click('#stNext'); break; }
      await p.click('#stNext'); await p.waitForTimeout(80);
    }
    await p.waitForTimeout(300);
    if (mode === 'tap') {
      await p.click('fieldset#ochiFit label:nth-child(4)');
      await p.click('[data-act="mzMood"][data-id="hotto"]');
    } else {
      if (await p.$('#ochiFit')) errors.push(tag + ' fit scale should be hidden in off');
      await p.click('[data-act="mzMood"][data-id="sukkiri"]');
    }
    if (await p.$('#beliefAfter, #emoAfter')) errors.push(tag + ' old after-questions should be gone');
    await shot(p, tag + '-rate');
    await p.click('[data-act="mzSave"]');
    await p.waitForTimeout(400);
    const done = await p.textContent('.done');
    await shot(p, tag + '-done', true);
    return done;
  }

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.addInitScript(autoKojo);
  const p = await ctx.newPage();
  watch(p, 'main');
  await p.clock.setFixedTime(new Date('2026-11-05T20:30:00'));
  await p.goto(BASE);
  await p.waitForTimeout(700);
  await p.click('[data-act="introStart"]');
  await p.waitForTimeout(300);

  // ---- 三題噺（はじめ） ----
  const sd0 = await p.$$eval('.sandai-item', e => e.map(x => x.textContent.trim()));
  notes.push('sandai: ' + sd0.join(' | '));
  if (sd0.length !== 3) errors.push('sandai items ' + sd0.length);
  await shot(p, 'a-01-home', true);

  // ---- 福日記：切り口 ----
  await p.goto(BASE + '#fuku'); await p.waitForTimeout(400);
  const rows = await p.$$eval('.kiri-row', e => e.length);
  if (rows !== 3) errors.push('kiri rows ' + rows);
  const odai = await p.textContent('.odai-t');
  const first = await p.$eval('.kiri-row .kiri.on', e => e.textContent);
  if (!odai.startsWith(first)) errors.push('line1 kiri should be odai: ' + first + ' vs ' + odai);
  if (/丸いもの|赤いもの/.test(await p.textContent('#view'))) errors.push('old object odai still shown');
  await p.click('[data-act="fukuKiri"][data-line="1"][data-id="luck"]');
  const q1 = await p.textContent('#kiriQ1');
  if (!q1.includes('ラッキー')) errors.push('kiri q not updated ' + q1);
  await p.fill('#good0', 'みそ汁がおいしかった');
  await p.fill('#good1', '信号がちょうど青だった');
  await p.fill('#good2', '洗い物をひとつ片づけた');
  await shot(p, 'a-02-nikki', true);
  await overflow(p, 'fuku');
  await p.click('form[data-form="fukuGood"] button[type="submit"]');
  await p.waitForTimeout(500);
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  const kinds = (await state(p)).fuku.goods.map(g => g.kind + ':' + g.lens);
  notes.push('goods ' + kinds.join(','));
  if (!kinds.some(k => k.startsWith('luck:ラッキー'))) errors.push('luck kiri not saved');

  // ---- 妖怪漫才：ワンタップ ----
  const d1 = await manzai(p, 'a-03-tap', 'tap');
  if (!d1.includes('今日のオチ') || !d1.includes('しっくり度') || !d1.includes('ほっと')) errors.push('tap done should show ochi, fit, mood');
  let s1 = await state(p);
  notes.push('tap script belief ' + s1.scripts[0].beliefBefore + '->' + s1.scripts[0].beliefAfter + ' emo ' + s1.scripts[0].emoBefore);
  if (s1.scripts[0].beliefBefore !== 95 || s1.scripts[0].beliefAfter !== null || s1.scripts[0].emoBefore !== 70 || s1.scripts[0].ochiFit !== 70 || s1.scripts[0].moodAfter !== 'hotto') errors.push('tap values ' + JSON.stringify(s1.scripts[0]));

  // ---- 記録を「なし」に（気分の画面から切りかえ） ----
  await p.goto(BASE + '#home'); await p.waitForTimeout(200);
  await p.click('[data-act="startManzai"]'); await p.waitForTimeout(300);
  await p.click('[data-act="setMeasure"][data-v="off"]'); await p.waitForTimeout(300);
  await p.click('[data-act="mzQuit"]'); await p.waitForTimeout(300);
  const qd = await p.$('[data-act="mzQuitDrop"]'); if (qd) { await qd.click(); await p.waitForTimeout(300); }
  const d2 = await manzai(p, 'a-04-off', 'off');
  if (d2.includes('しっくり度')) errors.push('off done should not show fit');
  if (!d2.includes('すっきり')) errors.push('off done mood missing');
  s1 = await state(p);
  if (s1.scripts[0].beliefBefore !== null || s1.scripts[0].moodAfter !== 'sukkiri' || s1.scripts[0].ochiFit !== undefined) errors.push('off values ' + JSON.stringify({ b: s1.scripts[0].beliefBefore, m: s1.scripts[0].moodAfter, f: s1.scripts[0].ochiFit }));
  await p.goto(BASE + '#neta'); await p.waitForTimeout(300);
  await shot(p, 'a-05-neta', true);
  // ワンタップにもどす（楽屋）
  await p.goto(BASE + '#gakuya'); await p.waitForTimeout(300);
  await p.click('[data-act="setMeasure"][data-v="tap"]'); await p.waitForTimeout(200);

  // ---- エレベーターの呼吸 ----
  await p.goto(BASE + '#nagame'); await p.waitForTimeout(300);
  await p.click('[data-act="ngOpen"][data-id="elevator"]'); await p.waitForTimeout(300);
  const desc = await p.textContent('.sheet-body');
  if (!desc.includes('まるい「床」') || !desc.includes('ネドじゅん')) errors.push('elevator desc ' + desc.slice(0, 80));
  if ((await p.$$eval('fieldset#ngBefore input', e => e.length)) !== 5) errors.push('ngBefore tap radios');
  await p.click('fieldset#ngBefore label:nth-child(4)');
  await p.click('form[data-form="ngStart"] button[type="submit"]');
  await p.waitForTimeout(600);
  await shot(p, 'a-06-elev-intro');
  await p.click('[data-act="evDir"]'); await p.waitForTimeout(200);
  const sub = await p.textContent('#gSub');
  if (!sub.includes('吸って上がる')) errors.push('evDir not toggled ' + sub);
  await p.click('[data-act="evDir"]'); await p.waitForTimeout(200);
  await p.click('#gNext');
  await p.waitForTimeout(2500);
  const tf1 = await p.$eval('#evDisc', e => e.style.transform);
  await shot(p, 'a-07-elev-down');
  await p.waitForTimeout(4500);
  const tf2 = await p.$eval('#evDisc', e => e.style.transform);
  if (!tf1.includes('194') || !tf2.includes('106')) errors.push('disc path ' + tf1 + ' / ' + tf2);
  await p.waitForTimeout(3000);
  const cnt = await p.$eval('#evCount', e => +e.textContent);
  if (cnt < 1) errors.push('ev count ' + cnt);
  await p.click('[data-act="ngEnd"]'); await p.waitForTimeout(300);
  await shot(p, 'a-08-elev-end');
  if ((await p.$$eval('fieldset#ngAfter input', e => e.length)) !== 5) errors.push('ngAfter tap radios');
  await p.click('fieldset#ngAfter label:nth-child(2)');
  await p.click('[data-act="ngSave"]'); await p.waitForTimeout(400);
  const sess = (await state(p)).nagame.sessions[0];
  notes.push('elev session ' + JSON.stringify({ b: sess.before, a: sess.after, r: sess.rounds, tot: (await state(p)).nagame.evTotal }));
  if (sess.before !== 7 || sess.after !== 3 || !(sess.rounds >= 1)) errors.push('elev session ' + JSON.stringify(sess));
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);

  // ---- 行動おみくじ ----
  await p.goto(BASE + '#omikuji'); await p.waitForTimeout(300);
  if (!(await p.$('.okite'))) errors.push('okite missing');
  await p.click('button.btn[data-act="mkDraw"]'); await p.waitForTimeout(1700);
  if (await p.$('[data-act="mkRedraw"]')) errors.push('redraw should be gone');
  const kyo = (await p.textContent('.mk-fortune')) === '凶';
  if (!kyo) {
    await p.click('[data-act="mkHalf"]'); await p.waitForTimeout(200);
    const act = await p.textContent('.mk-act');
    if (!act.includes('最初の10秒')) errors.push('half text ' + act);
    await p.click('fieldset#mkPred label:nth-child(2)');
  }
  await shot(p, 'a-09-mikuji-drawn', true);
  await p.click('[data-act="mkGo"]'); await p.waitForTimeout(1300);
  const cd = await p.textContent('#mkCd').catch(() => '');
  await shot(p, 'a-10-countdown');
  if (!/[1-4]/.test(cd)) errors.push('countdown ' + cd);
  await p.waitForTimeout(4800);
  if (!(await p.$('#mkElapsed'))) errors.push('now state missing');
  await p.waitForTimeout(1200);
  await shot(p, 'a-11-mikuji-now');
  await p.click('.mk-now [data-act="mkDone"]'); await p.waitForTimeout(300);
  if (!kyo) await p.click('fieldset#mkAct label:nth-child(4)');
  await p.click('form[data-form="mkDone"] button[type="submit"]'); await p.waitForTimeout(500);
  const stamp = await p.textContent('.mk-stamp').catch(() => '');
  if (!stamp.includes('達成')) errors.push('stamp missing');
  await shot(p, 'a-12-mikuji-done');
  await p.click('[data-act="closeAndRender"]'); await p.waitForTimeout(300);
  const om = (await state(p)).omikuji[0];
  notes.push('omikuji ' + JSON.stringify(om));
  if (!kyo && (om.predicted !== 3 || om.actual !== 7 || !om.half)) errors.push('omikuji record ' + JSON.stringify(om));
  await overflow(p, 'omikuji');

  // ---- 大喜利：心の五力と笑顔さがし ----
  await p.goto(BASE + '#ogiri'); await p.waitForTimeout(300);
  if ((await p.$$eval('.pw', e => e.length)) !== 5) errors.push('powers != 5');
  await shot(p, 'a-13-ogiri', true);
  await p.click('[data-act="egaoStart"]'); await p.waitForTimeout(800);
  let found = 0, wrongDone = false;
  for (let k = 0; k < 300; k++) {
    if (await p.$('.game-result')) break;
    const ready = await p.$('#egGrid .eg-face[data-k="smile"]:not(.hit):not(.reveal)');
    const busy = await p.$('#egGrid .eg-face.hit, #egGrid .eg-face.miss');
    if (!ready || busy) { await p.waitForTimeout(80); continue; }
    if (found === 3 && !wrongDone) { wrongDone = true; await p.click('#egGrid .eg-face[data-k="frown"]').catch(() => {}); await p.waitForTimeout(200); await shot(p, 'a-14-egao-miss'); continue; }
    if (found === 1) await shot(p, 'a-15-egao');
    await ready.click().catch(() => {}); found++;
    await p.waitForTimeout(120);
  }
  await p.waitForSelector('.game-result', { timeout: 40000 });
  const gr = await p.textContent('.game-result');
  await shot(p, 'a-16-egao-result');
  notes.push('egao result ' + gr.replace(/\s+/g, ' ').slice(0, 120));
  if (!gr.includes('見つける力')) errors.push('gain missing in egao result');
  const gsz = await p.evaluate(() => getComputedStyle(document.querySelector('.game')).gridTemplateRows);
  await p.click('[data-act="gameQuit"]'); await p.waitForTimeout(400);
  const lv = await p.$$eval('.pw', e => e.map(x => x.querySelector('.pw-lv').textContent));
  notes.push('levels ' + lv.join(','));
  if (lv[4] === 'Lv.1') errors.push('mitsukeru should level up');

  // ---- 三題噺（あと） ----
  await p.goto(BASE + '#home'); await p.waitForTimeout(400);
  const sd1 = await p.$$eval('.sandai-list li', e => e.map(x => (x.classList.contains('done') ? '済 ' : '　 ') + x.textContent.trim()));
  notes.push('sandai after: ' + sd1.join(' | '));
  const expectDone = ['福日記に1行', 'おみくじを引いて', '客席の笑顔さがし', '妖怪漫才を1本', 'ながめ席で、どれかひとつ', 'エレベーターの呼吸を10往復'];
  sd1.forEach(t => { const should = expectDone.slice(0, 5).some(x => t.includes(x)); if (should && !t.startsWith('済')) errors.push('sandai not done: ' + t); });
  await shot(p, 'a-17-home-after', true);

  // ---- 320px・ダーク ----
  const sm = await browser.newContext({ viewport: { width: 320, height: 640 }, colorScheme: 'dark' });
  await sm.addInitScript(autoKojo);
  const sp = await sm.newPage();
  watch(sp, 'small');
  await sp.goto(BASE); await sp.waitForTimeout(600);
  await sp.click('[data-act="introStart"]');
  for (const v of ['home', 'fuku', 'omikuji', 'ogiri', 'gakuya']) {
    await sp.goto(BASE + '#' + v); await sp.waitForTimeout(350);
    await overflow(sp, '320 ' + v);
    await sp.screenshot({ path: path.join(OUT, 'a-20-' + v + '-320.png'), fullPage: true });
  }
  await sp.goto(BASE + '#ogiri'); await sp.waitForTimeout(300);
  await sp.click('[data-act="egaoStart"]'); await sp.waitForTimeout(900);
  await sp.screenshot({ path: path.join(OUT, 'a-21-egao-320.png') });
  const ov = await sp.evaluate(() => { const m = document.querySelector('#gMain'); return m.scrollWidth > m.clientWidth + 1; });
  if (ov) errors.push('egao grid overflows at 320');

  await browser.close();
  console.log(notes.join('\n'));
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'ALL OK');
})();
