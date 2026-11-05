/* ココロ寄席 ― トリ「笑い噺」（第七回：docs/EXPERT_DEBATE_7.md）
 * 世界は、相方。出来事は世界からのネタ振り。全部をよいことにしなくていい。受けて、ひとこと返す。
 *   ・しくじり噺：できごと → 芸人の目（6つのレンズ）→ 噺にまとめる（フリ・しくじり・オチ）→ 高座で一席 → いまの重さ
 *     笑いには距離が要る。重い出来事は「まだ笑いにしなくていい」と伝え、ほかの演目を案内する。
 *     自分を下げることば（自虐）が入ったら、「人間らしさを愛でる笑い」へそっと声をかける（業の肯定）。
 *   ・世界のボケ拾い：その日見つけた「おかしみ」を3つ（ポジティブ心理学の「三つのおもしろかったこと」を参考に）
 *   ・噺帳：つくった噺を、何度でも高座にかけられる
 */
(function () {
  'use strict';
  (window.KY_EXT = window.KY_EXT || []).push(function (K) {
    const { D, A, $, $$, esc, nl2br, uid, ymd, today, fmtMD, toast, openSheet, closeSheet, confirmSheet, addXP, VIEWS, ACT, BIND, FORM, Sfx, Voice, buzz, reduceMotion, isRisky, openSos } = K;
    const HN = D.HANASHI;
    const LENS = Object.fromEntries(HN.lenses.map(l => [l.id, l]));
    const OCHI_PH = {
      hiki: '例：地球から見たら、ほほえましい一コマ',
      juunen: '例：いまでは、鉄板の持ちネタです',
      ningen: '例：急いでたんだよね。人間だもの',
      saiou: '例：このシャツが、話のきっかけになる……かもね',
      jikkyo: '例：解説「攻めてますね」',
      aruaru: '例：急いでいる朝ほど、服は裏返る'
    };
    const STEPS = ['できごと', '芸人の目', '噺', '高座'];
    const HEAVY = 70;

    function hs() {
      const S = K.state();
      if (!S.hanashi) S.hanashi = {};
      const h = S.hanashi;
      h.stories = h.stories || []; h.okashi = h.okashi || [];
      if (h.draft === undefined) h.draft = null;
      return h;
    }
    const dr = () => hs().draft;
    function newDraft(event) {
      return { id: uid(), open: true, step: 0, event: String(event || '').slice(0, 200), weightBefore: 50, weightAfter: 50, lens: null, lensText: '', zoom: 0, furi: '', ochi: '', title: '', heavyAck: false, performed: false };
    }
    let RESULT = null;
    const isToday = iso => ymd(new Date(iso)) === today();
    const selfDownIn = t => HN.selfDown.find(w => String(t || '').includes(w));
    const enable = (id, ok) => { const b = document.getElementById(id); if (b) b.disabled = !ok; };

    K.openHanashi = event => {
      const h = hs();
      h.draft = newDraft(event);
      RESULT = null;
      K.save();
      K.go('hanashi');
    };

    // ============ 入口 ============
    VIEWS.hanashi = function () {
      const d = dr();
      if (d && d.open) return flow(d);
      const h = hs();
      const todays = h.okashi.filter(o => isToday(o.date));
      const past = h.okashi.filter(o => !isToday(o.date)).slice(0, 30);
      return `<header class="page-head"><p class="eyebrow">トリ</p><h1 class="page-title">笑い噺</h1><p class="page-sub">ちいさなしくじりを、10年後の笑い話に。</p></header>

      ${RESULT ? resultCard(RESULT) : ''}

      <section class="aikata" aria-labelledby="aikata-h">
        <div class="aikata-art" aria-hidden="true">${A.you('happy')}<span class="aikata-mic">${A.mic()}</span><span class="aikata-world"></span></div>
        <div class="aikata-body">
          <h2 id="aikata-h" class="aikata-t">世界は、相方。</h2>
          <p>出来事は、世界からの<strong>ネタ振り</strong>。全部をよいことにしなくていい。ときどき世界は、ひどいボケもかましてきます。受けとめて、ひとこと返す。それがココロ寄席の、トリの演目です。</p>
        </div>
      </section>

      ${d && !d.open ? `<div class="hn-resume"><p>書きかけの噺があります：「${esc(d.event || '（まだ白紙）')}」</p><div class="btn-row"><button class="btn btn-ghost" data-act="hnDrop">捨てる</button><button class="btn btn-primary" data-act="hnResume">続きから</button></div></div>` : ''}

      <section class="hn-card" aria-labelledby="hn-make-h">
        <p class="hn-k">一席つくる</p>
        <h2 id="hn-make-h" class="hn-t">しくじり噺</h2>
        <p class="hn-d">今日のちいさなしくじりを、6つの「芸人の目」で眺めて、フリ・しくじり・オチの三段に。最後は、あなたが噺家になって高座で一席。</p>
        <ul class="lens-mini">${HN.lenses.map(l => `<li>${esc(l.name)}</li>`).join('')}</ul>
        <button class="btn btn-primary btn-block" data-act="hnStart">噺をつくる</button>
        <p class="hn-note">笑いには距離が要ります。ずっしり重い出来事は、まだ笑いにしなくて大丈夫です。</p>
      </section>

      <section class="okashi" aria-labelledby="okashi-h">
        <h2 id="okashi-h" class="sec-title"><span>世界のボケ拾い</span></h2>
        <p class="okashi-lead">世界は、けっこうボケています。今日見つけた「おかしみ」を3つまで。拾ったら、ひとことツッコんでもOK。</p>
        <p class="okashi-count" aria-live="polite">今日のおかしみ <strong>${todays.length}</strong><small>/3</small></p>
        ${todays.length ? `<ul class="okashi-list">${todays.map(okItem).join('')}</ul>` : ''}
        ${todays.length < 3 ? `<form class="okashi-form" data-form="okashiAdd">
          <label for="okT">見つけたおかしみ</label>
          <input type="text" id="okT" name="t" maxlength="80" required placeholder="例：「とまれ」の看板が、ちょっと傾いていた" autocomplete="off">
          <label for="okTk">ひとことツッコミ <span class="opt">なくてもOK</span></label>
          <input type="text" id="okTk" name="tk" maxlength="40" placeholder="例：看板のほうが止まりそうやん！" autocomplete="off">
          <button class="btn btn-primary" type="submit">拾った</button>
        </form>` : '<p class="okashi-done">今日のおかしみ、3つそろいました。笑いを見つける目が、育っています。</p>'}
        <p class="okashi-hint"><span>さがす場所のヒント</span>${HN.bokeCats.map(c => `<em>${esc(c)}</em>`).join('')}</p>
        ${past.length ? `<details class="okashi-past"><summary>おかしみ帳（${h.okashi.length}こ）</summary><ul class="okashi-list">${past.map(okItem).join('')}</ul></details>` : ''}
      </section>

      <section class="hncho" aria-labelledby="hncho-h">
        <h2 id="hncho-h" class="sec-title"><span>噺帳</span></h2>
        ${h.stories.length ? `<ul class="hn-list">${h.stories.map(storyItem).join('')}</ul>` : '<p class="muted small">まだ噺はありません。最初の一席を、どうぞ。</p>'}
      </section>

      <aside class="howto"><p class="howto-k">この演目のねらい</p>
        <p>チャップリンは「人生はクローズアップで見れば悲劇、ロングショットで見れば喜劇」と言いました。時間・空間・視点の<strong>距離</strong>をとると、同じ出来事が少し軽く見えます。落語は、人間の弱さを責めずに笑う芸（業の肯定）。自分を下げる笑いではなく、「人間らしいなあ」と愛でる笑いを。毎日「おもしろかったこと」を3つ書きとめる練習は、気分を明るくする効果が研究で報告されています。</p>
        <p class="muted small">つらすぎる出来事や、だれかを傷つける笑いは、ここでは扱いません。しんどいときは、妖怪漫才・ながめ席・休憩所へ。</p>
      </aside>`;
    };
    function okItem(o) {
      return `<li class="okashi-item"><span class="ok-t">${esc(o.t)}</span>${o.tk ? `<span class="ok-tk">${esc(o.tk)}</span>` : ''}<span class="ok-d">${esc(fmtMD(o.date))}</span><button class="link-btn ok-del" data-act="okashiDel" data-id="${o.id}" aria-label="このおかしみを消す">消す</button></li>`;
    }
    function storyItem(s) {
      const L = LENS[s.lens] || { name: '' };
      const d = s.weightBefore - s.weightAfter;
      return `<li class="hn-item">
        <p class="hn-item-t">『${esc(s.title || autoTitle(s))}』</p>
        <p class="hn-item-ochi">${esc(s.ochi)}</p>
        <p class="hn-item-meta">${esc(fmtMD(s.date))}・${esc(L.name)}・重さ ${s.weightBefore} → ${s.weightAfter}${d > 0 ? `（−${d}）` : ''}</p>
        <div class="btn-row"><button class="btn btn-small btn-ghost" data-act="hnDel" data-id="${s.id}">消す</button><button class="btn btn-small btn-primary" data-act="hnReplay" data-id="${s.id}">高座で一席</button></div>
      </li>`;
    }
    function autoTitle(s) { const t = String(s.event || '').replace(/[。、！？\s]+$/, ''); return t.length > 12 ? t.slice(0, 12) + '…' : t || 'しくじり'; }
    function resultCard(r) {
      const d = r.before - r.after;
      return `<section class="hn-result" aria-live="polite">
        <p class="hn-result-k">噺帳にしまいました</p>
        <p class="hn-result-t">『${esc(r.title)}』</p>
        <p class="hn-result-w">出来事の重さ <strong>${r.before}</strong> → <strong>${r.after}</strong></p>
        <p>${d > 0 ? '出来事は変わらなくても、持ち方は変えられる。お後がよろしいようで。' : '重さが変わらなくても大丈夫。語り手の席に一度座ったことが、次の距離になります。'}</p>
        ${r.up ? `<p class="xp-gain"><strong>${esc(r.up)}に昇進しました</strong></p>` : ''}
      </section>`;
    }

    // ============ しくじり噺：流れ ============
    function head(i) {
      return `<div class="wiz-head"><button class="link-btn" data-act="hnQuit">やめる</button>
        <ol class="steps" aria-label="噺づくりの進み具合">${STEPS.map((s, k) => `<li class="${k < i ? 'done' : k === i ? 'now' : ''}"${k === i ? ' aria-current="step"' : ''}><span>${s}</span></li>`).join('')}</ol></div>`;
    }
    function nav(prev, id, label, ok) {
      return `<div class="wiz-nav">${prev ? '<button class="btn btn-ghost" data-act="hnPrev">もどる</button>' : '<span></span>'}<button class="btn btn-primary" id="${id}" data-act="hnNext"${ok ? '' : ' disabled'}>${esc(label)}</button></div>`;
    }
    function flow(d) {
      if (d.step === 0) return stepEvent(d);
      if (d.step === 1) return stepLens(d);
      if (d.step === 2) return stepCompose(d);
      return stepAfter(d);
    }
    function stepEvent(d) {
      return `${head(0)}
      <h1 class="wiz-title">どんな、しくじり？</h1>
      <p class="wiz-lead">今日（最近）の、ちいさなしくじりやハプニングを一行で。</p>
      <div class="field">
        <label for="hnEvent">できごと</label>
        <textarea id="hnEvent" rows="2" maxlength="200" placeholder="例：大事な会議の日に、シャツを裏返しに着ていた" data-bind="hnEvent">${esc(d.event)}</textarea>
        <div class="examples"><span class="examples-k">例から選ぶ</span>${HN.examples.map((t, i) => `<button class="chip chip-sm" data-act="hnEx" data-i="${i}">${esc(t)}</button>`).join('')}</div>
      </div>
      <div class="field">
        <label for="hnWb">この出来事、いまの重さは？ <output id="hnWbOut">${d.weightBefore}</output></label>
        <input type="range" id="hnWb" min="0" max="100" step="5" value="${d.weightBefore}" data-out="hnWbOut" data-bind="hnWb">
        <div class="range-scale"><span>かるい</span><span>ずっしり</span></div>
        <p class="hn-heavy-hint" id="hnHeavyHint"${d.weightBefore >= HEAVY ? '' : ' hidden'}>かなり重そうです。笑いには距離が要るので、無理に笑いにしなくて大丈夫です。</p>
      </div>
      ${nav(false, 'hnNextBtn', '芸人の目へ', d.event.trim().length >= 2)}`;
    }
    function stepLens(d) {
      const L = LENS[d.lens];
      return `${head(1)}
      <h1 class="wiz-title">芸人の目で、見てみる</h1>
      <p class="wiz-lead">6つのレンズから、ひとつ。ピンとくるものでOK。</p>
      <blockquote class="boke-quote hn-ev">「${esc(d.event)}」</blockquote>
      <div class="lens-grid" role="group" aria-label="芸人の目">${HN.lenses.map(l => `<button class="lens${d.lens === l.id ? ' on' : ''}" aria-pressed="${d.lens === l.id}" data-act="hnLens" data-id="${l.id}"><b>${esc(l.name)}</b><small>${esc(l.by)}</small></button>`).join('')}</div>
      ${L ? `<div class="lens-work">
        <p class="lens-q">${esc(L.q)}</p>
        ${L.zoom ? zoomWidget(d) : ''}
        <textarea id="hnLensText" rows="3" maxlength="300" placeholder="${esc(L.ph)}" data-bind="hnLensText" aria-label="${esc(L.q)}">${esc(d.lensText)}</textarea>
      </div>` : '<p class="hint">レンズを選ぶと、問いが出ます。</p>'}
      ${nav(true, 'hnNextBtn', '噺にまとめる', !!L && d.lensText.trim().length >= 2)}`;
    }
    function zoomWidget(d) {
      const L = LENS.hiki; const z = d.zoom || 0;
      return `<div class="zoom" id="hnZoom" data-z="${z}">
        <div class="zoom-view" aria-hidden="true">
          <span class="zoom-bg zb-room"></span><span class="zoom-bg zb-town"></span><span class="zoom-bg zb-land"></span><span class="zoom-bg zb-earth"></span>
          <span class="zoom-card">${esc(d.event)}</span>
        </div>
        <label for="hnZoomR" class="zoom-k">カメラを引く：<b id="hnZoomL">${esc(L.zoom[z])}</b></label>
        <input type="range" id="hnZoomR" min="0" max="4" step="1" value="${z}" data-bind="hnZoom">
        <p class="zoom-note" id="hnZoomN" aria-live="polite">${esc(L.zoomNote[z])}</p>
      </div>`;
    }
    function stepCompose(d) {
      const L = LENS[d.lens] || HN.lenses[0];
      return `${head(2)}
      <h1 class="wiz-title">噺にまとめる</h1>
      <p class="wiz-lead">フリ・しくじり・オチの三段で。オチは、芸人の目で見たひとことを。</p>
      <div class="field"><label for="hnTitle">演題 <span class="opt">なくてもOK</span></label>
        <input type="text" id="hnTitle" maxlength="30" value="${esc(d.title)}" placeholder="例：裏返しの男" data-bind="hnTitle" autocomplete="off"></div>
      <div class="field"><label for="hnFuri">フリ（いつもの状況） <span class="opt">なくてもOK</span></label>
        <input type="text" id="hnFuri" maxlength="120" value="${esc(d.furi)}" placeholder="例：その日は、大事な会議の日でございました" data-bind="hnFuri" autocomplete="off"></div>
      <div class="field"><label for="hnEvent2">しくじり</label>
        <textarea id="hnEvent2" rows="2" maxlength="200" data-bind="hnEvent">${esc(d.event)}</textarea></div>
      <div class="field"><label for="hnLensText2">芸人の目（${esc(L.name)}）</label>
        <textarea id="hnLensText2" rows="2" maxlength="300" data-bind="hnLensText">${esc(d.lensText)}</textarea></div>
      <div class="field"><label for="hnOchi">オチ（見方を変えたひとこと）</label>
        <input type="text" id="hnOchi" maxlength="120" value="${esc(d.ochi)}" placeholder="${esc(OCHI_PH[L.id] || '')}" data-bind="hnOchi" autocomplete="off"></div>
      <ul class="ochi-hints" id="hnHints" aria-live="polite">${hintsHtml(d)}</ul>
      ${nav(true, 'hnNextBtn', '高座で一席', d.ochi.trim().length >= 2 && d.event.trim().length >= 2)}`;
    }
    function hintsHtml(d) {
      const w = selfDownIn([d.event, d.furi, d.lensText, d.ochi, d.title].join(' '));
      if (w) return `<li class="oh-warn">「${esc(w)}」は、自分を下げることばかも。落語の笑いは、人間の弱さを責めずに愛でる笑いです。「しょうがないなあ、人間だもの」くらいの目線で。</li>`;
      if (d.ochi.trim().length >= 2) return '<li class="oh-ok">自分を下げずに、出来事との距離をとれています。</li>';
      return '';
    }
    function stepAfter(d) {
      return `<div class="wiz-head"><span class="eyebrow">終演</span></div>
      <h1 class="wiz-title">一席、お見事でした</h1>
      <p class="wiz-lead">語り手の席から眺めてみて、いまはどうですか。感じたままで大丈夫です。</p>
      <blockquote class="boke-quote hn-ev">「${esc(d.event)}」</blockquote>
      <div class="field">
        <label for="hnWa">この出来事、いまの重さは？ <output id="hnWaOut">${d.weightAfter}</output></label>
        <input type="range" id="hnWa" min="0" max="100" step="5" value="${d.weightAfter}" data-out="hnWaOut" data-bind="hnWa">
        <div class="range-scale"><span>かるい</span><span>ずっしり</span></div>
        <p class="was">噺にする前は ${d.weightBefore}</p>
      </div>
      <div class="wiz-nav"><button class="btn btn-ghost" data-act="hnPerformDraft">もう一度一席</button><button class="btn btn-primary" data-act="hnSave">噺帳にしまう</button></div>`;
    }

    // ---- 入力 ----
    BIND.hnEvent = el => { const d = dr(); if (!d) return; d.event = el.value; enable('hnNextBtn', d.event.trim().length >= 2 && (d.step === 0 || d.ochi.trim().length >= 2)); refreshHints(); K.save(); };
    BIND.hnWb = el => { const d = dr(); if (!d) return; d.weightBefore = +el.value; d.weightAfter = +el.value; const h = $('#hnHeavyHint'); if (h) h.hidden = d.weightBefore < HEAVY; K.save(); };
    BIND.hnWa = el => { const d = dr(); if (!d) return; d.weightAfter = +el.value; K.save(); };
    BIND.hnLensText = el => { const d = dr(); if (!d) return; d.lensText = el.value; if (d.step === 1) enable('hnNextBtn', d.lensText.trim().length >= 2); refreshHints(); K.save(); };
    BIND.hnTitle = el => { const d = dr(); if (!d) return; d.title = el.value; refreshHints(); K.save(); };
    BIND.hnFuri = el => { const d = dr(); if (!d) return; d.furi = el.value; refreshHints(); K.save(); };
    BIND.hnOchi = el => { const d = dr(); if (!d) return; d.ochi = el.value; enable('hnNextBtn', d.ochi.trim().length >= 2 && d.event.trim().length >= 2); refreshHints(); K.save(); };
    BIND.hnZoom = el => {
      const d = dr(); if (!d) return; d.zoom = +el.value;
      const L = LENS.hiki; const z = $('#hnZoom'); if (z) z.dataset.z = d.zoom;
      const l = $('#hnZoomL'); if (l) l.textContent = L.zoom[d.zoom];
      const n = $('#hnZoomN'); if (n) n.textContent = L.zoomNote[d.zoom];
      K.save();
    };
    function refreshHints() { const d = dr(); const h = $('#hnHints'); if (d && h) h.innerHTML = hintsHtml(d); }

    // ---- 操作 ----
    ACT.hnStart = () => { const h = hs(); if (!h.draft) h.draft = newDraft(''); h.draft.open = true; RESULT = null; K.save(); K.rerender(); window.scrollTo(0, 0); };
    ACT.hnResume = ACT.hnStart;
    ACT.hnDrop = () => confirmSheet('書きかけの噺を捨てますか？', '捨てる', () => { hs().draft = null; K.save(); K.rerender(); });
    ACT.hnQuit = () => { const d = dr(); if (d) d.open = false; if (d && !d.event.trim()) hs().draft = null; K.save(); K.rerender(); window.scrollTo(0, 0); };
    ACT.hnPrev = () => { const d = dr(); if (!d) return; d.step = Math.max(0, d.step - 1); K.save(); K.rerender(); window.scrollTo(0, 0); };
    ACT.hnEx = el => { const d = dr(); const t = HN.examples[+el.dataset.i]; d.event = t; const ta = $('#hnEvent'); if (ta) { ta.value = t; ta.focus(); } enable('hnNextBtn', true); K.save(); };
    ACT.hnLens = el => { const d = dr(); if (!d) return; d.lens = el.dataset.id; K.save(); K.rerender(); const ta = $('#hnLensText'); if (ta) setTimeout(() => ta.focus({ preventScroll: true }), 30); Sfx.pop(); };
    ACT.hnNext = () => {
      const d = dr(); if (!d) return;
      const all = [d.event, d.lensText, d.furi, d.ochi, d.title].join(' ');
      if (isRisky(all)) { openSos(); return; }
      if (d.step === 0) {
        if (d.weightBefore >= HEAVY && !d.heavyAck) { heavySheet(); return; }
        d.step = 1;
      } else if (d.step === 1) d.step = 2;
      else if (d.step === 2) { if (!d.title.trim()) d.title = autoTitle(d); perform(d, true); return; }
      K.save(); K.rerender(); window.scrollTo(0, 0);
    };
    function heavySheet() {
      openSheet(`<div class="hn-heavy">
        <h2 class="sheet-title">まだ、笑いにしなくていい</h2>
        <p>笑いには「距離」が要ります。チャップリンの言葉どおり、近すぎる出来事は、まだ悲劇の画です。ずっしり重い出来事は、無理に笑いにしなくて大丈夫。</p>
        <div class="btn-col">
          <button class="btn btn-primary" data-act="hnToManzai">妖怪漫才で、頭のセリフにツッコむ</button>
          <a class="btn btn-ghost" href="#nagame" data-act="closeSheet">ながめ席で、ただ眺める</a>
          <button class="btn btn-ghost" data-act="openSos">休憩所・相談先</button>
          <button class="btn btn-ghost" data-act="hnHeavyGo">それでも、ちょっとだけ距離をとってみる</button>
        </div>
      </div>`, { label: '重さの確認' });
    }
    ACT.hnToManzai = () => { const d = dr(); closeSheet(); if (d) d.open = false; K.save(); K.startManzaiWith(d ? d.event : ''); };
    ACT.hnHeavyGo = () => { const d = dr(); closeSheet(); if (!d) return; d.heavyAck = true; d.step = 1; K.save(); K.rerender(); window.scrollTo(0, 0); };
    ACT.hnPerformDraft = () => { const d = dr(); if (d) perform(d, false); };
    ACT.hnSave = () => {
      const d = dr(); if (!d) return;
      const h = hs();
      const st = { id: d.id, date: new Date().toISOString(), event: d.event.trim(), weightBefore: d.weightBefore, weightAfter: d.weightAfter, lens: d.lens, lensText: d.lensText.trim(), furi: d.furi.trim(), ochi: d.ochi.trim(), title: d.title.trim() || autoTitle(d) };
      h.stories.unshift(st);
      h.draft = null;
      const up = addXP(D.XP.hanashi);
      RESULT = { title: st.title, before: st.weightBefore, after: st.weightAfter, up };
      K.save(); Sfx.chime();
      K.rerender(); window.scrollTo(0, 0);
    };
    ACT.hnReplay = el => { const s = hs().stories.find(x => x.id === el.dataset.id); if (s) perform(s, false); };
    ACT.hnDel = el => confirmSheet('この噺を、噺帳から消しますか？', '消す', () => { const h = hs(); h.stories = h.stories.filter(x => x.id !== el.dataset.id); K.save(); K.rerender(); });

    // ---- 世界のボケ拾い ----
    FORM.okashiAdd = f => {
      const t = f.t.value.trim(); const tk = f.tk.value.trim();
      if (t.length < 2) { toast('見つけたおかしみを、ひとことで'); return; }
      if (isRisky(t + ' ' + tk)) { openSos(); return; }
      const h = hs();
      const n = h.okashi.filter(o => isToday(o.date)).length;
      if (n >= 3) return;
      h.okashi.unshift({ id: uid(), date: new Date().toISOString(), t, tk });
      const up = addXP(D.XP.okashi);
      K.save();
      Sfx.pop(); buzz(10);
      if (n + 1 === 3) { Sfx.chime(); toast('今日のおかしみ、3つそろいました'); } else toast('拾いました。世界のボケ、ひとつ');
      if (up) setTimeout(() => toast(up + 'に昇進しました'), 1600);
      K.rerender();
      const inp = $('#okT'); if (inp) inp.focus({ preventScroll: true });
    };
    ACT.okashiDel = el => { const h = hs(); h.okashi = h.okashi.filter(o => o.id !== el.dataset.id); K.save(); K.rerender(); };

    // ============ 高座で一席（落語の形） ============
    let RK = null;
    function rkLines(s) {
      const L = LENS[s.lens] || { lead: '' };
      const ev = s.event.replace(/[。]$/, '');
      const lines = [{ t: HN.makura, k: 'makura' }];
      if (s.title) lines.push({ t: `演題は『${s.title}』。`, k: 'title' });
      if (s.furi) lines.push({ t: s.furi.replace(/[。]?$/, '。'), k: 'furi' });
      lines.push({ t: (s.furi ? 'ところが……' : '') + ev + '。', k: 'shikujiri' });
      if (s.lensText) lines.push({ t: L.lead + '……' + s.lensText.replace(/[。]?$/, '。'), k: 'lens' });
      lines.push({ t: s.ochi, k: 'ochi' });
      lines.push({ t: HN.sage, k: 'sage' });
      return lines;
    }
    function perform(s, fromDraft) {
      closeRk();
      const S = K.state();
      const name = S.profile.name || 'ココロ亭';
      const root = $('#hanashi-root');
      root.innerHTML = `<div class="rakugo" role="dialog" aria-modal="true" aria-label="笑い噺の高座">
        <div class="rk-top"><p class="rk-title"><span class="stage-k">高座</span>${esc(name)}『${esc(s.title || autoTitle(s))}』</p><button class="stage-x" data-act="rkClose">やめる</button></div>
        <div class="rk-scene" data-act="rkNext">
          <div class="rk-mekuri" aria-hidden="true"><span>${esc(name)}</span></div>
          <div class="rk-bubble-wrap"><div class="rk-bubble" id="rkBubble" aria-live="polite"></div></div>
          <div class="rk-za" aria-hidden="true"><div class="rk-you" id="rkYou">${A.you('norm')}</div><span class="rk-sensu"></span><span class="rk-zabuton"></span></div>
        </div>
        <div class="stage-bar"><span class="stage-count" id="rkCount">開演</span><button class="btn btn-primary" id="rkNextBtn" data-act="rkNext">次へ</button></div>
        <div class="oiri" id="rkOiri" hidden><span>お後が<br>よろしいようで</span></div>
      </div>`;
      document.body.classList.add('no-scroll');
      RK = { s, lines: rkLines(s), i: -1, fromDraft, ended: false };
      Sfx.taiko();
      setTimeout(() => { if (RK) rkNext(); }, reduceMotion() ? 50 : 700);
      setTimeout(() => { const b = $('#rkNextBtn'); if (b) b.focus({ preventScroll: true }); }, 60);
    }
    function rkNext() {
      if (!RK) return;
      if (RK.ended) { finishRk(); return; }
      RK.i += 1;
      const L = RK.lines[RK.i];
      if (!L) return;
      const b = $('#rkBubble');
      b.className = 'rk-bubble k-' + L.k;
      b.innerHTML = nl2br(L.t);
      void b.offsetWidth; b.classList.add('in');
      const you = $('#rkYou');
      you.innerHTML = A.you(L.k === 'ochi' || L.k === 'sage' ? 'happy' : L.k === 'shikujiri' ? 'shock' : 'norm');
      you.classList.remove('talking'); void you.offsetWidth; you.classList.add('talking');
      $('#rkCount').textContent = (RK.i + 1) + ' / ' + RK.lines.length;
      if (L.k === 'ochi') { Sfx.hyoshigi(); buzz([20, 40, 20]); }
      Voice.speak(L.t, L.k === 'ochi' ? { pitch: 1.1, rate: 0.95 } : { pitch: 1.0, rate: 1.0 });
      if (L.k === 'sage') {
        RK.ended = true;
        setTimeout(() => { const o = $('#rkOiri'); if (o && RK) { o.hidden = false; Sfx.applause(); } }, reduceMotion() ? 50 : 900);
        $('#rkNextBtn').textContent = RK.fromDraft ? '高座をおりる' : '閉じる';
      } else $('#rkNextBtn').textContent = RK.i === RK.lines.length - 2 ? 'サゲ' : '次へ';
    }
    function closeRk() {
      Voice.stop();
      const root = $('#hanashi-root'); if (root) root.innerHTML = '';
      RK = null;
      if (!document.querySelector('#sheet-root .sheet-wrap') && !['stage-root', 'calm-root', 'game-root'].some(id => { const e = document.getElementById(id); return e && e.childElementCount; })) document.body.classList.remove('no-scroll');
    }
    function finishRk() {
      const r = RK; closeRk();
      if (r && r.fromDraft) { const d = dr(); if (d) { d.step = 3; d.performed = true; K.save(); K.rerender(); window.scrollTo(0, 0); } }
    }
    ACT.rkNext = () => rkNext();
    ACT.rkClose = () => closeRk();
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && RK && !document.querySelector('#sheet-root .sheet-wrap')) closeRk(); });
    window.addEventListener('hashchange', () => { if (RK) closeRk(); });
  });
})();
