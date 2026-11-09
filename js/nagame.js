/* ココロ寄席 ― ながめ席
 * 理由のはっきりしない不安や、勝手に流れつづける考えを、ツッコまずに眺める演目。
 *   はっ（気づき）
 *   流す        ：灯籠ながし／下足札
 *   体に戻る    ：ハラに灯す／一服／ぎゅっとふわっ
 *   注意を育てる：間をはかる／お囃子の聞き分け
 *   おまかせ    ：いまの感じに合う2演目を自動でつなぐ（寝る前は「おやすみ席」）
 * app.js が用意する道具（CORE）を受け取って、画面と操作を登録する。
 */
(function () {
  'use strict';
  (window.KY_EXT = window.KY_EXT || []).push(function (K) {
    const { D, A, $, $$, esc, uid, ymd, today, pick, kanjiNum, toast, openSheet, closeSheet, sheetBody, addXP, hearts, VIEWS, ACT, FORM, Sfx, Voice, buzz } = K;
    const N = D.NAGAME;
    const PR = Object.fromEntries(N.practices.map(p => [p.id, p]));
    const STATE_BY = Object.fromEntries(N.states.map(s => [s.id, s]));
    const BODY_PRACTICES = ['hara', 'ippuku', 'gyuto', 'innerbody'];
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
    const fmtDelta = v => { const r = Math.round(v * 10) / 10; return r > 0 ? '−' + r : r < 0 ? '+' + (-r) : '±0'; };
    function todayKizuki() { const t = today(); return ng().kizuki.filter(iso => ymd(new Date(iso)) === t).length; }
    function practiceArt(id) {
      if (id === 'toro') return A.toro();
      if (id === 'ma') return A.cat();
      if (id === 'hara') return A.seated({ mini: true });
      if (id === 'ippuku') return A.chawan();
      if (id === 'gyuto') return A.seated({ mini: true });
      if (id === 'ohayashi') return A.instrument('taiko');
      if (id === 'innerbody') return A.seated({ mini: true, glow: true });
      if (id === 'imakoko') return '<span class="ik-mini" aria-hidden="true">いま<br>ここ</span>';
      if (id === 'elevator') return '<span class="ev-mini" aria-hidden="true"><b>のど</b>⇅</span>';
      return '<span class="fuda fuda-mini" aria-hidden="true"><span class="fuda-no">札</span></span>';
    }
    function allParts() { return ng().sessions.reduce((a, s) => a.concat(s.parts && s.parts.length ? s.parts : [s]), []); }
    // 演目ごとの「ざわざわ度の下がり幅」の平均（あなたに合う演目）
    function effects() {
      const m = {};
      ng().sessions.forEach(s => {
        if (typeof s.before !== 'number' || typeof s.after !== 'number') return;
        const k = s.practice === 'set' ? 'set:' + s.set : s.practice;
        if (!m[k]) m[k] = { sum: 0, n: 0 };
        m[k].sum += s.before - s.after; m[k].n += 1;
      });
      Object.keys(m).forEach(k => { m[k].avg = m[k].sum / m[k].n; });
      return m;
    }
    function keyName(k) { return k.indexOf('set:') === 0 ? (STATE_BY[k.slice(4)] || {}).omakaseName || 'おまかせ' : (PR[k] || {}).name || k; }
    function bestFit(m) {
      const total = Object.keys(m).reduce((a, k) => a + m[k].n, 0);
      if (total < 3) return null;
      const c = Object.keys(m).filter(k => m[k].n >= 2 && m[k].avg > 0).sort((a, b) => m[b].avg - m[a].avg)[0];
      return c ? Object.assign({ key: c }, m[c]) : null;
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
      const st = UI.state ? STATE_BY[UI.state] : null;
      const rec = st ? st.rec : [];
      const now = Date.now();
      const held = g.geso.filter(x => x.status === 'held').sort((a, b) => a.due.localeCompare(b.due));
      const sess = g.sessions;
      const rated = sess.filter(s => typeof s.before === 'number' && typeof s.after === 'number');
      const avg = k => rated.reduce((a, s) => a + s[k], 0) / rated.length;
      const parts = allParts();
      const toroN = parts.reduce((a, p) => a + (p.count || 0), 0);
      const maN = parts.reduce((a, p) => a + (p.gaps ? p.gaps.length : 0), 0);
      const back = g.geso.filter(x => x.status === 'back');
      const light = back.filter(x => x.result === 'light').length;
      const eff = effects();
      const best = bestFit(eff);
      const card = p => {
        const e = eff[p.id];
        return `<li><button class="ng-card${rec.includes(p.id) ? ' rec' : ''}" data-act="ngOpen" data-id="${p.id}">
          ${rec.includes(p.id) ? '<span class="rec-tag">おすすめ</span>' : ''}
          <span class="ng-art">${practiceArt(p.id)}</span>
          <span class="ng-body"><span class="ng-name">${esc(p.name)}</span><span class="ng-when">${esc(p.when)}</span>
          <span class="ng-min">${esc(p.min)}${e ? `<span class="ng-fit">あなたの平均 ${fmtDelta(e.avg)}（${e.n}回）</span>` : ''}</span></span>
        </button></li>`;
      };
      return `<header class="page-head"><h1 class="page-title">ながめ席</h1><p class="page-sub">ツッコまずに、ただ眺める演目</p></header>
      <p class="page-lead">理由のはっきりしない不安や、勝手に流れつづける考えには、言い返すより「眺める」ほうが合うことがあります。舞台をおりて客席に座り、頭の中のおしゃべりを眺めてみましょう。</p>

      <section class="kizuki" aria-label="気づき">
        <button class="kizuki-btn" id="kizukiBtn" data-act="ngKizuki"><span class="kizuki-main">はっ</span><span class="kizuki-sub">いま、考えにのまれてた</span></button>
        <div class="kizuki-side">
          <p class="kizuki-count">今日の気づき <strong id="kizukiToday">${todayKizuki()}</strong><small>回</small></p>
          <p class="muted small">考えに流されていたと気づいたら、タップ。気づけた瞬間、注意はもう、あなたの手に戻っています。</p>
          <p class="muted small">これまで <span id="kizukiTotal">${g.kizuki.length}</span>回</p>
        </div>
      </section>

      <section aria-labelledby="ng-state-h">
        <h2 id="ng-state-h" class="sec-title"><span>いまの感じは？</span></h2>
        <div class="chips" role="group" aria-label="いまの感じ">${N.states.map(s =>
          `<button class="chip${UI.state === s.id ? ' on' : ''}" aria-pressed="${UI.state === s.id}" data-act="ngState" data-id="${s.id}">${esc(s.label)}</button>`).join('')}</div>
        ${st ? `<button class="omakase" data-act="ngOmakase" data-id="${st.id}">
            <span class="omakase-k">${st.id === 'nemuri' ? '寝る前の、ひとつながり' : '選ばなくていい'}</span>
            <span class="omakase-t">${esc(st.omakaseName)}</span>
            <span class="omakase-s">${st.omakase.map(pid => esc(PR[pid].name)).join(' → ')}</span>
          </button>`
          : '<p class="muted small" style="margin-top:8px">選ぶと、合う演目を2つつないだ「おまかせ」が出ます。</p>'}
      </section>

      ${best ? `<section class="fit" aria-label="あなたに合う演目">
        <p class="fit-k">あなたに合う演目</p>
        <p>これまでの記録では、<strong>${esc(keyName(best.key))}</strong>のあと、ざわざわ度が平均 <strong>${fmtDelta(best.avg)}</strong> でした（${best.n}回）。</p>
        <button class="btn btn-small" data-act="ngFitGo" data-id="${esc(best.key)}">もう一度やる</button>
      </section>` : ''}

      <section aria-labelledby="ng-pr-h">
        <h2 id="ng-pr-h" class="sec-title"><span>演目</span></h2>
        ${N.groups.map(gr => `<div class="shelf">
          <h3 class="shelf-k">${esc(gr.label)}<small>${esc(gr.desc)}</small></h3>
          <ul class="ng-list">${N.practices.filter(p => p.group === gr.id).map(card).join('')}</ul>
        </div>`).join('')}
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
        : '<p class="empty">まだ記録がありません。演目をひとつ選ぶか、「いまの感じ」から、おまかせで始めてみましょう。</p>'}
      </section>

      <aside class="howto"><p class="howto-k">この席の考え方</p>
        <p>考えは、あなた自身ではありません。考えが流れていることに気づいている側が、あなたです。考えを止めることは目標にしません。注意は持っていかれてもいい。気づいて、向け直せたら、それで一本。</p>
        <p class="muted small" style="margin-top:8px">マインドフルネス、ACT、メタ認知療法（注意訓練・心配の先送り）、リラクセーション法と、エックハルト・トールやネドじゅんが紹介している「考えを眺める」「頭のおしゃべりから、いまの体の感覚に戻る」という考え方を参考にしています。特別な体験や、不安が消えることは約束しません。</p>
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
    ACT.ngOmakase = el => omakaseSheet(el.dataset.id);
    K.openOmakase = id => {
      if (K.current() !== 'nagame') { K.go('nagame'); setTimeout(() => omakaseSheet(id), 320); }
      else omakaseSheet(id);
    };
    ACT.ngFitGo = el => { const k = el.dataset.id; if (k.indexOf('set:') === 0) omakaseSheet(k.slice(4)); else if (k === 'geso') gesoForm(); else preSheet(k); };

    // ---- はじめる前のシート ----
    function stateField() {
      return `<fieldset class="field"><legend>いまの感じ <span class="opt">選ばなくてもOK</span></legend>
        <div class="seg seg-wrap">${N.states.map(s => `<label><input type="radio" name="ngSt" value="${s.id}"${UI.state === s.id ? ' checked' : ''}><span>${esc(s.label)}</span></label>`).join('')}</div>
      </fieldset>`;
    }
    function beforeField() { return K.scaleHtml({ id: 'ngBefore', label: 'いまのざわざわ度', type: 'zawa', value: 5 }); }
    function voiceField(on) {
      return Voice.can() ? `<label class="toggle"><input type="checkbox" id="ngVoice"${on ? ' checked' : ''}><span class="toggle-ui" aria-hidden="true"></span><span>音声ガイドで、目を閉じたまま進める</span></label>` : '';
    }
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
        ${voiceField(false)}`;
      } else if (id === 'ippuku') {
        extra = `<p class="note-card">お茶・水・白湯を一杯、用意してください。飲みものがなければ、両手でお椀の形をつくって「そこにお茶がある」と見立てても大丈夫です。</p>${voiceField(false)}`;
      } else if (id === 'gyuto') {
        extra = `<p class="note-card">力は<strong>7割くらい</strong>で。痛いところやけがのあるところは、力を入れずに「入れたつもり」のイメージだけで十分です。足がつりやすい方は、足の段は軽めに。</p>${voiceField(false)}`;
      } else if (id === 'ohayashi') {
        extra = `<p class="note-card">この演目は<strong>音を使います</strong>（効果音の設定がオフでも鳴ります）。イヤホンがあると、左右の音が聞き分けやすくなります。聞き分けられなくても、向け直そうとしたら一本です。</p>`;
      } else if (id === 'ma') {
        extra = '<p class="muted small">考えが浮かんだら「考えが来た」をタップします。5回で終わります。待っているあいだ、時間は表示しません。</p>';
      } else if (id === 'innerbody') {
        extra = `<p class="note-card">「何も感じない」も正解です。感じようと力まず、内側にそっと注意を置くだけで十分。体の内側に注意を向けると不安が強くなる方は、「ハラに灯す」の「外の感覚だけ」から始めてください。</p>${voiceField(false)}`;
      } else if (id === 'imakoko' || id === 'elevator') {
        extra = `<p class="note-card">深く吸おうとしなくて大丈夫。吐く息を少し長めに。息苦しくなったら、すぐにふつうの呼吸に戻してください。</p>${voiceField(false)}`;
      }
      openSheet(`<form class="form" data-form="ngStart" data-id="${id}">
        <p class="eyebrow">ながめ席・${esc((N.groups.find(g => g.id === p.group) || {}).label || '')}</p>
        <h2 class="sheet-title">${esc(p.name)}</h2>
        <p>${esc(p.desc)}</p>
        <p class="muted small">もとにした考え方：${esc(p.tech)}</p>
        ${stateField()}
        ${beforeField()}
        ${extra}
        <button class="btn btn-primary btn-block" type="submit">はじめる</button>
      </form>`, { label: p.name });
    }
    K.ngOpen = id => { if (PR[id]) preSheet(id); }; // しじまの「ほかの入口」から
    function omakaseSheet(stateId) {
      const st = STATE_BY[stateId]; if (!st) return;
      UI.state = stateId;
      const hasHara = st.omakase.includes('hara');
      openSheet(`<form class="form" data-form="ngStartSet" data-id="${st.id}">
        <p class="eyebrow">ながめ席・おまかせ</p>
        <h2 class="sheet-title">${esc(st.omakaseName)}</h2>
        <ol class="set-steps">${st.omakase.map(pid => `<li><b>${esc(PR[pid].name)}</b><span>${esc(PR[pid].min)}</span></li>`).join('')}</ol>
        <p class="muted small">ひとつ終わると、自動で次に進みます。途中でいつでも終われます。</p>
        ${beforeField()}
        ${hasHara ? `<label class="toggle"><input type="checkbox" id="ngOutside"><span class="toggle-ui" aria-hidden="true"></span><span>体の感覚が苦手なので、ハラに灯すは「外の感覚だけ」にする</span></label>` : ''}
        ${st.omakase.includes('ohayashi') ? '<p class="note-card">お囃子の聞き分けは音を使います。イヤホンがあるとおすすめです。</p>' : ''}
        ${voiceField(!!st.voice)}
        <button class="btn btn-primary btn-block" type="submit">はじめる</button>
      </form>`, { label: st.omakaseName });
    }

    FORM.ngStart = f => {
      const id = f.dataset.id;
      const stEl = f.querySelector('input[name="ngSt"]:checked');
      const sess = { id: uid(), date: new Date().toISOString(), practice: id, state: stEl ? stEl.value : null, before: K.scaleRead(f, 'ngBefore') };
      if (stEl) UI.state = stEl.value;
      const opts = {};
      if (id === 'toro') opts.sec = +((f.querySelector('input[name="ngLen"]:checked') || {}).value || 180);
      if (id === 'hara') opts.mode = (f.querySelector('input[name="ngMode"]:checked') || {}).value || 'body';
      const v = $('#ngVoice', f); opts.voice = !!(v && v.checked);
      closeSheet();
      startRun(id, sess, opts);
    };
    FORM.ngStartSet = f => {
      const st = STATE_BY[f.dataset.id]; if (!st) return;
      const sess = { id: uid(), date: new Date().toISOString(), practice: 'set', set: st.id, state: st.id, before: K.scaleRead(f, 'ngBefore'), parts: [] };
      const v = $('#ngVoice', f); const o = $('#ngOutside', f);
      const opts = { set: true, setName: st.omakaseName, total: st.omakase.length, queue: st.omakase.slice(1), voice: !!(v && v.checked), mode: o && o.checked ? 'outside' : 'body', sec: 60, rounds: 3 };
      closeSheet();
      startRun(st.omakase[0], sess, opts);
    };

    // ============ 演目の実行（夜の画面） ============
    function later(fn, ms) { const t = setTimeout(fn, ms); if (RUN) RUN.timers.push(t); return t; }
    function every(fn, ms) { const t = setInterval(fn, ms); if (RUN) RUN.intervals.push(t); return t; }
    function haltTimers() { if (!RUN) return; RUN.timers.forEach(clearTimeout); RUN.intervals.forEach(clearInterval); RUN.timers = []; RUN.intervals = []; }
    function stopAudio() { if (RUN && RUN.audio) { RUN.audio.stop(); RUN.audio = null; } Sfx.riverOff(); }
    function setGuide(t) { const g = $('#cGuide'); if (g) g.textContent = t; }
    const alive = id => !!(RUN && RUN.id === id && !RUN.ended);

    function startRun(id, sess, opts) {
      closeRun();
      const p = PR[id];
      const setNo = opts.set ? (opts.total - opts.queue.length) : 0;
      const title = opts.set ? `${esc(opts.setName)}<small>${setNo}/${opts.total}・${esc(p.name)}</small>` : esc(p.name);
      $('#calm-root').innerHTML = `<div class="calm calm-${id}" role="dialog" aria-modal="true" aria-label="${esc(p.name)}">
        <div class="calm-top"><p class="calm-title">${title}</p><span class="calm-timer" id="cTimer"></span><button class="calm-x" data-act="ngEnd">おわる</button></div>
        <div class="calm-scene" id="cScene"></div>
        <div class="calm-bar" id="cBar"></div>
      </div>`;
      document.body.classList.add('no-scroll');
      const part = opts.set ? { practice: id } : sess;
      RUN = { id, sess, part, opts, timers: [], intervals: [], ended: false, audio: null, i: -1 };
      ({ toro: runToro, ma: runMa, hara: runHara, ippuku: runIppuku, gyuto: runGyuto, ohayashi: runOhayashi, innerbody: runInnerbody, imakoko: runImakoko, elevator: runElevator })[id]();
      setTimeout(() => { const b = $('#cBar button'); if (b) b.focus({ preventScroll: true }); }, 60);
    }
    function closeRun() {
      haltTimers();
      stopAudio(); Voice.stop();
      RUN = null;
      const root = $('#calm-root');
      if (root) root.innerHTML = '';
      if (!document.querySelector('#sheet-root .sheet-wrap') && !$('#stage-root').childElementCount) document.body.classList.remove('no-scroll');
    }
    function pushPart() {
      if (!RUN || !RUN.opts.set || RUN.part.pushed) return;
      RUN.part.pushed = true;
      RUN.sess.parts.push(Object.assign({}, RUN.part, { pushed: undefined }));
    }
    // 演目が自然に終わったとき：おまかせなら次へ、そうでなければ終わりの画面へ
    function finishPart() {
      if (!RUN || RUN.ended) return;
      RUN.part.done = true; // 最後まで通した（伝説の出現条件に使う）
      if (RUN.opts.set && RUN.opts.queue.length) interPanel();
      else endPanel();
    }
    function interPanel() {
      haltTimers(); stopAudio(); Voice.stop();
      pushPart();
      const next = PR[RUN.opts.queue[0]];
      $('#cScene').innerHTML = `<div class="calm-end calm-inter">
        <p class="calm-note">ひとつめ、おつかれさまでした。</p>
        <p class="calm-end-k">つぎは「${esc(next.name)}」</p>
        <p class="calm-note">${esc(next.desc)}</p>
        <p class="inter-count" id="interCount" aria-live="polite">5</p>
      </div>`;
      $('#cBar').innerHTML = '<button class="btn btn-night-primary btn-block" data-act="ngNextPart">すすむ</button><button class="link-btn night" data-act="ngEnd">ここでおわる</button>';
      const tm = $('#cTimer'); if (tm) tm.textContent = '';
      if (RUN.opts.voice) Voice.speak('つぎは、' + next.name + '。', { force: true, rate: 0.9, pitch: 0.95 });
      let n = 5;
      every(() => { n -= 1; const c = $('#interCount'); if (c) c.textContent = String(Math.max(n, 0)); if (n <= 0) ACT.ngNextPart(); }, 1000);
    }
    ACT.ngNextPart = () => {
      if (!RUN || !RUN.opts.set || !RUN.opts.queue.length) return;
      const sess = RUN.sess;
      const opts = Object.assign({}, RUN.opts, { queue: RUN.opts.queue.slice(1) });
      const next = RUN.opts.queue[0];
      startRun(next, sess, opts);
    };

    // ---- 段を進む演目（ハラに灯す・一服・ぎゅっとふわっ・お囃子）の共通の画面 ----
    function guidedShell(figHtml, note, extraTop) {
      $('#cScene').innerHTML = `<div class="hara-wrap">
        ${extraTop || `<div class="hara-fig" id="gFig">${figHtml}</div>`}
        <div class="hara-card">
          <p class="hara-step" id="gStep"></p>
          <h2 class="hara-title" id="gTitle"></h2>
          <p class="hara-text" id="gText"></p>
          <p class="hara-breath" id="gSub" aria-live="polite"></p>
          <div class="hara-prog" aria-hidden="true"><i id="gProg"></i></div>
        </div>
      </div>`;
      $('#cBar').innerHTML = `<button class="btn btn-night-primary btn-block" id="gNext" data-act="gNext">次へ</button>
        <p class="calm-note">${note}${RUN.opts.voice ? '　音声ガイドは自動で進みます。' : ''}</p>`;
    }
    function stepTexts(i, title, text, sub) {
      $('#gStep').textContent = (i + 1) + ' / ' + RUN.steps.length;
      $('#gTitle').textContent = title;
      $('#gText').textContent = text;
      $('#gSub').textContent = sub || '';
      $('#gNext').textContent = i === RUN.steps.length - 1 ? (RUN.opts.set && RUN.opts.queue.length ? 'つぎの演目へ' : 'おわる') : '次へ';
    }
    function setProg(sec) {
      const p = $('#gProg'); if (!p) return;
      p.style.transition = 'none'; p.style.width = '0%'; void p.offsetWidth;
      p.style.transition = 'width ' + sec + 's linear'; p.style.width = '100%';
    }
    function speakGuide(t, o) { if (RUN && RUN.opts.voice) Voice.speak(t, Object.assign({ force: true, rate: 0.9, pitch: 0.95 }, o || {})); }
    ACT.gNext = () => { if (RUN && !RUN.ended && RUN.stepFn) { Voice.stop(); RUN.stepFn(RUN.i + 1); } };

    // ---- 灯籠ながし ----
    function runToro() {
      const sec = RUN.opts.sec || 180;
      Object.assign(RUN.part, { count: 0, labels: {}, holds: 0 });
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
      every(() => { left -= 1; tick(); if (left <= 0) { Sfx.bell(); finishPart(); } }, 1000);
      if (K.state().profile.sound) Sfx.riverOn();
    }
    function addToro(label) {
      if (!alive('toro')) return;
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
      RUN.part.count += 1;
      RUN.part.labels[label] = (RUN.part.labels[label] || 0) + 1;
      Sfx.plop();
      setGuide(N.toroGuide[(RUN.part.count - 1) % N.toroGuide.length]);
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
      if (el.classList.contains('held') || !alive('toro')) return;
      el.classList.add('held');
      RUN.part.holds += 1;
      setGuide('つかんでしまっても大丈夫。気づいたら、また、そっと流しましょう。');
      setTimeout(() => el.classList.remove('held'), 2200);
    };

    // ---- 間をはかる ----
    function runMa() {
      const rounds = RUN.opts.rounds || 5;
      Object.assign(RUN, { round: 0, rounds, phase: 'ready', t0: 0 });
      RUN.part.gaps = [];
      $('#cScene').innerHTML = `<div class="ma-room">
        <div class="ma-wall" aria-hidden="true"></div>
        <div class="ma-hole" aria-hidden="true"><div class="ma-mouse" id="maMouse">${A.mouse()}</div></div>
        <div class="ma-cat" id="maCat" aria-hidden="true">${A.cat()}</div>
        <p class="calm-guide" id="cGuide" aria-live="polite">ねこがネズミの穴を見張るように、次の考えが出てくるのを待ちます。考えが浮かんだら「考えが来た」をタップ。待っているあいだ、時間は表示しません。</p>
        <ol class="ma-dots" aria-label="${rounds}回のうち">${'<li></li>'.repeat(rounds)}</ol>
      </div>`;
      $('#cBar').innerHTML = '<button class="btn btn-night-primary btn-block" id="maBtn" data-act="maTap">待ちはじめる</button>';
    }
    function maWait() {
      if (!alive('ma')) return;
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
      if (!alive('ma')) return;
      clearTimeout(RUN.noneT);
      const gap = none ? 60 : (performance.now() - RUN.t0) / 1000;
      RUN.part.gaps.push({ s: Math.round(gap * 10) / 10, none: !!none });
      RUN.phase = 'rest';
      RUN.round += 1;
      $('.ma-room').classList.remove('waiting');
      const dot = $$('.ma-dots li')[RUN.round - 1]; if (dot) dot.classList.add('on');
      const cat = $('#maCat'); cat.classList.remove('twitch'); void cat.offsetWidth; cat.classList.add('twitch');
      if (!none) { const m = $('#maMouse'); m.classList.remove('peek'); void m.offsetWidth; m.classList.add('peek'); buzz(15); }
      setGuide(none ? '1分、何も出てきませんでした。その静けさが「間」です。' : '間 ' + gap.toFixed(1) + '秒。その考えは、見送ります。');
      const btn = $('#maBtn');
      btn.classList.remove('big');
      if (RUN.round >= RUN.rounds) {
        btn.disabled = true;
        later(() => { Sfx.bell(); finishPart(); }, 2400);
        return;
      }
      btn.textContent = '次を待つ';
      RUN.autoT = later(() => { if (RUN && RUN.phase === 'rest') maWait(); }, 3400);
    }
    ACT.maTap = () => {
      if (!alive('ma')) return;
      if (RUN.phase === 'wait') maCame(false); else maWait();
    };

    // ---- ハラに灯す ----
    function runHara() {
      const outside = RUN.opts.mode === 'outside';
      Object.assign(RUN, { steps: N.hara[outside ? 'outside' : 'body'], i: -1, stepFn: haraStep });
      RUN.part.mode = outside ? 'outside' : 'body';
      guidedShell(A.seated(), outside ? '外の感覚だけで進めます。' : '体に注意を向けて不安が強くなるときは、いつでも「おわる」を押してください。');
      const fig = $('#gFig');
      if (outside) fig.classList.add('outside');
      fig.style.setProperty('--fog', '1');
      haraStep(0);
    }
    function haraStep(i) {
      if (!alive('hara')) return;
      haltTimers();
      if (i >= RUN.steps.length) { Sfx.bell(); finishPart(); return; }
      RUN.i = i; RUN.part.steps = i + 1;
      const s = RUN.steps[i];
      const fig = $('#gFig');
      fig.dataset.part = s.part;
      fig.classList.remove('in', 'out');
      fig.style.setProperty('--fog', String(Math.max(0, 1 - (i + 1) / RUN.steps.length).toFixed(2)));
      stepTexts(i, s.title, s.text);
      setProg(s.sec);
      if (i > 0) buzz(15);
      speakGuide(s.title + '。' + s.text);
      if (s.breath) breathe(s.sec);
      later(() => haraStep(i + 1), s.sec * 1000);
    }
    function breathe(total) {
      const fig = $('#gFig'), txt = $('#gSub');
      let used = 0;
      const cycle = () => {
        if (!alive('hara') || used + 10 > total) return;
        used += 10;
        fig.classList.remove('out'); fig.classList.add('in'); txt.textContent = 'ふくらむ……';
        speakGuide('ふくらむ', { rate: 0.7, pitch: 0.9 });
        later(() => {
          fig.classList.remove('in'); fig.classList.add('out'); txt.textContent = 'しぼむ……';
          speakGuide('しぼむ', { rate: 0.7, pitch: 0.9 });
        }, 4000);
        later(cycle, 10000);
      };
      later(cycle, RUN.opts.voice ? 9000 : 1500);
    }

    // ---- 一服 ----
    function runIppuku() {
      Object.assign(RUN, { steps: N.ippuku, i: -1, stepFn: ippukuStep });
      guidedShell(A.chawan(), 'お茶・水・白湯で。なければ、両手でお椀の形をつくって「見立て」で。');
      $('#gFig').classList.add('ippuku');
      ippukuStep(0);
    }
    function ippukuStep(i) {
      if (!alive('ippuku')) return;
      haltTimers();
      if (i >= RUN.steps.length) { Sfx.bell(); finishPart(); return; }
      RUN.i = i; RUN.part.steps = i + 1;
      const s = RUN.steps[i];
      $('#gFig').dataset.part = s.part;
      stepTexts(i, s.title, s.text);
      setProg(s.sec);
      if (i > 0) buzz(15);
      speakGuide(s.title + '。' + s.text);
      later(() => ippukuStep(i + 1), s.sec * 1000);
    }

    // ---- ぎゅっとふわっ（漸進的筋弛緩法） ----
    function runGyuto() {
      Object.assign(RUN, { steps: N.gyuto, i: -1, stepFn: gyutoStep });
      guidedShell(A.seated(), '7割くらいの力で。痛いところやけがのあるところは、イメージだけで。');
      const fig = $('#gFig');
      fig.classList.add('gyuto');
      fig.style.setProperty('--fog', '0');
      gyutoStep(0);
    }
    function gyutoStep(i) {
      if (!alive('gyuto')) return;
      haltTimers();
      if (i >= RUN.steps.length) { Sfx.bell(); finishPart(); return; }
      RUN.i = i; RUN.part.steps = i + 1;
      const s = RUN.steps[i];
      const fig = $('#gFig');
      fig.dataset.part = s.part;
      fig.classList.remove('fuwa'); fig.classList.add('gyu');
      stepTexts(i, s.title + '　ぎゅっ', s.text, 'ぎゅっ…… 5');
      setProg(15);
      buzz([20, 40, 20]);
      speakGuide(s.title + '。' + s.text + '。ぎゅっ。');
      for (let k = 4; k >= 1; k--) later(() => { const sub = $('#gSub'); if (sub) sub.textContent = 'ぎゅっ…… ' + k; }, (5 - k) * 1000);
      later(() => {
        fig.classList.remove('gyu'); fig.classList.add('fuwa');
        $('#gTitle').textContent = s.title + '　ふわっ';
        $('#gText').textContent = s.relax;
        $('#gSub').textContent = 'ふわっ……';
        buzz(15);
        speakGuide(s.relax);
      }, 5000);
      later(() => gyutoStep(i + 1), 15000);
    }

    // ---- お囃子の聞き分け（注意訓練） ----
    function hayashiStart() {
      const c = Sfx.ctxAny(); if (!c) return null;
      try {
        const master = c.createGain();
        master.gain.setValueAtTime(0.0001, c.currentTime);
        master.gain.exponentialRampToValueAtTime(0.9, c.currentTime + 1.2);
        master.connect(c.destination);
        const pan = v => { if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = v; p.connect(master); return p; } return master; };
        const bus = { taiko: pan(-0.75), kane: pan(0.75), shami: pan(0.3), fue: pan(-0.3) };
        const env = (node, out, t, peak, dur, attack) => {
          const g = c.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(peak, t + (attack || 0.005));
          g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
          node.connect(g); g.connect(out);
        };
        const tone = (type, f0, f1, t, dur, out, peak, attack) => {
          const o = c.createOscillator(); o.type = type;
          o.frequency.setValueAtTime(f0, t);
          if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
          env(o, out, t, peak, dur, attack); o.start(t); o.stop(t + dur + 0.05);
        };
        const SH = [293.66, 311.13, 392, 440, 466.16, 587.33]; // 都節のような音階
        const FU = [783.99, 880, 932.33, 1046.5, 1174.66];
        const nb = Sfx.noise(c);
        const t0 = c.currentTime;
        const next = { taiko: t0 + 0.3, kane: t0 + 0.5, shami: t0 + 0.8, fue: t0 + 1.1 };
        let beat = 0;
        const schedule = () => {
          const ahead = c.currentTime + 0.6;
          while (next.taiko < ahead) {
            const t = next.taiko;
            tone('sine', 125, 50, t, 0.5, bus.taiko, 0.6);
            const s = c.createBufferSource(); s.buffer = nb;
            const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 320;
            s.connect(f); env(f, bus.taiko, t, 0.25, 0.08); s.start(t, Math.random() * 0.5, 0.12);
            next.taiko += (beat++ % 4 === 3) ? 0.55 : 1.1;
          }
          while (next.kane < ahead) {
            const t = next.kane;
            tone('triangle', 2350, 2300, t, 0.16, bus.kane, 0.09);
            tone('sine', 3500, 3450, t, 0.1, bus.kane, 0.04);
            next.kane += pick([0.28, 0.28, 0.56]);
          }
          while (next.shami < ahead) {
            const t = next.shami;
            const fr = pick(SH);
            const o = c.createOscillator(); o.type = 'sawtooth';
            o.frequency.setValueAtTime(fr * 1.012, t); o.frequency.exponentialRampToValueAtTime(fr, t + 0.05);
            const lp = c.createBiquadFilter(); lp.type = 'lowpass';
            lp.frequency.setValueAtTime(3200, t); lp.frequency.exponentialRampToValueAtTime(500, t + 0.35);
            o.connect(lp); env(lp, bus.shami, t, 0.11, 0.45, 0.002); o.start(t); o.stop(t + 0.5);
            next.shami += 0.45 + Math.random() * 0.45;
          }
          while (next.fue < ahead) {
            const t = next.fue;
            const fr = pick(FU);
            const dur = 1.4 + Math.random() * 1.4;
            const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(fr, t);
            const lfo = c.createOscillator(); lfo.frequency.value = 5.2;
            const lg = c.createGain(); lg.gain.value = fr * 0.008;
            lfo.connect(lg); lg.connect(o.frequency);
            env(o, bus.fue, t, 0.07, dur, 0.18);
            o.start(t); o.stop(t + dur + 0.05); lfo.start(t); lfo.stop(t + dur + 0.05);
            next.fue += dur + 0.4 + Math.random() * 0.6;
          }
        };
        schedule();
        const iv = setInterval(schedule, 200);
        return {
          stop() {
            clearInterval(iv);
            try {
              const t = c.currentTime;
              master.gain.cancelScheduledValues(t);
              master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), t);
              master.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
              setTimeout(() => { try { master.disconnect(); } catch (e) { /* noop */ } }, 1000);
            } catch (e) { /* noop */ }
          }
        };
      } catch (e) { return null; }
    }
    function runOhayashi() {
      Object.assign(RUN, { steps: N.ohayashi, i: -1, stepFn: hayashiStep });
      const top = `<div class="inst-row" id="instRow" aria-hidden="true">${N.instruments.map(x =>
        `<div class="inst" data-inst="${x.id}">${A.instrument(x.id)}<span>${esc(x.label)}</span></div>`).join('')}</div>`;
      guidedShell('', 'イヤホンがあると、左右の音が聞き分けやすくなります。聞き分けられなくても、向け直そうとしたら一本。', top);
      RUN.audio = hayashiStart();
      if (!RUN.audio) toast('この端末では音を出せないため、目で追う練習になります');
      hayashiStep(0);
    }
    function setFocus(id) {
      $$('#instRow .inst').forEach(el => el.classList.toggle('on', id === 'all' || el.dataset.inst === id));
      const row = $('#instRow'); if (row) row.classList.toggle('all', id === 'all');
    }
    function hayashiStep(i) {
      if (!alive('ohayashi')) return;
      haltTimers();
      if (i >= RUN.steps.length) { Sfx.bell(); finishPart(); return; }
      RUN.i = i; RUN.part.steps = i + 1;
      const s = RUN.steps[i];
      stepTexts(i, s.title, s.text);
      setProg(s.sec);
      if (i > 0) buzz(15);
      speakGuide(s.title, { rate: 1 });
      if (s.focus === 'switch') {
        let cur = 'fue';
        const hop = () => {
          if (!alive('ohayashi')) return;
          const opts = N.instruments.map(x => x.id).filter(x => x !== cur);
          cur = pick(opts);
          setFocus(cur);
          const lab = N.instruments.find(x => x.id === cur).label;
          const sub = $('#gSub'); if (sub) sub.textContent = '→ ' + lab;
          buzz(10);
        };
        hop();
        every(hop, 4000);
      } else {
        setFocus(s.focus);
      }
      later(() => hayashiStep(i + 1), s.sec * 1000);
    }

    // ---- インナーボディ ----
    function runInnerbody() {
      Object.assign(RUN, { steps: N.innerbody, i: -1, stepFn: innerStep });
      guidedShell(A.seated({ glow: true }), '何も感じなくても大丈夫。内側に、そっと注意を置くだけ。');
      const fig = $('#gFig');
      fig.classList.add('ib');
      fig.style.setProperty('--fog', '0');
      innerStep(0);
    }
    function innerStep(i) {
      if (!alive('innerbody')) return;
      haltTimers();
      if (i >= RUN.steps.length) { Sfx.bell(); finishPart(); return; }
      RUN.i = i; RUN.part.steps = i + 1;
      const s = RUN.steps[i];
      const fig = $('#gFig');
      fig.classList.add('lit-' + s.lit); // 光は積み重なっていく（手 → 腕 → 足 → 胴体 → 全身）
      stepTexts(i, s.title, s.text);
      setProg(s.sec);
      if (i > 0) buzz(15);
      speakGuide(s.title + '。' + s.text);
      later(() => innerStep(i + 1), s.sec * 1000);
    }

    // ---- 今ここ呼吸 ----
    function runImakoko() {
      const C = N.imakoko;
      Object.assign(RUN.part, { breaths: 0, backs: 0 });
      RUN.i = -1;
      $('#cScene').innerHTML = `<div class="ik-wrap">
        <div class="ik-ring" id="ikRing"><span id="ikWord">いま</span></div>
        <p class="ik-count" id="ikCount">0 / ${C.breaths}</p>
        <p class="calm-note ik-note">吸うときに「いま」、吐くときに「ここ」。息と言葉をそろえます。</p>
        <p class="ik-back" aria-live="polite">もどった回数 <strong id="ikBack">0</strong></p>
      </div>`;
      $('#cBar').innerHTML = `<button class="btn btn-night-primary btn-block" data-act="ikBack">考えにそれてた → もどった</button>
        <p class="calm-note">それたことに気づいて、戻ってこられたらタップ。戻れた回数が、この演目の一本です。${RUN.opts.voice ? '　音声ガイドつき。' : ''}</p>`;
      const ring = $('#ikRing'), word = $('#ikWord');
      const breathe = n => {
        if (!alive('imakoko')) return;
        if (n >= C.breaths) { Sfx.bell(); finishPart(); return; }
        ring.classList.remove('out'); ring.style.transitionDuration = C.inhale + 's'; ring.classList.add('in');
        word.textContent = 'いま';
        speakGuide('いま', { rate: 0.7 });
        later(() => {
          if (!alive('imakoko')) return;
          ring.classList.remove('in'); ring.style.transitionDuration = C.exhale + 's'; ring.classList.add('out');
          word.textContent = 'ここ';
          speakGuide('ここ', { rate: 0.6 });
        }, C.inhale * 1000);
        later(() => {
          if (!alive('imakoko')) return;
          RUN.part.breaths = n + 1; RUN.part.steps = n + 1;
          const c = $('#ikCount'); if (c) c.textContent = (n + 1) + ' / ' + C.breaths;
          breathe(n + 1);
        }, (C.inhale + C.exhale) * 1000);
      };
      later(() => breathe(0), 800);
    }
    ACT.ikBack = () => {
      if (!alive('imakoko')) return;
      RUN.part.backs += 1;
      const b = $('#ikBack'); if (b) { b.textContent = RUN.part.backs; b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
      Sfx.bell(); buzz(15);
    };

    // ---- エレベーターの呼吸（ネドじゅん） ----
    // のどの「まるい床」を、吸う息でおなかの底へ下ろし、吐く息でのどへ上げる。この往復をくり返す。
    // 向きは逆（吸って上がる・吐いて下りる）も選べる。質より量なので、通算の往復数を数える。
    function evDiscAt(down, sec) {
      const E = N.elevator; const d = $('#evDisc'); if (!d) return;
      d.style.transitionDuration = (sec || 0) + 's';
      d.style.transform = down ? `translate(100px, ${E.bellyY}px) scale(2.6, 2.2)` : `translate(100px, ${E.throatY}px) scale(1, 1)`;
      const fl = $('#evFloor'); if (fl) fl.textContent = down ? 'おなかの底' : 'のど';
      const ar = $('#evArrow'); if (ar) ar.textContent = down ? '▼' : '▲';
    }
    function evDirLabel() { return RUN.evDir === 'out' ? '吸って上がる・吐いて下りる' : '吸って下りる・吐いて上がる'; }
    function runElevator() {
      const E = N.elevator; const g = ng();
      Object.assign(RUN, { i: -1, evDir: g.evDir === 'out' ? 'out' : 'in', evTarget: E.rounds });
      Object.assign(RUN.part, { rounds: 0, steps: 0, dir: RUN.evDir });
      const panel = `<div class="ev-row">
        <div class="ev-panel" aria-hidden="true">
          <div class="ev-display"><span class="ev-arrow" id="evArrow">●</span><span class="ev-floor" id="evFloor">のど</span></div>
          <p class="ev-count"><b id="evCount">0</b><small> / <span id="evOf">${E.rounds}</span><br>往復</small></p>
          <p class="ev-total">通算<br><b id="evTotal">${g.evTotal || 0}</b> 往復</p>
        </div>
        <div class="hara-fig ev-fig" id="gFig">${A.seated()}</div>
      </div>`;
      guidedShell('', 'のどの床を、息にあわせて上げ下げします。', panel);
      const svg = $('svg', $('#gFig'));
      if (svg) svg.insertAdjacentHTML('beforeend', `<g class="ev-disc" id="evDisc"><ellipse cx="0" cy="0" rx="11" ry="3.6" class="ev-floor-shape"/><ellipse cx="0" cy="-1" rx="7" ry="1.6" class="ev-floor-shine"/></g>`);
      evDiscAt(RUN.evDir === 'out', 0);
      $('#gStep').textContent = '準備';
      $('#gTitle').textContent = 'のどに、まるい床';
      $('#gText').textContent = E.intro;
      $('#gSub').textContent = '向き：' + evDirLabel();
      $('#gNext').textContent = 'はじめる';
      $('#cBar').insertAdjacentHTML('beforeend', '<button class="link-btn night" data-act="evDir" id="evDirBtn">向きを入れかえる</button>');
      RUN.stepFn = () => { RUN.stepFn = null; const b = $('#gNext'); if (b) b.hidden = true; const d = $('#evDirBtn'); if (d) d.remove(); evRound(0); };
      speakGuide('のどのあたりに、まるい床をイメージします。');
      setProg(E.introSec);
      later(() => { if (alive('elevator') && RUN.stepFn) RUN.stepFn(); }, E.introSec * 1000);
    }
    ACT.evDir = () => {
      if (!alive('elevator')) return;
      RUN.evDir = RUN.evDir === 'out' ? 'in' : 'out';
      ng().evDir = RUN.evDir; RUN.part.dir = RUN.evDir; K.save();
      evDiscAt(RUN.evDir === 'out', 0.4);
      $('#gSub').textContent = '向き：' + evDirLabel();
      buzz(8);
    };
    function evRound(n) {
      if (!alive('elevator')) return;
      const E = N.elevator;
      if (n >= RUN.evTarget) { evRest(); return; }
      RUN.i = n;
      const downOnIn = RUN.evDir !== 'out';
      $('#gStep').textContent = (n + 1) + ' 往復目';
      $('#gTitle').textContent = n < 2 ? 'エレベーターの呼吸' : 'くり返す';
      $('#gText').textContent = E.tips[Math.floor(n / 3) % E.tips.length];
      $('#gSub').textContent = downOnIn ? '吸いながら……おなかの底へ' : '吸いながら……のどへ';
      speakGuide(downOnIn ? '吸って、下へ' : '吸って、上へ', { rate: 0.75 });
      setProg(E.inhale + E.exhale);
      evDiscAt(downOnIn, E.inhale);
      later(() => {
        if (!alive('elevator')) return;
        $('#gSub').textContent = downOnIn ? '吐きながら……のどへ' : '吐きながら……おなかの底へ';
        speakGuide(downOnIn ? '吐いて、上へ' : '吐いて、下へ', { rate: 0.75 });
        evDiscAt(!downOnIn, E.exhale);
      }, E.inhale * 1000);
      later(() => {
        if (!alive('elevator')) return;
        const g = ng();
        RUN.part.rounds += 1; RUN.part.steps = RUN.part.rounds;
        g.evTotal = (g.evTotal || 0) + 1;
        if (RUN.part.rounds === 10 && K.mark) K.mark('elev10');
        const c = $('#evCount'); if (c) c.textContent = RUN.part.rounds;
        const t = $('#evTotal'); if (t) t.textContent = g.evTotal;
        if (RUN.part.rounds % 5 === 0) Sfx.elev();
        evRound(n + 1);
      }, (E.inhale + E.exhale) * 1000);
    }
    function evRest() { // 区切り：もう10往復か、おわるか（質より量）
      if (!alive('elevator')) return;
      const E = N.elevator;
      K.save(); Sfx.bell();
      $('#gStep').textContent = RUN.part.rounds + ' 往復';
      $('#gTitle').textContent = 'ひと区切り';
      $('#gText').textContent = 'エレベーターの呼吸は、質より量。くり返すほど、なじんでいきます。続けるなら、もう' + E.more + '往復。';
      $('#gSub').textContent = '';
      const b = $('#gNext');
      if (b) {
        b.hidden = false;
        b.insertAdjacentHTML('beforebegin', `<button class="btn btn-night-ghost btn-block" data-act="evMore">もう${E.more}往復</button>`);
        b.textContent = RUN.opts.set && RUN.opts.queue.length ? 'つぎの演目へ' : 'おわる';
      }
      RUN.stepFn = () => { RUN.stepFn = null; finishPart(); };
    }
    ACT.evMore = () => {
      if (!alive('elevator')) return;
      const E = N.elevator;
      RUN.evTarget = RUN.part.rounds + E.more;
      const of = $('#evOf'); if (of) of.textContent = RUN.evTarget;
      const m = $('[data-act="evMore"]'); if (m) m.remove();
      const b = $('#gNext'); if (b) b.hidden = true;
      RUN.stepFn = null;
      evRound(RUN.part.rounds);
    };

    // ---- 終わり（ざわざわ度の後） ----
    function partSummary(p) {
      switch (p.practice) {
        case 'toro': {
          const top = Object.entries(p.labels || {}).sort((a, b) => b[1] - a[1]);
          return p.count
            ? `<p class="end-big">${p.count}<small>個の灯籠を流しました</small></p>
               <ul class="label-tally">${top.slice(0, 5).map(([l, c]) => `<li><span>${esc(l)}</span><b>${c}</b></li>`).join('')}</ul>
               <p class="calm-note">いちばん多かったのは「${esc(top[0][0])}」の灯籠。どんな考えがよく流れてくるかを知るのも、眺める練習です。</p>
               ${p.holds ? `<p class="calm-note">灯籠を${p.holds}回つかみました。つかんだと気づいて、また流せたなら、それで十分です。</p>` : ''}`
            : '<p class="calm-note">灯籠は流しませんでした。川を眺めていただけでも、立派なながめ席です。</p>';
        }
        case 'ma': {
          const gs = p.gaps || [];
          const max = Math.max(10, ...gs.map(g => g.s));
          return gs.length
            ? `<p class="end-big">${gs.length}<small>回、間に気づきました</small></p>
               <div class="ma-bars">${gs.map((g, i) => `<div class="ba-line"><span class="ba-tag">${i + 1}回目</span><span class="ba-track"><i class="ba-fill after" style="width:${Math.min(100, g.s / max * 100)}%"></i></span><span class="ba-v">${g.none ? '60秒〜' : g.s.toFixed(1) + '秒'}</span></div>`).join('')}</div>
               <p class="calm-note">間の長さに、よい・わるいはありません。考えと考えのあいだにすきまがあること、そのすきまに気づいているのがあなたであること。それに気づけたら十分です。</p>`
            : '<p class="calm-note">今回は待たずに終わりました。それでも大丈夫です。</p>';
        }
        case 'hara':
          return `<p class="end-big">${p.steps || 1}<small> / 5 段</small></p>
            <p class="calm-note">頭のまわりの煙は、少し薄くなったでしょうか。薄くならなくても、注意を下ろそうとしたこと自体が練習です。</p>`;
        case 'ippuku':
          return `<p class="end-big">${p.steps || 1}<small> / 5 段</small></p>
            <p class="calm-note">一碗に心を向けているあいだ、頭のおしゃべりは少し席を外していたでしょうか。</p>`;
        case 'gyuto':
          return `<p class="end-big">${p.steps || 1}<small> / 5 段</small></p>
            <p class="calm-note">ゆるんだ感じが少しでも残っていたら、それを覚えておいてください。「ゆるめ方」は、体が覚えていきます。</p>`;
        case 'ohayashi':
          return `<p class="end-big">${p.steps || 1}<small> / 6 段</small></p>
            <p class="calm-note">注意は、向け直せます。聞き分けられなくても、離れたことに気づいて戻そうとしたなら、それで一本です。</p>`;
        case 'innerbody':
          return `<p class="end-big">${p.steps || 1}<small> / 6 段</small></p>
            <p class="calm-note">手の内側の、あの「生きている感じ」。何も感じなかった段があっても、注意を内側に向けたこと自体が練習です。</p>`;
        case 'imakoko':
          return `<p class="end-big">${p.breaths || 0}<small> 呼吸</small></p>
            ${p.backs ? `<p class="calm-note">考えにそれて、<strong>${p.backs}回</strong>もどってきました。それたことではなく、戻れたことが一本です。</p>` : '<p class="calm-note">「いま」と「ここ」。それていたら、いつでも戻ってこられます。</p>'}`;
        case 'elevator':
          return `<p class="end-big">${p.rounds || 0}<small> 往復</small></p>
            <p class="calm-note">通算 <strong>${ng().evTotal || 0}</strong> 往復。のどからおなかへ、おなかからのどへ。頭のおしゃべりに気づいたら、またエレベーターを動かせばいい。</p>`;
        default: return '';
      }
    }
    function endPanel() {
      if (!RUN || RUN.ended) return;
      RUN.ended = true;
      haltTimers(); stopAudio(); Voice.stop();
      pushPart();
      const s = RUN.sess;
      const summary = RUN.opts.set
        ? `<p class="end-big">${s.parts.length}<small> / ${RUN.opts.total} 演目</small></p>
           <ul class="set-done">${s.parts.map(p => `<li>${esc(PR[p.practice].name)}</li>`).join('')}</ul>
           ${partSummary(s.parts[s.parts.length - 1] || {})}`
        : partSummary(RUN.part);
      $('#cScene').innerHTML = `<div class="calm-end">
        <p class="calm-end-k">おつかれさまでした</p>
        ${summary}
        ${K.isNum(s.before) ? K.scaleHtml({ id: 'ngAfter', label: 'いまのざわざわ度', type: 'zawa', value: s.before, was: 'はじめる前は ' + K.scaleLabel('zawa', s.before) }) : ''}
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
      s.after = K.isNum(s.before) ? K.scaleRead($('#cScene'), 'ngAfter') : null;
      const g = ng();
      g.sessions.unshift(s);
      if (g.sessions.length > 1000) g.sessions.length = 1000;
      const firstPractice = s.practice === 'set' ? ((s.parts[0] || {}).practice) : s.practice;
      const yid = s.state && STATE_BY[s.state] ? STATE_BY[s.state].yokai : (BODY_PRACTICES.includes(firstPractice) ? 'enenra' : 'nurarihyon');
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
        ${K.isNum(s.before) && K.isNum(s.after) ? `<p class="mk-result-num">${s.before}<span>→</span>${s.after}</p>` : ''}
        <p>${!(K.isNum(s.before) && K.isNum(s.after)) ? '眺めたこと自体が、注意の練習です。おつかれさまでした。'
          : d < 0 ? 'ざわざわ度が ' + (-d) + ' 下がりました。'
          : d === 0 ? 'ざわざわ度は変わりませんでした。変わらない日も、眺めたことは練習になっています。'
            : 'ざわざわ度が上がりました。体や考えに注意を向けると、かえってざわつくこともあります。そんなときは「外の感覚だけ」や「お囃子の聞き分け」、休憩所の呼吸を試してください。'}</p>
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
        <p class="eyebrow">ながめ席・流す</p>
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
