// 第七回 E2E：台本のしくみ・役目カード・いまの台本・オチの型と点検・高座の遊び（声/文字/番組）・上演への引きつぎ・笑い噺
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
  const autoKojo = () => { document.addEventListener('DOMContentLoaded', () => { new MutationObserver(() => { const b = document.querySelector('.kojo [data-act="closeSheet"]'); if (b) setTimeout(() => b.click(), 50); const l = document.querySelector('#legend-root [data-act="legendOk"]'); if (l) setTimeout(() => l.click(), 300); }).observe(document.body, { childList: true, subtree: true }); }); };
  const shot = (p, n, full) => p.screenshot({ path: path.join(OUT, n + '.png'), fullPage: !!full });

  async function run(viewport, dark, tag) {
    const ctx = await browser.newContext({ viewport, colorScheme: dark ? 'dark' : 'light', hasTouch: true });
    await ctx.addInitScript(autoKojo);
    const p = await ctx.newPage();
    watch(p, tag);
    await p.clock.setFixedTime(new Date('2026-11-05T13:00:00'));
    await p.goto(BASE);
    await p.waitForTimeout(700);
    await p.click('[data-act="introStart"]');
    await p.waitForTimeout(300);

    // ホーム：トリと台本のしくみ
    if (!(await p.$('.act-tori'))) errors.push(tag + ' tori program missing');
    await p.click('.first-show [data-act="daihonOpen"]');
    await p.waitForTimeout(400);
    const dh = await p.$$eval('.dh-item', e => e.length);
    if (dh !== 6) errors.push(tag + ' daihon items ' + dh);
    await shot(p, tag + '-01-daihon');
    await p.$eval('.sheet-body', el => { el.scrollTop = 900; }).catch(() => {});
    await p.waitForTimeout(150);
    await shot(p, tag + '-02-daihon-mid');
    await overflow(p, tag + ' daihon');
    await p.keyboard.press('Escape');
    await p.waitForTimeout(300);

    // 妖怪漫才
    await p.click('[data-act="startManzai"]');
    await p.waitForTimeout(300);
    if (!(await p.$('.role-card'))) errors.push(tag + ' role card missing on feel');
    await p.click('[data-act="mzEmotion"][data-id="fuan"]');
    await p.click('#mzNextBtn');
    await p.fill('#thought', '発言したら、みんなに変な人だと思われる');
    await p.click('.role-tips summary');
    await shot(p, tag + '-03-boke', true);
    await p.click('#mzNextBtn');
    await p.waitForTimeout(200);
    const nowRow = await p.$eval('.script-peek .sc-row.now', e => e.textContent).catch(() => '');
    if (!nowRow.includes('？？？')) errors.push(tag + ' kantei peek now row: ' + nowRow);
    await p.click('[data-act="mzYokai"][data-id="satori"]');
    await p.waitForTimeout(200);
    const filled = await p.$eval('.script-peek .sc-row.filled .sc-role', e => e.textContent).catch(() => '');
    if (filled !== 'サトリ') errors.push(tag + ' role not filled: ' + filled);
    await shot(p, tag + '-04-kantei');
    await p.click('#mzNextBtn');
    await p.waitForTimeout(200);

    // 高座：声・文字・番組
    const tabs = await p.$$eval('.fx-tab', e => e.map(x => x.textContent));
    if (tabs.join() !== '声で遊ぶ,文字で遊ぶ,番組にする') errors.push(tag + ' fx tabs ' + tabs.join());
    await p.click('[data-act="kouzaFx"][data-fx="helium"]');
    await p.click('[data-act="kouzaGroup"][data-g="moji"]');
    const mojiBtns = await p.$$eval('#fxRow .btn', e => e.map(x => x.dataset.fx).join());
    if (mojiBtns !== 'puru,funya,sakasa,bara,renko,piko') errors.push(tag + ' moji buttons ' + mojiBtns);
    await p.click('[data-act="kouzaFx"][data-fx="puru"]');
    const chs = await p.$$eval('#kouzaText .ch', e => e.length);
    if (chs < 10) errors.push(tag + ' puru chars ' + chs);
    await p.waitForTimeout(200);
    await shot(p, tag + '-05-puru');
    await p.click('[data-act="kouzaFx"][data-fx="sakasa"]');
    const sak = await p.textContent('#kouzaText');
    if (!sak.startsWith('るれわ思')) errors.push(tag + ' sakasa ' + sak.slice(0, 8));
    await p.click('[data-act="kouzaFx"][data-fx="bara"]');
    await p.waitForTimeout(1800);
    if (!(await p.$('#kouzaText.fall'))) errors.push(tag + ' bara not falling');
    await shot(p, tag + '-06-bara');
    await p.click('[data-act="kouzaFx"][data-fx="renko"]');
    const rw = await p.$$eval('#kouzaText .rw', e => [e.length, e[0] && e[0].textContent]);
    notes.push(tag + ' renko word ' + rw[1]);
    if (rw[0] !== 20) errors.push(tag + ' renko count ' + rw[0]);
    if (await p.$('#kouzaText.fall')) errors.push(tag + ' fall class not reset');
    await p.waitForTimeout(2600);
    await shot(p, tag + '-07-renko');
    await p.click('[data-act="kouzaFx"][data-fx="piko"]');
    await p.waitForTimeout(400);
    const pk1 = await p.$$eval('#kouzaText .pk', e => e.length);
    await p.waitForTimeout(1800);
    const pk2 = await p.$$eval('#kouzaText .pk', e => e.length);
    if (!(pk2 > pk1 && pk1 > 0)) errors.push(tag + ' piko typing ' + pk1 + '->' + pk2);
    await shot(p, tag + '-08-piko');
    await p.click('[data-act="kouzaGroup"][data-g="bangumi"]');
    for (const f of ['jikkyo', 'tenki', 'sokuho', 'yokoku']) {
      await p.click(`[data-act="kouzaFx"][data-fx="${f}"]`);
      await p.waitForTimeout(700);
      const cls = await p.$eval('#kouzaStage', e => e.className);
      if (!cls.includes('frame-' + f)) errors.push(tag + ' frame ' + f + ' ' + cls);
      await shot(p, tag + '-09-' + f);
    }
    await p.click('[data-act="kouzaFx"][data-fx="telop"]');
    await p.waitForTimeout(300);
    const note = await p.textContent('#fxNote');
    if (!note.includes('フィクション')) errors.push(tag + ' telop note ' + note);
    // 上演に持ちこむ遊びは「ふにゃふにゃ」
    await p.click('[data-act="kouzaGroup"][data-g="moji"]');
    await p.click('[data-act="kouzaFx"][data-fx="funya"]');
    await overflow(p, tag + ' kouza');
    await p.click('#mzNextBtn');
    await p.waitForTimeout(200);
    const tkNow = await p.$eval('.script-peek .sc-row.now', e => e.textContent).catch(() => '');
    if (!tkNow.includes('ツッコミ')) errors.push(tag + ' tsukkomi now row ' + tkNow);
    await p.click('[data-act="tkToggle"][data-id="esper"]');
    await p.fill('#tk-esper', '誰にも確かめていない。前に発言したとき、部長はうなずいてくれた。');
    await p.click('#mzNextBtn');
    await p.waitForTimeout(200);

    // 言い直し：オチの型と点検
    if (!(await p.$('.ochi-kata[open]'))) errors.push(tag + ' ochi kata not open');
    await p.fill('#okA', '変だと思う人もいるかもしれない');
    await p.click('[data-act="okBorrow"]');
    const okb = await p.inputValue('#okB');
    if (!okb.includes('部長')) errors.push(tag + ' borrow ' + okb);
    await p.fill('#okC', 'まず一つ言ってみる');
    await p.click('[data-act="okCompose"]');
    const nt = await p.inputValue('#newThought');
    if (!nt.startsWith('たしかに、変だと思う人もいるかもしれない。でも、')) errors.push(tag + ' compose ' + nt);
    const peekO = await p.textContent('#peekOchi');
    if (!peekO.includes('まず一つ')) errors.push(tag + ' peek ochi not live');
    const ok1 = await p.$$eval('#ochiHints li', e => e.map(x => x.className).join());
    if (!ok1.includes('oh-ok')) errors.push(tag + ' balanced hint missing ' + ok1);
    await shot(p, tag + '-10-iinaoshi', true);
    await p.fill('#newThought', '絶対うまくいく！みんな私を好きになる');
    await p.waitForTimeout(100);
    const warn = await p.$$eval('#ochiHints li.oh-warn', e => e.map(x => x.textContent));
    if (!warn.some(t => t.includes('押しつけ')) || !warn.some(t => t.includes('みんな'))) errors.push(tag + ' warn hints ' + warn.join('|'));
    await shot(p, tag + '-11-ochi-warn');
    await p.fill('#newThought', nt);
    await overflow(p, tag + ' iinaoshi');
    await p.click('#mzNextBtn');
    await p.waitForTimeout(2700);
    // 上演：ボケが「ふにゃふにゃ」で登場するか
    let sawFx = false;
    for (let i = 0; i < 40; i++) {
      const fx = await p.$eval('#stBubble', e => e.dataset.fx + ':' + e.querySelectorAll('.ch').length).catch(() => '');
      if (fx.startsWith('funya:') && +fx.split(':')[1] > 5) { if (!sawFx) await shot(p, tag + '-12-stage-funya'); sawFx = true; }
      const t = await p.textContent('#stNext').catch(() => null);
      if (t === null) break;
      if (t === '感想へ') { await p.waitForTimeout(800); await p.click('#stNext'); break; }
      await p.click('#stNext'); await p.waitForTimeout(90);
    }
    if (!sawFx) errors.push(tag + ' funya not carried to stage');
    await p.waitForTimeout(300);
    await p.$eval('#ochiFit', el => { el.value = 80; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await p.click('[data-act="mzSave"]');
    await p.waitForTimeout(400);
    const hl = await p.$('.hanashi-link');
    if (!hl) errors.push(tag + ' hanashi link missing on done');
    await shot(p, tag + '-13-done', true);

    // 笑い噺：終演から
    await p.click('.hanashi-link');
    await p.waitForTimeout(400);
    if (!(await p.$('#hnEvent'))) errors.push(tag + ' hanashi flow not opened');
    await p.fill('#hnEvent', '大事な会議の日に、シャツを裏返しに着ていた');
    // 重い → 確認シート
    await p.$eval('#hnWb', el => { el.value = 85; el.dispatchEvent(new Event('input', { bubbles: true })); });
    if (await p.$eval('#hnHeavyHint', e => e.hidden)) errors.push(tag + ' heavy hint hidden');
    await p.click('#hnNextBtn');
    await p.waitForTimeout(300);
    const hv = await p.textContent('.hn-heavy').catch(() => '');
    if (!hv.includes('まだ、笑いにしなくていい')) errors.push(tag + ' heavy sheet missing');
    await shot(p, tag + '-14-heavy');
    await p.click('[data-act="closeSheet"].sheet-close');
    await p.waitForTimeout(300);
    await p.$eval('#hnWb', el => { el.value = 50; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await shot(p, tag + '-15-hn-event');
    await p.click('#hnNextBtn');
    await p.waitForTimeout(300);
    const lenses = await p.$$eval('.lens', e => e.length);
    if (lenses !== 6) errors.push(tag + ' lenses ' + lenses);
    await p.click('[data-act="hnLens"][data-id="hiki"]');
    await p.waitForTimeout(300);
    for (const z of [2, 4]) {
      await p.$eval('#hnZoomR', (el, z) => { el.value = z; el.dispatchEvent(new Event('input', { bubbles: true })); }, z);
      await p.waitForTimeout(700);
      await shot(p, tag + '-16-zoom' + z);
    }
    const zl = await p.textContent('#hnZoomL');
    if (zl !== '地球') errors.push(tag + ' zoom label ' + zl);
    await p.fill('#hnLensText', '町じゅうで、だれかがそれぞれ何かをやらかしている。その中の一人が私');
    await p.click('#hnNextBtn');
    await p.waitForTimeout(300);
    await p.fill('#hnFuri', 'その日は、大事な会議の日でございました');
    await p.fill('#hnOchi', '私はダメ人間です');
    await p.waitForTimeout(100);
    const sd = await p.textContent('#hnHints');
    if (!sd.includes('自分を下げる')) errors.push(tag + ' self-down hint ' + sd);
    await p.fill('#hnOchi', '地球から見たら、ほほえましい一コマ');
    await p.fill('#hnTitle', '裏返しの男');
    await shot(p, tag + '-17-compose', true);
    await overflow(p, tag + ' compose');
    await p.click('#hnNextBtn');
    await p.waitForTimeout(1200);
    await shot(p, tag + '-18-rakugo');
    let ochiShot = false;
    for (let i = 0; i < 12; i++) {
      const k = await p.$eval('#rkBubble', e => e.className).catch(() => null);
      if (k === null) break;
      if (k.includes('k-ochi') && !ochiShot) { ochiShot = true; await p.waitForTimeout(300); await shot(p, tag + '-19-rakugo-ochi'); }
      const t = await p.textContent('#rkNextBtn');
      if (t === '高座をおりる') { await p.waitForTimeout(1100); await shot(p, tag + '-20-rakugo-sage'); await p.click('#rkNextBtn'); break; }
      await p.click('#rkNextBtn'); await p.waitForTimeout(150);
    }
    if (!ochiShot) errors.push(tag + ' ochi line not shown');
    await p.waitForTimeout(300);
    if (!(await p.$('[data-act="hnTalk"]'))) errors.push(tag + ' after step (talk) missing');
    await p.click('[data-act="hnTalk"][data-id="warai"]');
    await p.click('[data-act="hnSave"]');
    await p.waitForTimeout(400);
    const res = await p.textContent('.hn-result').catch(() => '');
    if (!res.includes('笑って話せる') || !res.includes('ほほえましい一コマ') || /重さ/.test(res)) errors.push(tag + ' result ' + res);
    // ボケ拾い
    for (let i = 0; i < 3; i++) {
      await p.fill('#okT', ['「とまれ」の看板が傾いていた', '猫が箱からはみ出して寝ていた', '自分でメガネをかけたまま探していた'][i]);
      if (i === 0) await p.fill('#okTk', '看板のほうが止まりそうやん！');
      await p.click('.okashi-form button[type="submit"]');
      await p.waitForTimeout(300);
    }
    if (await p.$('.okashi-form')) errors.push(tag + ' okashi form should close at 3');
    const okn = await p.$$eval('.okashi-list .okashi-item', e => e.length);
    if (okn !== 3) errors.push(tag + ' okashi count ' + okn);
    await shot(p, tag + '-21-hanashi', true);
    await overflow(p, tag + ' hanashi');
    // 噺帳から一席
    await p.click('[data-act="hnReplay"]');
    await p.waitForTimeout(900);
    if (!(await p.$('.rakugo'))) errors.push(tag + ' replay not open');
    await p.keyboard.press('Escape');
    await p.waitForTimeout(200);
    if (await p.$('.rakugo')) errors.push(tag + ' rakugo escape');
    const st = await p.evaluate(key => { const s = JSON.parse(localStorage.getItem(key)); return { stories: s.hanashi.stories.length, okashi: s.hanashi.okashi.length, fx: s.scripts[0].fx }; }, KEY);
    notes.push(tag + ' state ' + JSON.stringify(st));
    if (st.stories !== 1 || st.okashi !== 3 || st.fx !== 'funya') errors.push(tag + ' state ' + JSON.stringify(st));
    await ctx.close();
  }

  await run({ width: 390, height: 844 }, false, 'y');
  await run({ width: 320, height: 640 }, true, 'z');

  await browser.close();
  console.log(notes.join('\n'));
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'ALL OK');
})();
