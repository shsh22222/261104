/* ココロ寄席 ― はね「しじま」（第九回：docs/EXPERT_DEBATE_9.md）
 * 寄席がはねたあと、だれもいない高座と、静けさだけが残る。
 * 妖怪（考え）がボケて、あなたがツッコんで、笑いが起きて、静かになる。そのすべてが起きている場所がある。
 * あなたは、寄席そのもの。
 *   ・ひと呼吸（10秒）／余韻を聴く／あいだを見る／めくりをめくる／いま、問題はある？
 *   ・ほかの入口：インナーボディ、今ここ呼吸、間をはかる（ながめ席）
 * 点数・成功・失敗はつけない。数えるのは、ひと呼吸の回数と、しじまにいた日だけ。終わったら、閉じていい。
 */
(function () {
  'use strict';
  (window.KY_EXT = window.KY_EXT || []).push(function (K) {
    const { D, A, $, $$, esc, uid, ymd, today, pick, openSheet, closeSheet, addXP, VIEWS, ACT, Sfx, Voice, buzz, reduceMotion } = K;
    const SJ = D.SHIJIMA;
    const PR = Object.fromEntries(SJ.practices.map(p => [p.id, p]));

    function sj() {
      const S = K.state();
      if (!S.shijima) S.shijima = {};
      const s = S.shijima;
      s.sessions = s.sessions || []; s.breaths = s.breaths || {}; s.totalBreaths = s.totalBreaths || 0;
      return s;
    }
    const todayBreaths = () => sj().breaths[today()] || 0;
    const deepSessions = () => sj().sessions.filter(x => x.practice !== 'hitoiki');
    const daysIn = () => new Set(sj().sessions.map(x => ymd(new Date(x.date))).concat(Object.keys(sj().breaths))).size;

    // ============ 入口 ============
    VIEWS.shijima = function () {
      const s = sj();
      const deep = deepSessions().length;
      const legends = K.state().legends || {};
      const others = SJ.others.map(id => (D.NAGAME.practices.find(p => p.id === id))).filter(Boolean);
      return `<header class="page-head"><p class="eyebrow">はね</p><h1 class="page-title">しじま</h1><p class="page-sub">幕が下りた寄席で、ただ、いる</p></header>

      <section class="sj-hero" aria-labelledby="sj-h">
        <div class="sj-hall" aria-hidden="true"><span class="sj-lamp"></span><span class="sj-kouza"></span><span class="sj-zabuton"></span></div>
        <div class="sj-hero-body">
          <h2 id="sj-h" class="sj-hero-t">あなたは、寄席そのもの。</h2>
          <p>妖怪（考え）がボケて、あなたがツッコんで、笑いが起きて、静かになる。そのすべてが起きている場所があります。どんなひどい噺がかかっても、寄席は傷つきません。どんなに大ウケしても、ふくらみもしない。ただ、すべてを受け入れて、ここにある。</p>
        </div>
        <button class="sj-breath" data-act="sjStart" data-id="hitoiki"><b>ひと呼吸</b><small>10秒・いつでも</small></button>
        <p class="sj-today">今日のひと呼吸 <b>${todayBreaths()}</b>回</p>
      </section>

      <section aria-labelledby="sj-list-h">
        <h2 id="sj-list-h" class="sec-title"><span>しじまへの入口</span></h2>
        <p class="zk-shelf-note">調子のいい日、少しだけ考えにとらわれている日に。点数も、成功も、失敗もありません。</p>
        <ul class="sj-list">${SJ.practices.filter(p => p.id !== 'hitoiki').map(p => `<li><button class="sj-card" data-act="sjOpen" data-id="${p.id}">
          <span class="sj-card-top"><b>${esc(p.name)}</b><small>${esc(p.min)}</small></span>
          <span class="sj-card-when">${esc(p.when)}</span></button></li>`).join('')}</ul>
      </section>

      <section aria-labelledby="sj-other-h">
        <h2 id="sj-other-h" class="sec-title"><span>ほかの入口</span></h2>
        <ul class="sj-others">${others.map(p => `<li><button class="sj-other" data-act="sjNg" data-id="${p.id}"><b>${esc(p.name)}</b><small>${esc(p.min)}・ながめ席</small></button></li>`).join('')}</ul>
      </section>

      <section class="seat-map" aria-labelledby="seat-map-h">
        <h2 id="seat-map-h" class="sec-title"><span>いまの席の地図</span></h2>
        <ol class="seat-map-list">${SJ.seats.map((x, i) => `<li class="${i === 2 ? 'here' : ''}"><a href="${x.href}"${x.act ? ` data-act="${x.act}"` : ''}><b>${esc(x.k)}</b><span>${esc(x.when)}</span><small>${esc(x.go)}</small></a></li>`).join('')}</ol>
        <p class="muted small">どの席にいても大丈夫。席は、日によって、時間によって変わります。</p>
      </section>

      <a class="legend-hint sj-legend" href="#zukan">
        <span class="legend-hint-art">${A.yokai('hakushi', 'happy', { silhouette: !legends.hakushi, cls: legends.hakushi ? 'is-legend' : '' })}</span>
        <span><b>${legends.hakushi ? '白紙のページが、ひらきました' : '図鑑の最後のページ'}</b><small>${legends.hakushi ? 'すべての妖怪は、この白い紙の上に描かれていました。' : `しじまに${SJ.hakushiAt}回ひたると、ひらきます（いま ${Math.min(deep, SJ.hakushiAt)}回）。`}</small></span>
      </a>

      <p class="sj-stat">しじまにいた日 <b>${daysIn()}</b>日・通算のひと呼吸 <b>${s.totalBreaths}</b>回</p>

      <aside class="howto"><p class="howto-k">この演目の考え方</p>
        <p>苦しみから逃げるためではなく、もともとある静けさに気づくための演目です。人は、起きている時間のおよそ半分を、目の前のこと以外を考えて過ごしているという研究があります。調子のいい日でも、いまに戻ると、目の前の「ふつう」が少し鮮やかになります。</p>
        <p class="muted small">エックハルト・トールが紹介している「いま」への入口（意識的な呼吸・静けさ・空間・「わたしは在る」の感覚・「いま、問題はある？」という問い）を参考にした、ココロ寄席なりのアレンジです。くわしくは本人の本で確かめてください。考えが浮かんでも、それも寄席の中の出来事。浮かんだことに気づけたら、それで十分です。</p>
      </aside>`;
    };

    // ============ 舞台（静かな画面） ============
    let RUN = null;
    function later(fn, ms) { const r = RUN; const t = setTimeout(() => { if (r && RUN === r && !r.ended) fn(); }, ms); if (r) r.timers.push(t); return t; }
    function halt() { if (RUN) RUN.timers.forEach(clearTimeout); }
    function speak(t, o) { if (RUN && RUN.voice) Voice.speak(t, Object.assign({ force: true, rate: 0.85, pitch: 0.95 }, o || {})); }
    function openOv(id, voice) {
      closeOv();
      const p = PR[id];
      $('#shijima-root').innerHTML = `<div class="sj-ov sj-ov-${id}" role="dialog" aria-modal="true" aria-label="${esc(p.name)}">
        <div class="sj-top"><p class="sj-title">しじま・${esc(p.name)}</p><button class="sj-x" data-act="sjClose">とじる</button></div>
        <div class="sj-scene" id="sjScene"></div>
        <div class="sj-bar" id="sjBar"></div>
      </div>`;
      document.body.classList.add('no-scroll');
      RUN = { id, timers: [], ended: false, t0: Date.now(), voice: !!voice };
    }
    function closeOv() {
      halt(); Voice.stop();
      RUN = null;
      const root = $('#shijima-root'); if (root) root.innerHTML = '';
      if (!document.querySelector('#sheet-root .sheet-wrap') && !['stage-root', 'calm-root', 'game-root', 'hanashi-root'].some(id => { const e = document.getElementById(id); return e && e.childElementCount; })) document.body.classList.remove('no-scroll');
    }
    function setProg(sec) {
      const p = $('#sjProg'); if (!p) return;
      p.style.transition = 'none'; p.style.width = '0%'; void p.offsetWidth;
      p.style.transition = 'width ' + sec + 's linear'; p.style.width = '100%';
    }
    function record(practice) {
      const s = sj();
      s.sessions.unshift({ id: uid(), date: new Date().toISOString(), practice, sec: Math.round((Date.now() - (RUN ? RUN.t0 : Date.now())) / 1000) });
      if (s.sessions.length > 600) s.sessions.length = 600;
    }
    function finish(practice, html) {
      if (!RUN || RUN.ended) return;
      RUN.ended = true; halt();
      record(practice);
      const up = addXP(D.XP.shijima);
      K.save();
      if (K.mark) K.mark('shijima');
      Sfx.bell();
      $('#sjScene').innerHTML = `<div class="sj-end">
        <p class="sj-end-k">おつかれさまでした</p>
        ${html || ''}
        <p class="sj-end-close">${esc(pick(SJ.ends))}</p>
        ${up ? `<p class="sj-up">${esc(up)}に昇進しました</p>` : ''}
      </div>`;
      $('#sjBar').innerHTML = '<button class="btn sj-primary btn-block" data-act="sjClose">このまま閉じる</button><button class="link-btn sj-link" data-act="sjHub">しじまの入口へ</button>';
      setTimeout(() => { const b = $('#sjBar .btn'); if (b) b.focus({ preventScroll: true }); }, 60);
    }
    ACT.sjClose = () => { closeOv(); K.rerender(); };
    ACT.sjHub = () => { closeOv(); K.go('shijima'); };

    // ---- 入口のシート ----
    ACT.sjOpen = el => {
      const p = PR[el.dataset.id]; if (!p) return;
      if (p.id === 'mondai') { runMondai(); return; }
      const voice = Voice.can() && p.id !== 'yoin';
      openSheet(`<div class="form sj-pre">
        <p class="eyebrow">しじま</p>
        <h2 class="sheet-title">${esc(p.name)}</h2>
        <p>${esc(p.desc)}</p>
        <p class="muted small">もとにした考え方：${esc(p.tech)}</p>
        ${p.id === 'yoin' ? '<p class="note-card">この演目は<strong>音を使います</strong>（効果音の設定がオフでも鳴ります）。静かな場所で、音量は小さめから。</p>' : ''}
        ${p.id === 'mekuri' ? '<p class="note-card">ふわふわした不安や、自分が自分でないような感じがしたら、すぐにやめて、足の裏と手のひらに注意を戻してください。</p>' : ''}
        ${voice ? '<label class="toggle"><input type="checkbox" id="sjVoice"><span class="toggle-ui" aria-hidden="true"></span><span>音声ガイドで、目を閉じたまま進める</span></label>' : ''}
        <button class="btn btn-primary btn-block" data-act="sjGo" data-id="${p.id}">はじめる</button>
      </div>`, { label: p.name });
    };
    ACT.sjGo = el => {
      const v = $('#sjVoice'); const voice = !!(v && v.checked);
      closeSheet();
      const id = el.dataset.id;
      setTimeout(() => ({ yoin: runYoin, aida: runAida, mekuri: runMekuri })[id](voice), 120);
    };
    ACT.sjStart = el => { const id = el.dataset.id; if (id === 'hitoiki') runHitoiki(); else ACT.sjOpen(el); };
    ACT.sjNg = el => { if (K.ngOpen) K.ngOpen(el.dataset.id); else K.go('nagame'); };
    K.openHitoiki = () => runHitoiki();

    // ---- 共通：息の輪 ----
    function breathOnce(onDone) {
      const C = SJ.hitoiki;
      const ring = $('#sjRing'), word = $('#sjWord');
      if (!ring) return;
      ring.classList.remove('out'); ring.style.transitionDuration = C.inhale + 's'; void ring.offsetWidth; ring.classList.add('in');
      word.textContent = '吸って';
      speak('吸って');
      later(() => {
        ring.classList.remove('in'); ring.style.transitionDuration = C.exhale + 's'; ring.classList.add('out');
        word.textContent = '吐いて';
        speak('吐いて');
      }, C.inhale * 1000);
      later(onDone, (C.inhale + C.exhale) * 1000);
    }
    const ringHtml = guide => `<div class="sj-ring-wrap"><div class="sj-ring" id="sjRing"><span id="sjWord">いま</span></div></div><p class="sj-guide" id="sjGuide">${esc(guide)}</p>`;

    // ============ ひと呼吸 ============
    function runHitoiki() {
      openOv('hitoiki', false);
      $('#sjScene').innerHTML = ringHtml('この一呼吸だけ、いまに。');
      $('#sjBar').innerHTML = '<p class="sj-note">考えが浮かんでも、そのままで。</p>';
      Sfx.chon(); buzz(10);
      const go = () => {
        breathOnce(() => {
          const s = sj(); const t = today();
          s.breaths[t] = (s.breaths[t] || 0) + 1; s.totalBreaths += 1;
          const keys = Object.keys(s.breaths).sort(); while (keys.length > 60) delete s.breaths[keys.shift()];
          const up = addXP(D.XP.hitoiki);
          K.save();
          if (K.mark) K.mark('hitoiki');
          Sfx.bell();
          const w = $('#sjWord'); if (w) w.textContent = 'いま、ここ';
          const g = $('#sjGuide'); if (g) g.textContent = '今日のひと呼吸 ' + s.breaths[t] + '回。' + (up ? '　' + up + 'に昇進しました' : '');
          $('#sjBar').innerHTML = '<button class="btn sj-primary btn-block" data-act="sjClose">このまま閉じる</button><button class="btn sj-ghost btn-block" data-act="sjAgain">もうひと呼吸</button><button class="link-btn sj-link" data-act="sjHub">しじまの入口へ</button>';
          setTimeout(() => { const b = $('#sjBar .btn'); if (b) b.focus({ preventScroll: true }); }, 60);
        });
      };
      later(go, reduceMotion() ? 100 : 700);
    }
    ACT.sjAgain = () => runHitoiki();

    // ============ 余韻を聴く ============
    function runYoin() {
      openOv('yoin', false);
      Object.assign(RUN, { round: 0, phase: 'ready', times: [] });
      $('#sjScene').innerHTML = `<div class="sj-rin" id="sjRinWrap"><span class="sj-wave w1"></span><span class="sj-wave w2"></span><span class="sj-wave w3"></span><span class="sj-bowl" aria-hidden="true"></span></div>
        <p class="sj-step" id="sjStep">1 / ${SJ.yoin.rounds}</p>
        <p class="sj-guide" id="sjGuide">おりんを鳴らして、音の最後を追いかけます。聞こえなくなったと感じたら「消えた」を。</p>`;
      $('#sjBar').innerHTML = '<button class="btn sj-primary btn-block" id="sjMain" data-act="sjRin">鳴らす</button>';
    }
    ACT.sjRin = () => {
      if (!RUN || RUN.id !== 'yoin' || RUN.ended) return;
      const Y = SJ.yoin;
      const btn = $('#sjMain'); const wrap = $('#sjRinWrap'); const guide = $('#sjGuide');
      if (RUN.phase === 'ready') {
        RUN.phase = 'listen'; RUN.tStrike = performance.now();
        Sfx.rin(); buzz(15);
        wrap.classList.remove('ringing'); void wrap.offsetWidth; wrap.classList.add('ringing');
        guide.textContent = '音の最後を、追いかけて……';
        btn.textContent = '消えた';
        RUN.autoT = later(() => ACT.sjRin(), Y.timeout * 1000);
        return;
      }
      if (RUN.phase === 'listen') {
        clearTimeout(RUN.autoT);
        RUN.phase = 'rest';
        RUN.times.push((performance.now() - RUN.tStrike) / 1000);
        wrap.classList.remove('ringing'); wrap.classList.add('still');
        guide.textContent = '音が消えたあとの、静けさ。そのまま、ひたります。';
        btn.hidden = true;
        later(() => {
          RUN.round += 1;
          wrap.classList.remove('still');
          if (RUN.round >= Y.rounds) {
            finish('yoin', `<p class="sj-end-big">${RUN.times.map(t => t.toFixed(1) + '秒').join('・')}<small>音を追いかけた時間</small></p>
              <p class="sj-end-note">静けさは、音の前にも、あとにも、ずっとここにありました。どんな音も、この静けさの中で鳴って、静けさの中へ消えていきます。</p>`);
            return;
          }
          RUN.phase = 'ready';
          $('#sjStep').textContent = (RUN.round + 1) + ' / ' + Y.rounds;
          guide.textContent = 'もう一度。こんどは、もっと最後の最後まで。';
          btn.hidden = false; btn.textContent = '鳴らす';
        }, Y.rest * 1000);
      }
    };

    // ============ あいだを見る ============
    function runAida(voice) {
      openOv('aida', voice);
      $('#sjScene').innerHTML = `<div class="sj-space" id="sjSpace" data-k="mono" aria-hidden="true">
          <svg viewBox="0 0 240 160" class="sj-space-svg">
            <rect class="sp-bg" x="0" y="0" width="240" height="160" rx="14"/>
            <ellipse class="sp-gap g1" cx="88" cy="96" rx="22" ry="34"/><ellipse class="sp-gap g2" cx="164" cy="80" rx="20" ry="40"/>
            <rect class="sp-obj" x="22" y="36" width="44" height="58" rx="4"/>
            <path class="sp-obj" d="M112 120 h28 l-4 -34 h-20 z"/>
            <circle class="sp-obj" cx="206" cy="58" r="16"/><path class="sp-obj" d="M196 124 h20 l-3 -34 h-14 z"/>
            <g class="sp-body"><circle cx="120" cy="52" r="16"/><path d="M92 140 Q94 86 120 80 Q146 86 148 140 Z"/></g>
            <circle class="sp-glow" cx="120" cy="80" r="60"/>
          </svg>
        </div>
        <div class="sj-card-text"><p class="sj-step" id="sjStep"></p><h2 class="sj-h" id="sjH"></h2><p class="sj-guide" id="sjGuide"></p><div class="sj-prog" aria-hidden="true"><i id="sjProg"></i></div></div>`;
      $('#sjBar').innerHTML = '<button class="btn sj-primary btn-block" id="sjNext" data-act="sjNext">次へ</button>';
      RUN.steps = SJ.aida; RUN.i = -1;
      RUN.stepFn = aidaStep;
      aidaStep(0);
    }
    function aidaStep(i) {
      if (!RUN || RUN.ended) return;
      const steps = RUN.steps;
      if (i >= steps.length) { finish(RUN.id, RUN.id === 'aida' ? '<p class="sj-end-note">ものは、空間の中にあります。考えも、気づきという空間の中に浮かんでいます。ときどき、ものではなく「あいだ」を見てください。</p>' : ''); return; }
      halt(); RUN.timers = [];
      RUN.i = i;
      const st = steps[i];
      const sp = $('#sjSpace'); if (sp) sp.dataset.k = st.k;
      $('#sjStep').textContent = (i + 1) + ' / ' + steps.length;
      $('#sjH').textContent = st.title;
      $('#sjGuide').textContent = st.text;
      $('#sjNext').textContent = i === steps.length - 1 ? 'おわる' : '次へ';
      speak(st.title + '。' + st.text);
      setProg(st.sec);
      later(() => RUN.stepFn(i + 1), st.sec * 1000);
    }
    ACT.sjNext = () => { if (RUN && !RUN.ended && RUN.stepFn) { Voice.stop(); RUN.stepFn(RUN.i + 1); } };

    // ============ めくりをめくる ============
    function runMekuri(voice) {
      openOv('mekuri', voice);
      const name = K.state().profile.name || 'あなた';
      $('#sjScene').innerHTML = `<div class="sj-mekuri-wrap">
          <div class="sj-mekuri" id="sjMekuri"><span class="mk-page" id="sjPage">${esc(name)}</span></div>
          <span class="sj-mekuri-stand" aria-hidden="true"></span>
        </div>
        <div class="sj-card-text"><p class="sj-step" id="sjStep"></p><h2 class="sj-h" id="sjH"></h2><p class="sj-guide" id="sjGuide"></p><div class="sj-prog" aria-hidden="true"><i id="sjProg"></i></div></div>`;
      $('#sjBar').innerHTML = '<button class="btn sj-primary btn-block" id="sjNext" data-act="sjNext">めくる</button>';
      RUN.steps = SJ.mekuri; RUN.i = -1; RUN.name = name;
      RUN.stepFn = mekuriStep;
      mekuriStep(0);
    }
    function mekuriStep(i) {
      if (!RUN || RUN.ended) return;
      const steps = RUN.steps;
      if (i >= steps.length) { finish('mekuri', `<p class="sj-end-note">${esc(SJ.mekuriEnd)}</p>`); return; }
      halt(); RUN.timers = [];
      RUN.i = i;
      const st = steps[i];
      const page = $('#sjPage'); const board = $('#sjMekuri');
      if (i > 0) { board.classList.remove('flip'); void board.offsetWidth; board.classList.add('flip'); Sfx.pop(); }
      later(() => {
        page.textContent = st.label === null ? RUN.name : st.label;
        board.classList.toggle('blank', !st.label && st.label !== null);
      }, i > 0 && !reduceMotion() ? 260 : 0);
      $('#sjStep').textContent = (i + 1) + ' / ' + steps.length;
      $('#sjH').textContent = st.title;
      $('#sjGuide').textContent = st.text;
      const last = i === steps.length - 1;
      $('#sjNext').textContent = last ? 'おわる' : st.k === 'blank' ? 'そのまま' : 'めくる';
      speak(st.text);
      if (st.sec) { setProg(st.sec); later(() => RUN.stepFn(i + 1), st.sec * 1000); } else { const p = $('#sjProg'); if (p) { p.style.transition = 'none'; p.style.width = '0%'; } }
    }

    // ============ いま、問題はある？ ============
    function runMondai() {
      openOv('mondai', false);
      mondaiCard('q');
    }
    function mondaiCard(k) {
      if (!RUN || RUN.ended) return;
      const scene = $('#sjScene'); const bar = $('#sjBar');
      if (k === 'q') {
        scene.innerHTML = '<div class="sj-q"><p class="sj-q-t">いま、この瞬間に、<br>問題はありますか？</p><p class="sj-q-s">10分後でも、明日でもなく、いま。</p></div>';
        bar.innerHTML = '<button class="btn sj-primary btn-block" data-act="sjMondai" data-k="nai">ない</button><button class="btn sj-ghost btn-block" data-act="sjMondai" data-k="aru">ある</button>';
      } else if (k === 'aru') {
        scene.innerHTML = '<div class="sj-q"><p class="sj-q-t">それは、いま、ここで<br>起きていること？</p><p class="sj-q-s">それとも、考えの中の「これから」や「さっき」のこと？</p></div>';
        bar.innerHTML = '<button class="btn sj-primary btn-block" data-act="sjMondai" data-k="kangae">考えの中のことだった</button><button class="btn sj-ghost btn-block" data-act="sjMondai" data-k="ima">いま、起きている</button>';
      } else if (k === 'ima') {
        scene.innerHTML = '<div class="sj-q"><p class="sj-q-t">いま、ひとつだけ<br>できることは？</p><p class="sj-q-s">いまの問題には、いまの一歩で。考えるより、体を動かせることがあれば。</p><input type="text" id="sjIma" maxlength="60" placeholder="例：窓を開ける／返事を一行だけ書く" autocomplete="off" aria-label="いまできること"></div>';
        bar.innerHTML = '<button class="btn sj-primary btn-block" data-act="sjMondai" data-k="go">それをしに行く</button>';
      } else if (k === 'go') {
        const v = ($('#sjIma') || {}).value || '';
        finish('mondai', `<p class="sj-end-note">${v.trim() ? '「' + esc(v.trim()) + '」。' : ''}いってらっしゃい。いまの一歩をしたら、それで十分です。</p>`);
      } else if (k === 'nai' || k === 'kangae') {
        scene.innerHTML = `<div class="sj-q"><p class="sj-q-t">${k === 'kangae' ? '考えは、考え。<br>' : ''}この瞬間には、<br>問題がない。</p><p class="sj-q-s">それに気づいたまま、3呼吸だけ、ひたります。</p></div>${ringHtml('')}`;
        bar.innerHTML = '<p class="sj-note">何もしなくていい時間です。</p>';
        let n = 0;
        const loop = () => { if (n >= 3) { finish('mondai', '<p class="sj-end-note">問題のない瞬間は、いつもここにありました。考えの中の問題は、必要なときに、必要なだけ考えればいい。</p>'); return; } n += 1; const g = $('#sjGuide'); if (g) g.textContent = n + ' / 3'; breathOnce(loop); };
        later(loop, 600);
      }
    }
    ACT.sjMondai = el => { buzz(8); mondaiCard(el.dataset.k); };

    document.addEventListener('keydown', e => { if (e.key === 'Escape' && RUN && !document.querySelector('#sheet-root .sheet-wrap')) ACT.sjClose(); });
    window.addEventListener('hashchange', () => { if (RUN) closeOv(); });
  });
})();
