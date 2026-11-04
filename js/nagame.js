/* ココロ寄席 ― ながめ席
 * 理由のはっきりしない不安や、勝手に流れつづける考えを、ツッコまずに眺める演目。
 * はっ（気づき）／灯籠ながし／間をはかる／ハラに灯す／下足札
 * app.js が用意する道具（CORE）を受け取って、画面と操作を登録する。
 */
(function () {
  'use strict';
  (window.KY_EXT = window.KY_EXT || []).push(function (K) {
    const { D, A, $, $$, esc, uid, ymd, today, pick, kanjiNum, toast, openSheet, closeSheet, sheetBody, addXP, hearts, VIEWS, ACT, FORM, Sfx, Voice, buzz } = K;
    const N = D.NAGAME;
    const PR = Object.fromEntries(N.practices.map(p => [p.id, p]));
    const STATE_BY = Object.fromEntries(N.states.map(s => [s.id, s]));
    const UI = { state: null };
    let RUN = null;

    function ng() {
      const S = K.state();
      if (!S.nagame) S.nagame = {};
      const g = S.nagame;
      g.kizuki = g.kizuki || []; g.sessions = g.sessions || []; g.geso = g.geso || []; g.gesoSeq = g.gesoSeq || 0;
      return g;
    }
    const num = n => (n < 100 ? kanjiNum(n) : String(n));
    function fmtTime(iso) {
      const d = new Date(iso);
      const hm = d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
      const tm = new Date(); tm.setDate(tm.getDate() + 1);
      if (ymd(d) === today()) return '今日 ' + hm;
      if (ymd(d) === ymd(tm)) return '明日 ' + hm;
      return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + hm;
    }
    function todayKizuki() { const t = today(); return ng().kizuki.filter(iso => ymd(new Date(iso)) === t).length; }
    function practiceArt(id) {
      if (id === 'toro') return A.toro();
      if (id === 'ma') return A.cat();
      if (id === 'hara') return A.seated({ mini: true });
      return '<span class="fuda fuda-mini" aria-hidden="true"><span class="fuda-no">札</span></span>';
    }
    function baPair(label, b, a) {
      const d = Math.round((a - b) * 10) / 10;
      return `<div class="ba-row">
        <p class="ba-k">${esc(label)}</p>
        <div class="ba-bars">
          <div class="ba-line"><span class="ba-tag">前</span><span class="ba-track"><i class="ba-fill before" style="width:${b * 10}%"></i></span><span class="ba-v">${b.toFixed(1)}</span></div>
          <div class="ba-line"><span class="ba-tag">後</span><span class="ba-track"><i class="ba-fill after" style="width:${a * 10}%"></i></span><span class="ba-v">${a.toFixed(1)}</span></div>
        </div>
        <p class="ba-delta${d < 0 ? ' down' : ''}">${d < 0 ? '−' + (-d) : d > 0 ? '+' + d : '±0'}</p>
      </div>`;
    }

    // ============ ながめ席（入口） ============
    VIEWS.nagame = function () {
      const g = ng();
      const rec = UI.state ? STATE_BY[UI.state].rec : [];
      const now = Date.now();
      const held = g.geso.filter(x => x.status === 'held').sort((a, b) => a.due.localeCompare(b.due));
      const sess = g.sessions;
      const rated = sess.filter(s => typeof s.before === 'number' && typeof s.after === 'number');
      const avg = k => rated.reduce((a, s) => a + s[k], 0) / rated.length;
      const toroN = sess.reduce((a, s) => a + (s.count || 0), 0);
      const maN = sess.reduce((a, s) => a + (s.gaps ? s.gaps.length : 0), 0);
      const back = g.geso.filter(x => x.status === 'back');
      const light = back.filter(x => x.result === 'light').length;
      return `<header class="page-head"><h1 class="page-title">ながめ席</h1><p class="page-sub">ツッコまずに、ただ眺める演目</p></header>
      <p class="page-lead">理由のはっきりしない不安や、勝手に流れつづける考えには、言い返すより「眺める」ほうが合うことがあります。舞台をおりて客席に座り、頭の中のおしゃべりを眺めてみましょう。</p>

      <section class="kizuki" aria-label="気づき">
        <button class="kizuki-btn" id="kizukiBtn" data-act="ngKizuki"><span class="kizuki-main">はっ</span><span class="kizuki-sub">いま、考えにのまれてた</span></button>
        <div class="kizuki-side">
          <p class="kizuki-count">今日の気づき <strong id="kizukiToday">${todayKizuki()}</strong><small>回</small></p>
          <p class="muted small">考えに流されていたと気づいたら、タップ。気づけた瞬間、あなたはもう考えの外にいます。</p>
          <p class="muted small">これまで <span id="kizukiTotal">${g.kizuki.length}</span>回</p>
        </div>
      </section>

      <section aria-labelledby="ng-state-h">
        <h2 id="ng-state-h" class="sec-title"><span>いまの感じは？</span></h2>
        <div class="chips" role="group" aria-label="いまの感じ">${N.states.map(s =>
          `<button class="chip${UI.state === s.id ? ' on' : ''}" aria-pressed="${UI.state === s.id}" data-act="ngState" data-id="${s.id}">${esc(s.label)}</button>`).join('')}</div>
      </section>

      <section aria-labelledby="ng-pr-h">
        <h2 id="ng-pr-h" class="sec-title"><span>演目</span></h2>
        <ul class="ng-list">${N.practices.map(p => `<li><button class="ng-card${rec.includes(p.id) ? ' rec' : ''}" data-act="ngOpen" data-id="${p.id}">
          ${rec.includes(p.id) ? '<span class="rec-tag">おすすめ</span>' : ''}
          <span class="ng-art">${practiceArt(p.id)}</span>
          <span class="ng-body"><span class="ng-name">${esc(p.name)}</span><span class="ng-when">${esc(p.when)}</span><span class="ng-min">${esc(p.min)}</span></span>
        </button></li>`).join('')}</ul>
      </section>

      ${held.length ? `<section aria-labelledby="ng-fuda-h"><h2 id="ng-fuda-h" class="sec-title"><span>預かり中の札</span></h2>
        <ul class="fuda-list">${held.map(x => {
          const due = new Date(x.due).getTime() <= now;
          return `<li class="fuda-item${due ? ' due' : ''}">
            <span class="fuda fuda-sm" aria-hidden="true"><span class="fuda-no">${num(x.no)}</span></span>
            <div class="fuda-main"><p class="fuda-text">「${esc(x.text)}」</p>
            <p class="fuda-meta">${due ? '<strong>引き取れます</strong>' : esc(fmtTime(x.due)) + 'から引き取れます'}</p></div>
            <button class="btn btn-small${due ? ' btn-primary' : ''}" data-act="gesoBack" data-id="${x.id}">引き取る</button>
          </li>`;
        }).join('')}</ul></section>` : ''}

      <section aria-labelledby="ng-log-h"><h2 id="ng-log-h" class="sec-title"><span>ながめた記録</span></h2>
        ${sess.length || back.length ? `<dl class="tally">
          <div><dt>ながめた回数</dt><dd>${sess.length}<small>回</small></dd></div>
          <div><dt>流した灯籠</dt><dd>${toroN}</dd></div>
          <div><dt>気づいた間</dt><dd>${maN}</dd></div>
        </dl>
        ${rated.length ? `<div class="ba ng-ba">${baPair('ざわざわ度の平均（0〜10）', avg('before'), avg('after'))}</div>` : ''}
        ${back.length ? `<p class="muted small">引き取った札 ${back.length}枚のうち、もう大丈夫だったのは ${light}枚。</p>` : ''}`
        : '<p class="empty">まだ記録がありません。演目をひとつ選んでみましょう。終わったあとに、ざわざわ度の前と後がここに並びます。</p>'}
      </section>

      <aside class="howto"><p class="howto-k">この席の考え方</p>
        <p>考えは、あなた自身ではありません。考えが流れていることに気づいている側が、あなたです。考えを止めることは目標にしません。のまれていたと気づけたら、それで一本。</p>
        <p class="muted small" style="margin-top:8px">マインドフルネス、ACT、メタ認知療法と、エックハルト・トールやネドじゅんが紹介している「考えを眺める」「頭のおしゃべりから、いまの体の感覚に戻る」という考え方を参考にしています。特別な体験や、不安が消えることは約束しません。</p>
      </aside>`;
    };

    ACT.ngState = el => { const id = el.dataset.id; UI.state = UI.state === id ? null : id; K.rerender(); };

    ACT.ngKizuki = el => {
      const g = ng();
      g.kizuki.push(new Date().toISOString());
      if (g.kizuki.length > 5000) g.kizuki.splice(0, g.kizuki.length - 5000);
      const up = addXP(D.XP.kizuki);
      K.save();
      Sfx.bell(); buzz(20);
      el.classList.remove('ring'); void el.offsetWidth; el.classList.add('ring');
      const t = $('#kizukiToday'); if (t) t.textContent = todayKizuki();
      const tot = $('#kizukiTotal'); if (tot) tot.textContent = g.kizuki.length;
      toast(pick(N.notice) + (up ? '　' + up + 'に昇進しました' : ''));
    };

    ACT.ngOpen = el => { if (el.dataset.id === 'geso') gesoForm(); else preSheet(el.dataset.id); };

    function preSheet(id) {
      const p = PR[id];
      let extra = '';
      if (id === 'toro') {
        extra = `<fieldset class="field"><legend>長さ</legend><div class="seg">
          ${[[60, '1分'], [180, '3分'], [300, '5分']].map(([v, l]) => `<label><input type="radio" name="ngLen" value="${v}"${v === 180 ? ' checked' : ''}><span>${l}</span></label>`).join('')}
        </div></fieldset>`;
      } else if (id === 'hara') {
        extra = `<fieldset class="field"><legend>すすめ方</legend><div class="seg seg-wrap">
          <label><input type="radio" name="ngMode" value="body" checked><span><b>体の感覚まで</b><small>外 → 手のひら → ハラ</small></span></label>
          <label><input type="radio" name="ngMode" value="outside"><span><b>外の感覚だけ</b><small>視界・音・足の裏・色</small></span></label>
        </div>
        <p class="muted small">動悸や息苦しさに注意を向けると不安が強くなる方は、「外の感覚だけ」を選んでください。目は開けたままでも閉じても大丈夫です。</p></fieldset>
        ${Voice.can() ? `<label class="toggle"><input type="checkbox" id="ngVoice"><span class="toggle-ui" aria-hidden="true"></span><span>音声ガイドで、目を閉じたまま進める</span></label>` : ''}`;
      } else if (id === 'ma') {
        extra = '<p class="muted small">考えが浮かんだら「考えが来た」をタップします。5回で終わります。待っているあいだ、時間は表示しません。</p>';
      }
      openSheet(`<form class="form" data-form="ngStart" data-id="${id}">
        <p class="eyebrow">ながめ席</p>
        <h2 class="sheet-title">${esc(p.name)}</h2>
        <p>${esc(p.desc)}</p>
        <p class="muted small">もとにした考え方：${esc(p.tech)}</p>
        <fieldset class="field"><legend>いまの感じ <span class="opt">選ばなくてもOK</span></legend>
          <div class="seg seg-wrap">${N.states.map(s => `<label><input type="radio" name="ngSt" value="${s.id}"${UI.state === s.id ? ' checked' : ''}><span>${esc(s.label)}</span></label>`).join('')}</div>
        </fieldset>
        <div class="field"><label for="ngBefore">いまのざわざわ度 <output id="ngBeforeOut">5</output></label>
          <input type="range" id="ngBefore" min="0" max="10" step="1" value="5" data-out="ngBeforeOut">
          <div class="range-scale"><span>0 しずか</span><span>10 とてもざわざわ</span></div></div>
        ${extra}
        <button class="btn btn-primary btn-block" type="submit">はじめる</button>
      </form>`, { label: p.name });
    }

    FORM.ngStart = f => {
      const id = f.dataset.id;
      const stEl = f.querySelector('input[name="ngSt"]:checked');
      const sess = { id: uid(), date: new Date().toISOString(), practice: id, state: stEl ? stEl.value : null, before: +$('#ngBefore', f).value };
      if (stEl) UI.state = stEl.value;
      const opts = {};
      if (id === 'toro') opts.sec = +((f.querySelector('input[name="ngLen"]:checked') || {}).value || 180);
      if (id === 'hara') {
        opts.mode = (f.querySelector('input[name="ngMode"]:checked') || {}).value || 'body';
        const v = $('#ngVoice', f); opts.voice = !!(v && v.checked);
      }
      closeSheet();
      startRun(id, sess, opts);
    };

    // ============ 演目の実行（夜の画面） ============
    function later(fn, ms) { const t = setTimeout(fn, ms); if (RUN) RUN.timers.push(t); return t; }
    function every(fn, ms) { const t = setInterval(fn, ms); if (RUN) RUN.intervals.push(t); return t; }
    function haltTimers() { if (!RUN) return; RUN.timers.forEach(clearTimeout); RUN.intervals.forEach(clearInterval); RUN.timers = []; RUN.intervals = []; }
    function setGuide(t) { const g = $('#cGuide'); if (g) g.textContent = t; }

    function startRun(id, sess, opts) {
      closeRun();
      const p = PR[id];
      $('#calm-root').innerHTML = `<div class="calm calm-${id}" role="dialog" aria-modal="true" aria-label="${esc(p.name)}">
        <div class="calm-top"><p class="calm-title">${esc(p.name)}</p><span class="calm-timer" id="cTimer"></span><button class="calm-x" data-act="ngEnd">おわる</button></div>
        <div class="calm-scene" id="cScene"></div>
        <div class="calm-bar" id="cBar"></div>
      </div>`;
      document.body.classList.add('no-scroll');
      RUN = { id, sess, opts, timers: [], intervals: [], ended: false };
      ({ toro: runToro, ma: runMa, hara: runHara })[id]();
      setTimeout(() => { const b = $('#cBar button'); if (b) b.focus({ preventScroll: true }); }, 60);
    }
    function closeRun() {
      haltTimers();
      Sfx.riverOff(); Voice.stop();
      RUN = null;
      const root = $('#calm-root');
      if (root) root.innerHTML = '';
      if (!document.querySelector('#sheet-root .sheet-wrap') && !$('#stage-root').childElementCount) document.body.classList.remove('no-scroll');
    }

    // ---- 灯籠ながし ----
    function runToro() {
      const sec = RUN.opts.sec || 180;
      Object.assign(RUN.sess, { count: 0, labels: {}, holds: 0 });
      $('#cScene').innerHTML = `<div class="river">
        <div class="moon" aria-hidden="true"></div>
        <div class="far-bank" aria-hidden="true"></div>
        <div class="water" aria-hidden="true"></div>
        <div class="toro-layer" id="toroLayer"></div>
        <p class="calm-guide" id="cGuide" aria-live="polite">考えが浮かんだら、下から一言ラベルを選んで灯籠にのせましょう。流したら、追いかけずに見送ります。</p>
      </div>`;
      $('#cBar').innerHTML = `<div class="toro-chips" role="group" aria-label="考えのラベル">${N.labels.map(l =>
        `<button class="chip chip-night" data-act="toroAdd" data-label="${esc(l)}">${esc(l)}</button>`).join('')}</div>
        <form class="toro-free" data-form="toroFree"><label for="toroText" class="sr-only">考えを一言で</label>
        <input type="text" id="toroText" maxlength="24" placeholder="自分の言葉で一言（なくてもOK）" autocomplete="off">
        <button class="btn btn-small btn-night" type="submit">流す</button></form>`;
      let left = sec;
      const tick = () => { const el = $('#cTimer'); if (el) el.textContent = '残り ' + Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0'); };
      tick();
      every(() => { left -= 1; tick(); if (left <= 0) { Sfx.bell(); endPanel(); } }, 1000);
      if (K.state().profile.sound) Sfx.riverOn();
    }
    function addToro(label) {
      if (!RUN || RUN.ended || RUN.id !== 'toro') return;
      const layer = $('#toroLayer'); if (!layer) return;
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'toro';
      el.dataset.act = 'toroHold';
      el.setAttribute('aria-label', '灯籠：' + label + '（タップするとつかむ）');
      const y = 14 + Math.random() * 58;
      el.style.setProperty('--y', y.toFixed(1) + '%');
      el.style.setProperty('--w', layer.clientWidth + 'px');
      el.style.setProperty('--dur', (15 + Math.random() * 5).toFixed(1) + 's');
      el.style.zIndex = String(Math.round(y));
      const short = label.length > 7 ? label.slice(0, 7) + '…' : label;
      el.innerHTML = `<span class="toro-bob">${A.toro()}<span class="toro-label">${esc(short)}</span></span>`;
      el.addEventListener('animationend', e => { if (e.animationName === 'drift') el.remove(); });
      layer.appendChild(el);
      RUN.sess.count += 1;
      RUN.sess.labels[label] = (RUN.sess.labels[label] || 0) + 1;
      Sfx.plop();
      setGuide(N.toroGuide[(RUN.sess.count - 1) % N.toroGuide.length]);
    }
    ACT.toroAdd = el => addToro(el.dataset.label);
    FORM.toroFree = f => {
      const i = $('#toroText', f);
      const v = i.value.trim();
      if (!v) { i.focus(); return; }
      addToro(v);
      i.value = '';
      if (K.isRisky(v) && RUN) RUN.sess.risk = true;
    };
    ACT.toroHold = el => {
      if (el.classList.contains('held') || !RUN || RUN.ended) return;
      el.classList.add('held');
      RUN.sess.holds += 1;
      setGuide('つかんでしまっても大丈夫。気づいたら、また、そっと流しましょう。');
      setTimeout(() => el.classList.remove('held'), 2200);
    };

    // ---- 間をはかる ----
    function runMa() {
      Object.assign(RUN, { round: 0, phase: 'ready', t0: 0 });
      RUN.sess.gaps = [];
      $('#cScene').innerHTML = `<div class="ma-room">
        <div class="ma-wall" aria-hidden="true"></div>
        <div class="ma-hole" aria-hidden="true"><div class="ma-mouse" id="maMouse">${A.mouse()}</div></div>
        <div class="ma-cat" id="maCat" aria-hidden="true">${A.cat()}</div>
        <p class="calm-guide" id="cGuide" aria-live="polite">ねこがネズミの穴を見張るように、次の考えが出てくるのを待ちます。考えが浮かんだら「考えが来た」をタップ。待っているあいだ、時間は表示しません。</p>
        <ol class="ma-dots" aria-label="5回のうち">${'<li></li>'.repeat(5)}</ol>
      </div>`;
      $('#cBar').innerHTML = '<button class="btn btn-night-primary btn-block" id="maBtn" data-act="maTap">待ちはじめる</button>';
    }
    function maWait() {
      if (!RUN || RUN.id !== 'ma' || RUN.ended) return;
      clearTimeout(RUN.noneT);
      clearTimeout(RUN.autoT);
      RUN.phase = 'wait';
      RUN.t0 = performance.now();
      const btn = $('#maBtn');
      btn.textContent = '考えが来た';
      btn.classList.add('big');
      $('.ma-room').classList.add('waiting');
      setGuide(pick(['見張ります。次の考えは、どこから出てくるでしょう。', '穴をじっと見ています。', 'ねこになったつもりで、待ちます。']));
      RUN.noneT = later(() => maCame(true), 60000);
    }
    function maCame(none) {
      if (!RUN || RUN.id !== 'ma' || RUN.ended) return;
      clearTimeout(RUN.noneT);
      const gap = none ? 60 : (performance.now() - RUN.t0) / 1000;
      RUN.sess.gaps.push({ s: Math.round(gap * 10) / 10, none: !!none });
      RUN.phase = 'rest';
      RUN.round += 1;
      $('.ma-room').classList.remove('waiting');
      const dot = $$('.ma-dots li')[RUN.round - 1]; if (dot) dot.classList.add('on');
      const cat = $('#maCat'); cat.classList.remove('twitch'); void cat.offsetWidth; cat.classList.add('twitch');
      if (!none) { const m = $('#maMouse'); m.classList.remove('peek'); void m.offsetWidth; m.classList.add('peek'); buzz(15); }
      setGuide(none ? '1分、何も出てきませんでした。その静けさが「間」です。' : '間 ' + gap.toFixed(1) + '秒。その考えは、見送ります。');
      const btn = $('#maBtn');
      btn.classList.remove('big');
      if (RUN.round >= 5) {
        btn.disabled = true;
        later(() => { Sfx.bell(); endPanel(); }, 2400);
        return;
      }
      btn.textContent = '次を待つ';
      RUN.autoT = later(() => { if (RUN && RUN.phase === 'rest') maWait(); }, 3400);
    }
    ACT.maTap = () => {
      if (!RUN || RUN.id !== 'ma' || RUN.ended) return;
      if (RUN.phase === 'wait') maCame(false); else maWait();
    };

    // ---- ハラに灯す ----
    function runHara() {
      const steps = N.hara[RUN.opts.mode === 'outside' ? 'outside' : 'body'];
      Object.assign(RUN, { steps, i: -1 });
      RUN.sess.mode = RUN.opts.mode;
      $('#cScene').innerHTML = `<div class="hara-wrap">
        <div class="hara-fig${RUN.opts.mode === 'outside' ? ' outside' : ''}" id="haraFig" style="--fog:1">${A.seated()}</div>
        <div class="hara-card">
          <p class="hara-step" id="haraStep"></p>
          <h2 class="hara-title" id="haraTitle"></h2>
          <p class="hara-text" id="haraText"></p>
          <p class="hara-breath" id="haraBreath" aria-live="polite"></p>
          <div class="hara-prog" aria-hidden="true"><i id="haraProg"></i></div>
        </div>
      </div>`;
      $('#cBar').innerHTML = `<button class="btn btn-night-primary btn-block" id="haraNext" data-act="haraNext">次へ</button>
        <p class="calm-note">${RUN.opts.mode === 'outside' ? '外の感覚だけで進めます。' : '体に注意を向けて不安が強くなるときは、いつでも「おわる」を押してください。'}${RUN.opts.voice ? '　音声ガイドは自動で進みます。' : ''}</p>`;
      haraStep(0);
    }
    function haraStep(i) {
      if (!RUN || RUN.id !== 'hara' || RUN.ended) return;
      haltTimers();
      if (i >= RUN.steps.length) { Sfx.bell(); endPanel(); return; }
      RUN.i = i;
      const s = RUN.steps[i];
      const fig = $('#haraFig');
      fig.dataset.part = s.part;
      fig.classList.remove('in', 'out');
      fig.style.setProperty('--fog', String(Math.max(0, 1 - (i + 1) / RUN.steps.length).toFixed(2)));
      $('#haraStep').textContent = (i + 1) + ' / ' + RUN.steps.length;
      $('#haraTitle').textContent = s.title;
      $('#haraText').textContent = s.text;
      $('#haraBreath').textContent = '';
      const prog = $('#haraProg');
      prog.style.transition = 'none'; prog.style.width = '0%'; void prog.offsetWidth;
      prog.style.transition = 'width ' + s.sec + 's linear'; prog.style.width = '100%';
      $('#haraNext').textContent = i === RUN.steps.length - 1 ? 'おわる' : '次へ';
      if (i > 0) buzz(15);
      if (RUN.opts.voice) Voice.speak(s.title + '。' + s.text, { force: true, rate: 0.9, pitch: 0.95 });
      if (s.breath) breathe(s.sec);
      later(() => haraStep(i + 1), s.sec * 1000);
    }
    function breathe(total) {
      const fig = $('#haraFig'), txt = $('#haraBreath');
      let used = 0;
      const cycle = () => {
        if (!RUN || RUN.id !== 'hara' || RUN.ended || used + 10 > total) return;
        used += 10;
        fig.classList.remove('out'); fig.classList.add('in'); txt.textContent = 'ふくらむ……';
        if (RUN.opts.voice) Voice.speak('ふくらむ', { force: true, rate: 0.7, pitch: 0.9 });
        later(() => {
          fig.classList.remove('in'); fig.classList.add('out'); txt.textContent = 'しぼむ……';
          if (RUN && RUN.opts.voice) Voice.speak('しぼむ', { force: true, rate: 0.7, pitch: 0.9 });
        }, 4000);
        later(cycle, 10000);
      };
      later(cycle, RUN.opts.voice ? 9000 : 1500);
    }
    ACT.haraNext = () => { if (RUN && RUN.id === 'hara' && !RUN.ended) { Voice.stop(); haraStep(RUN.i + 1); } };

    // ---- 終わり（ざわざわ度の後） ----
    function endPanel() {
      if (!RUN || RUN.ended) return;
      RUN.ended = true;
      haltTimers();
      Sfx.riverOff(); Voice.stop();
      const s = RUN.sess;
      let summary = '';
      if (RUN.id === 'toro') {
        const top = Object.entries(s.labels).sort((a, b) => b[1] - a[1]);
        summary = s.count
          ? `<p class="end-big">${s.count}<small>個の灯籠を流しました</small></p>
             <ul class="label-tally">${top.slice(0, 5).map(([l, c]) => `<li><span>${esc(l)}</span><b>${c}</b></li>`).join('')}</ul>
             <p class="calm-note">いちばん多かったのは「${esc(top[0][0])}」の灯籠。どんな考えがよく流れてくるかを知るのも、眺める練習です。</p>
             ${s.holds ? `<p class="calm-note">灯籠を${s.holds}回つかみました。つかんだと気づいて、また流せたなら、それで十分です。</p>` : ''}`
          : '<p class="calm-note">灯籠は流しませんでした。川を眺めていただけでも、立派なながめ席です。</p>';
      } else if (RUN.id === 'ma') {
        const gs = s.gaps || [];
        const max = Math.max(10, ...gs.map(g => g.s));
        summary = gs.length
          ? `<p class="end-big">${gs.length}<small>回、間に気づきました</small></p>
             <div class="ma-bars">${gs.map((g, i) => `<div class="ba-line"><span class="ba-tag">${i + 1}回目</span><span class="ba-track"><i class="ba-fill after" style="width:${Math.min(100, g.s / max * 100)}%"></i></span><span class="ba-v">${g.none ? '60秒〜' : g.s.toFixed(1) + '秒'}</span></div>`).join('')}</div>
             <p class="calm-note">間の長さに、よい・わるいはありません。考えと考えのあいだにすきまがあること、そのすきまに気づいているのがあなたであること。それに気づけたら十分です。</p>`
          : '<p class="calm-note">今回は待たずに終わりました。それでも大丈夫です。</p>';
      } else if (RUN.id === 'hara') {
        summary = `<p class="end-big">${Math.max(1, RUN.i + 1)}<small> / ${RUN.steps.length} 段</small></p>
          <p class="calm-note">頭のまわりの煙は、少し薄くなったでしょうか。薄くならなくても、注意を下ろそうとしたこと自体が練習です。</p>`;
      }
      $('#cScene').innerHTML = `<div class="calm-end">
        <p class="calm-end-k">おつかれさまでした</p>
        ${summary}
        <div class="field"><label for="ngAfter">いまのざわざわ度 <output id="ngAfterOut">${s.before}</output></label>
          <input type="range" id="ngAfter" min="0" max="10" step="1" value="${s.before}" data-out="ngAfterOut">
          <div class="range-scale"><span>0 しずか</span><span>10 とてもざわざわ</span></div>
          <p class="was">はじめる前は ${s.before}</p></div>
      </div>`;
      $('#cBar').innerHTML = '<button class="btn btn-night-primary btn-block" data-act="ngSave">記録して閉じる</button><button class="link-btn night" data-act="ngDiscard">記録せずに閉じる</button>';
      const tm = $('#cTimer'); if (tm) tm.textContent = '';
      const x = $('.calm-x'); if (x) x.hidden = true;
    }
    ACT.ngEnd = () => endPanel();
    ACT.ngDiscard = () => { closeRun(); K.rerender(); };
    ACT.ngSave = () => {
      if (!RUN) return;
      const s = RUN.sess;
      s.after = +$('#ngAfter').value;
      const g = ng();
      g.sessions.unshift(s);
      if (g.sessions.length > 1000) g.sessions.length = 1000;
      const yid = s.state ? STATE_BY[s.state].yokai : (s.practice === 'hara' ? 'enenra' : 'nurarihyon');
      const S = K.state();
      const r = S.yokai[yid] || (S.yokai[yid] = { met: 0, friend: 0 });
      const before = r.friend;
      r.met += 1; r.friend = Math.min(5, r.friend + 1);
      const unlocked = before < 3 && r.friend >= 3;
      const up = addXP(D.XP.nagame);
      K.save();
      const risk = !!s.risk;
      closeRun();
      K.rerender();
      const y = D.yokaiById[yid];
      const d = s.after - s.before;
      openSheet(`<div class="yg-result">
        <div class="yg-result-art">${A.yokai(yid, 'happy')}</div>
        <p class="yg-result-say">${esc(y.name)}が、少し静かになりました</p>
        ${hearts(r.friend)}
        <p class="mk-result-num">${s.before}<span>→</span>${s.after}</p>
        <p>${d < 0 ? 'ざわざわ度が ' + (-d) + ' 下がりました。'
          : d === 0 ? 'ざわざわ度は変わりませんでした。変わらない日も、眺めたことは練習になっています。'
            : 'ざわざわ度が上がりました。体や考えに注意を向けると、かえってざわつくこともあります。そんなときは「外の感覚だけ」や、休憩所の呼吸を試してください。'}</p>
        ${unlocked ? `<div class="honne"><p class="honne-k">${esc(y.name)}の本音が聞けるようになりました</p><blockquote>${esc(y.honne)}</blockquote></div>` : ''}
        <p class="xp-gain">経験 +${D.XP.nagame}${up ? `　<strong>${esc(up)}に昇進しました</strong>` : ''}</p>
        <button class="btn btn-primary btn-block" data-act="closeSheet">閉じる</button>
      </div>`, { label: '記録' });
      if (risk) setTimeout(() => K.openSos(), 300);
    };

    // ============ 下足札（心配の先送り） ============
    function gesoSlots() {
      const now = new Date();
      const out = [{ id: 'hour', label: '1時間後', due: new Date(now.getTime() + 3600e3) }];
      const tonight = new Date(now); tonight.setHours(19, 0, 0, 0);
      if (now.getHours() < 18) out.push({ id: 'tonight', label: '今夜 19:00', due: tonight });
      const morning = new Date(now); morning.setDate(morning.getDate() + 1); morning.setHours(8, 0, 0, 0);
      out.push({ id: 'morning', label: '明日の朝 8:00', due: morning });
      out.push({ id: 'tomorrow', label: '明日の今ごろ', due: new Date(now.getTime() + 864e5) });
      return out;
    }
    function gesoForm() {
      const slots = gesoSlots();
      const def = UI.state === 'nemuri' || new Date().getHours() >= 20 ? 'morning' : slots.some(s => s.id === 'tonight') ? 'tonight' : 'hour';
      openSheet(`<form class="form" data-form="gesoNew">
        <p class="eyebrow">ながめ席</p>
        <h2 class="sheet-title">下足札 ― 心配を預ける</h2>
        <p>寄席の入口で履物を預けるように、考えごとを下足番に預けます。札を受け取ったら、引き取りの時間までは「預けてある」ことにします。</p>
        <div class="field"><label for="gesoText">預ける考えごと</label>
          <input type="text" id="gesoText" maxlength="80" placeholder="例：来週の面談のこと" autocomplete="off">
          <div class="examples"><span class="examples-k">一言で預けても大丈夫</span>${['仕事のこと', 'お金のこと', '体のこと', '人間関係のこと', '明日の予定', 'なんとなくの不安'].map(t =>
            `<button type="button" class="chip chip-sm" data-act="gesoChip" data-t="${t}">${t}</button>`).join('')}</div></div>
        <fieldset class="field"><legend>いつ引き取りに来る？</legend><div class="seg seg-wrap">${slots.map(s =>
          `<label><input type="radio" name="gesoWhen" value="${s.id}"${s.id === def ? ' checked' : ''}><span>${esc(s.label)}</span></label>`).join('')}</div></fieldset>
        <p class="muted small">寝る前に預けて、朝に引き取るのがおすすめです。夜の頭で考えた心配は、朝になると小さくなっていることがよくあります。</p>
        <button class="btn btn-primary btn-block" type="submit">預けて札を受け取る</button>
      </form>`, { label: '下足札' });
    }
    ACT.gesoChip = el => { const i = $('#gesoText'); if (i) { i.value = el.dataset.t; i.focus(); } };
    FORM.gesoNew = f => {
      const text = $('#gesoText', f).value.trim();
      if (!text) { $('#gesoText', f).focus(); toast('預ける考えごとを、一言で書いてください'); return; }
      const when = (f.querySelector('input[name="gesoWhen"]:checked') || {}).value || 'hour';
      const slots = gesoSlots();
      const slot = slots.find(s => s.id === when) || slots[0];
      const g = ng();
      g.gesoSeq += 1;
      const item = { id: uid(), no: g.gesoSeq, text, created: new Date().toISOString(), due: slot.due.toISOString(), status: 'held' };
      g.geso.push(item);
      const up = addXP(D.XP.geso);
      K.save();
      Sfx.pop();
      sheetBody().innerHTML = `<div class="yg-result">
        <div class="fuda fuda-big" role="img" aria-label="下足札 ${num(item.no)}番"><span class="fuda-no">${num(item.no)}</span><span class="fuda-ban">番</span></div>
        <p class="yg-result-say">たしかに、お預かりしました</p>
        <p>「${esc(text)}」は、${esc(fmtTime(item.due))}まで下足番が預かります。それまでにこの考えが浮かんだら、心の中で「札は預けてある」と言って、いまに戻りましょう。</p>
        <p class="xp-gain">経験 +${D.XP.geso}${up ? `　<strong>${esc(up)}に昇進しました</strong>` : ''}</p>
        <button class="btn btn-primary btn-block" data-act="closeAndRender">閉じる</button>
      </div>`;
      if (K.isRisky(text)) setTimeout(() => K.openSos(), 400);
    };
    const findGeso = id => ng().geso.find(x => x.id === id);
    ACT.gesoBack = el => {
      const x = findGeso(el.dataset.id); if (!x) return;
      const early = new Date(x.due).getTime() > Date.now();
      openSheet(`<div class="geso-back">
        <div class="fuda fuda-big" role="img" aria-label="下足札 ${num(x.no)}番"><span class="fuda-no">${num(x.no)}</span><span class="fuda-ban">番</span></div>
        <h2 class="sheet-title">札の引き取り</h2>
        ${early ? `<p class="muted small">引き取りは ${esc(fmtTime(x.due))} の予定でした。早めの引き取りでも大丈夫です。</p>` : ''}
        <blockquote class="boke-quote">「${esc(x.text)}」</blockquote>
        <p>預けてから、時間がたちました。いまも、この考えごとを考える必要がありますか？</p>
        <div class="btn-col"><button class="btn btn-primary" data-act="gesoLight" data-id="${x.id}">もう大丈夫。手放す</button>
        <button class="btn btn-ghost" data-act="gesoStill" data-id="${x.id}">まだ気になる</button></div>
      </div>`, { label: '札の引き取り' });
    };
    function gesoFinish(x, result) {
      x.status = 'back'; x.result = result; x.backAt = new Date().toISOString();
      const up = addXP(D.XP.gesoBack);
      K.save();
      return up;
    }
    ACT.gesoLight = el => {
      const x = findGeso(el.dataset.id); if (!x) return;
      const up = gesoFinish(x, 'light');
      Sfx.bell();
      sheetBody().innerHTML = `<div class="yg-result">
        <p class="yg-result-say">手放しました</p>
        <p>預けているあいだに、心配は小さくなっていたようです。そのときの気分や夜の頭で大きく見えていた心配は、時間をおくと小さくなることがあります。</p>
        <p class="xp-gain">経験 +${D.XP.gesoBack}${up ? `　<strong>${esc(up)}に昇進しました</strong>` : ''}</p>
        <button class="btn btn-primary btn-block" data-act="closeAndRender">閉じる</button>
      </div>`;
    };
    ACT.gesoStill = el => {
      const x = findGeso(el.dataset.id); if (!x) return;
      const up = gesoFinish(x, 'still');
      sheetBody().innerHTML = `<div class="geso-still">
        <p class="yg-result-say">では、考える時間をとりましょう</p>
        <p>15分だけ、この心配のために時間を使います。言い返せる考えなら漫才のネタに、行動で片づくことなら小さな一手に。</p>
        <div class="btn-col">
          <button class="btn btn-primary" data-act="gesoManzai" data-id="${x.id}">妖怪漫才のネタにする</button>
          <a class="btn btn-ghost" href="#omikuji">行動おみくじで小さな一手を引く</a>
          <button class="btn btn-ghost" data-act="gesoHara">ハラに灯して落ち着く</button>
        </div>
        <p class="xp-gain">経験 +${D.XP.gesoBack}${up ? `　<strong>${esc(up)}に昇進しました</strong>` : ''}</p>
      </div>`;
    };
    ACT.gesoManzai = el => { const x = findGeso(el.dataset.id); closeSheet(); K.startManzaiWith(x ? x.text : ''); };
    ACT.gesoHara = () => { closeSheet(); setTimeout(() => preSheet('hara'), 260); };

    // ============ キー操作・画面遷移 ============
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && RUN && !RUN.ended && !document.querySelector('#sheet-root .sheet-wrap')) endPanel();
    });
    window.addEventListener('hashchange', () => { if (RUN) closeRun(); });
  });
})();
