// 第九回 E2E：ひたる席・ひと呼吸・しじま（余韻・あいだ・めくり・問題）・ほかの入口・白紙のページ・三題噺・日誌
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
  const autoKojo = () => { document.addEventListener('DOMContentLoaded', () => { new MutationObserver(() => { const b = document.querySelector('.kojo [data-act="closeSheet"]'); if (b) setTimeout(() => b.click(), 50); }).observe(document.body, { childList: true, subtree: true }); }); };
  const shot = (p, n, full) => p.screenshot({ path: path.join(OUT, n + '.png'), fullPage: !!full });
  const state = p => p.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  const open = async (p, id) => { await p.goto(BASE + '#shijima'); await p.waitForTimeout(300); await p.click(`[data-act="sjOpen"][data-id="${id}"]`); await p.waitForTimeout(350); };

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.addInitScript(autoKojo);
  const p = await ctx.newPage();
  watch(p, 'main');
  await p.clock.setFixedTime(new Date('2026-11-09T10:00:00'));
  await p.goto(BASE);
  await p.waitForTimeout(700);
  await p.click('[data-act="introStart"]');
  await p.waitForTimeout(300);

  // ---- 番組：ひたる席・ひと呼吸・はね ----
  if ((await p.$$eval('.seat-btns .seat', e => e.length)) !== 3) errors.push('seats != 3');
  if (!(await p.$('.seat-shijima[href="#shijima"]'))) errors.push('shijima seat missing');
  if (!(await p.$('.act-hane'))) errors.push('hane program missing');
  if (!(await p.textContent('.hero-sub')).includes('ひたる')) errors.push('hero line missing');
  await shot(p, 'c-01-home', true);
  await overflow(p, 'home');

  // ---- ひと呼吸（2回） ----
  await p.click('.hitoiki-btn');
  await p.waitForTimeout(2500);
  await shot(p, 'c-02-hitoiki');
  await p.waitForTimeout(9200);
  const g1 = await p.textContent('#sjGuide');
  if (!g1.includes('1回')) errors.push('hitoiki count ' + g1);
  await shot(p, 'c-03-hitoiki-end');
  await p.click('[data-act="sjAgain"]');
  await p.waitForTimeout(11500);
  const g2 = await p.textContent('#sjGuide');
  if (!g2.includes('2回')) errors.push('hitoiki count2 ' + g2);
  await p.click('#sjBar [data-act="sjClose"]');
  await p.waitForTimeout(300);
  if (await p.$('.sj-ov')) errors.push('overlay not closed');

  // ---- しじまの入口 ----
  await p.goto(BASE + '#shijima'); await p.waitForTimeout(400);
  const cards = await p.$$eval('.sj-card', e => e.length);
  const others = await p.$$eval('.sj-other', e => e.length);
  if (cards !== 4 || others !== 3) errors.push('cards/others ' + cards + '/' + others);
  if (!(await p.$('.seat-map-list li.here'))) errors.push('seat map here missing');
  if (!(await p.textContent('.sj-today')).includes('2')) errors.push('today breaths not shown');
  await shot(p, 'c-04-shijima', true);
  await overflow(p, 'shijima');

  // ---- 余韻を聴く ----
  await open(p, 'yoin');
  if (!(await p.textContent('.sheet-body')).includes('音を使います')) errors.push('yoin sound note missing');
  await p.click('[data-act="sjGo"]'); await p.waitForTimeout(500);
  for (let r = 0; r < 3; r++) {
    await p.click('#sjMain'); await p.waitForTimeout(1200);
    if (r === 0) await shot(p, 'c-05-yoin-ring');
    await p.click('#sjMain'); await p.waitForTimeout(r === 0 ? 1500 : 200);
    if (r === 0) await shot(p, 'c-06-yoin-still');
    await p.waitForTimeout(r === 0 ? 8800 : 10100);
  }
  await p.waitForTimeout(500);
  const ye = await p.textContent('.sj-end').catch(() => '');
  if (!ye.includes('音を追いかけた時間')) errors.push('yoin end ' + ye.slice(0, 40));
  await shot(p, 'c-07-yoin-end');
  await p.click('#sjBar [data-act="sjClose"]'); await p.waitForTimeout(300);

  // ---- あいだを見る ----
  await open(p, 'aida');
  await p.click('[data-act="sjGo"]'); await p.waitForTimeout(500);
  const ks = [];
  for (let i = 0; i < 6; i++) {
    ks.push(await p.$eval('#sjSpace', e => e.dataset.k));
    if (i === 1 || i === 4) { await p.waitForTimeout(1600); await shot(p, 'c-08-aida-' + i); }
    await p.click('#sjNext'); await p.waitForTimeout(250);
  }
  if (ks.join() !== 'mono,aida,heya,uchi,kizuki,open') errors.push('aida steps ' + ks.join());
  if (!(await p.$('.sj-end'))) errors.push('aida end missing');
  await p.click('#sjBar [data-act="sjClose"]'); await p.waitForTimeout(300);

  // ---- めくりをめくる ----
  await open(p, 'mekuri');
  if (!(await p.textContent('.sheet-body')).includes('足の裏')) errors.push('mekuri safety note missing');
  await p.click('[data-act="sjGo"]'); await p.waitForTimeout(500);
  const name = (await state(p)).profile.name;
  const pages = [];
  for (let i = 0; i < 6; i++) {
    await p.waitForTimeout(450);
    pages.push(await p.textContent('#sjPage'));
    if (i === 0) await shot(p, 'c-09-mekuri-name');
    if (i === 4) { await shot(p, 'c-10-mekuri-blank'); if (!(await p.$('#sjMekuri.blank'))) errors.push('blank page not marked'); }
    await p.click('#sjNext');
  }
  notes.push('mekuri pages ' + JSON.stringify(pages));
  if (pages[0] !== name || pages[1] !== '役割' || pages[4] !== '') errors.push('mekuri pages ' + JSON.stringify(pages));
  await p.waitForTimeout(400);
  const me = await p.textContent('.sj-end').catch(() => '');
  if (!me.includes('白い紙')) errors.push('mekuri end ' + me.slice(0, 40));
  await p.click('#sjBar [data-act="sjClose"]'); await p.waitForTimeout(300);

  // ---- いま、問題はある？（考えの中 → 3呼吸）・（いま起きている → 一歩） ----
  await open(p, 'mondai');
  await shot(p, 'c-11-mondai');
  await p.click('[data-act="sjMondai"][data-k="aru"]'); await p.waitForTimeout(200);
  await p.click('[data-act="sjMondai"][data-k="kangae"]'); await p.waitForTimeout(1500);
  await shot(p, 'c-12-mondai-breath');
  await p.waitForTimeout(30000);
  const md = await p.textContent('.sj-end').catch(() => '');
  if (!md.includes('問題のない瞬間')) errors.push('mondai end ' + md.slice(0, 40));
  await p.click('#sjBar [data-act="sjClose"]'); await p.waitForTimeout(300);
  await open(p, 'mondai');
  await p.click('[data-act="sjMondai"][data-k="aru"]'); await p.waitForTimeout(200);
  await p.click('[data-act="sjMondai"][data-k="ima"]'); await p.waitForTimeout(200);
  await p.fill('#sjIma', '窓を開ける');
  await p.click('[data-act="sjMondai"][data-k="go"]'); await p.waitForTimeout(300);
  if (!(await p.textContent('.sj-end')).includes('窓を開ける')) errors.push('mondai ima end');
  await p.click('#sjBar [data-act="sjHub"]'); await p.waitForTimeout(400);
  if (!(await p.$('.sj-hero'))) errors.push('sjHub did not go to hub');

  // ---- ほかの入口 → ながめ席のシート ----
  await p.click('[data-act="sjNg"][data-id="innerbody"]'); await p.waitForTimeout(400);
  const st = await p.textContent('.sheet-title').catch(() => '');
  if (!st.includes('インナーボディ')) errors.push('other entrance sheet ' + st);
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);

  // ---- 記録・三題噺・日誌 ----
  const S1 = await state(p);
  const deep = S1.shijima.sessions.filter(x => x.practice !== 'hitoiki').length;
  notes.push('shijima ' + JSON.stringify({ deep, breaths: S1.shijima.breaths, total: S1.shijima.totalBreaths }));
  if (deep !== 5 || S1.shijima.breaths['2026-11-09'] !== 2) errors.push('shijima record ' + deep);
  await p.goto(BASE + '#home'); await p.waitForTimeout(400);
  const sd = await p.$$eval('.sandai-list li', e => e.map(x => (x.classList.contains('done') ? '済 ' : '　 ') + x.textContent.trim()));
  notes.push('sandai ' + sd.join(' | '));
  sd.forEach(t => { if (t.includes('しじまで、ひとつ') && !t.startsWith('済')) errors.push('sandai shijima not done'); if (t.includes('ひと呼吸を3回') && t.startsWith('済')) errors.push('sandai hitoiki should not be done (2 breaths)'); });
  await p.goto(BASE + '#neta'); await p.waitForTimeout(300);
  const jr = await p.textContent('.journal');
  if (!jr.includes('しじまにひたった') || !jr.includes('意識的なひと呼吸')) errors.push('journal rows missing');

  // ---- 白紙のページ（7回目で） ----
  await p.evaluate(k => { const s = JSON.parse(localStorage.getItem(k)); s.shijima.sessions.unshift({ id: 'x1', date: new Date().toISOString(), practice: 'aida', sec: 60 }, { id: 'x2', date: new Date().toISOString(), practice: 'yoin', sec: 60 }); localStorage.setItem(k, JSON.stringify(s)); }, KEY);
  await p.goto(BASE + '#shijima'); await p.reload(); await p.waitForTimeout(1600);
  const lk = await p.textContent('.legend-k').catch(() => '');
  await shot(p, 'c-13-hakushi');
  if (!lk.includes('最後のページ')) errors.push('hakushi celebration ' + lk);
  const ln = await p.textContent('.legend-name').catch(() => '');
  if (!ln.includes('白紙')) errors.push('hakushi name ' + ln);
  const b = await p.$('#legend-root [data-act="legendOk"]'); if (b) { await b.click(); await p.waitForTimeout(800); }
  await p.goto(BASE + '#zukan'); await p.waitForTimeout(400);
  await p.click('[data-act="zukanOpen"][data-id="hakushi"]'); await p.waitForTimeout(300);
  await shot(p, 'c-14-hakushi-zukan');
  await p.keyboard.press('Escape');

  // ---- 320px・ダーク ----
  const sm = await browser.newContext({ viewport: { width: 320, height: 640 }, colorScheme: 'dark' });
  await sm.addInitScript(autoKojo);
  const sp = await sm.newPage();
  watch(sp, 'small');
  await sp.goto(BASE); await sp.waitForTimeout(600);
  await sp.click('[data-act="introStart"]');
  for (const v of ['home', 'shijima']) {
    await sp.goto(BASE + '#' + v); await sp.waitForTimeout(350);
    await overflow(sp, '320 ' + v);
    await sp.screenshot({ path: path.join(OUT, 'c-20-' + v + '-320.png'), fullPage: true });
  }
  await sp.click('[data-act="sjOpen"][data-id="mekuri"]'); await sp.waitForTimeout(300);
  await sp.click('[data-act="sjGo"]'); await sp.waitForTimeout(700);
  await sp.screenshot({ path: path.join(OUT, 'c-21-mekuri-320.png') });
  const ov = await sp.evaluate(() => { const s = document.querySelector('.sj-scene'); return s.scrollWidth > s.clientWidth + 1; });
  if (ov) errors.push('mekuri overflows at 320');
  await sp.click('[data-act="sjClose"]'); await sp.waitForTimeout(300);
  await sp.click('[data-act="sjOpen"][data-id="aida"]'); await sp.waitForTimeout(300);
  await sp.click('[data-act="sjGo"]'); await sp.waitForTimeout(700);
  await sp.screenshot({ path: path.join(OUT, 'c-22-aida-320.png') });

  await browser.close();
  console.log(notes.join('\n'));
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'ALL OK');
})();
