/* ココロ寄席 ― 大喜利（ゲームのモード）
 *   妖怪当て早押し：持ちネタ集のボケを見て、どの妖怪のしわざかを当てる（ときどき「効くツッコミは？」）
 *   いまひろい    ：浮かんでくる泡のうち「いま」だけを拾い、「考え」は見送る
 * 点数は自己ベストだけ。ランキング、プレイ回数の制限、連続ボーナスはつくらない。
 */
(function () {
  'use strict';
  (window.KY_EXT = window.KY_EXT || []).push(function (K) {
    const { D, A, $, $$, esc, pick, toast, addXP, VIEWS, ACT, Sfx, buzz, reduceMotion } = K;
    const NT = window.KY_NETA;
    const G = D.GAME;
    const DIST = D.YOKAI.filter(y => !y.kind);
    let GM = null; // いま遊んでいるゲーム

    function gs() {
      const S = K.state();
      if (!S.game) S.game = {};
      S.game.quiz = Object.assign({ plays: 0, best: 0, perfect: 0 }, S.game.quiz);
      S.game.hiroi = Object.assign({ plays: 0, best: 0 }, S.game.hiroi);
      return S.game;
    }
    function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
    const tkSay = T => (K.state().profile.style === 'kansai' ? T.kansai : T.yasashi);
    function quizRank(score) { let r = G.quizRanks[0]; G.quizRanks.forEach(x => { if (score >= x.min) r = x; }); return r.name; }

    // ============ 大喜利（入口） ============
    VIEWS.ogiri = function () {
      const g = gs();
      const raiju = K.state().legends && K.state().legends.raiju;
      return `<header class="page-head"><h1 class="page-title">大喜利</h1><p class="page-sub">遊びながら、ツッコミと注意をきたえる</p></header>
      <p class="page-lead">寄席の大喜利のように、ここはにぎやかな席です。点数は<strong>自己ベストだけ</strong>。だれとも比べません。何回でも、好きなときに。</p>

      <section class="game-card game-card-quiz" aria-labelledby="gq-h">
        <div class="gc-art">${A.yokai('satori', 'smug')}<span class="gc-q" aria-hidden="true">？</span></div>
        <div class="gc-body">
          <h2 id="gq-h" class="gc-name">妖怪当て早押し</h2>
          <p class="gc-desc">ボケを見て、どの妖怪のしわざかを4択で当てます。ときどき「効くツッコミはどれ？」も。10問・約2分。速さとコンボでボーナス。</p>
          <p class="gc-stat">自己ベスト <strong>${g.quiz.best}</strong>点・遊んだ ${g.quiz.plays}回${g.quiz.perfect ? '・全問正解 ' + g.quiz.perfect + '回' : ''}</p>
          <button class="btn btn-primary" data-act="quizStart">はじめる</button>
        </div>
      </section>

      <section class="game-card game-card-hiroi" aria-labelledby="gh-h">
        <div class="gc-art gc-art-hiroi" aria-hidden="true"><span class="hb ima demo">息</span><span class="hb kangae demo">あの一言</span><span class="hb ima demo">風の音</span></div>
        <div class="gc-body">
          <h2 id="gh-h" class="gc-name">いまひろい</h2>
          <p class="gc-desc">浮かんでくる泡のうち、「いま」の感覚（足の裏・息・風の音…）だけをタップで拾い、「考え」（明日の会議・あの一言…）は見送ります。${G.hiroiSec}秒。考えをつかんでも減点はありません。</p>
          <p class="gc-stat">自己ベスト <strong>${g.hiroi.best}</strong>点・遊んだ ${g.hiroi.plays}回</p>
          <button class="btn btn-primary" data-act="hiroiStart">はじめる</button>
        </div>
      </section>

      <a class="legend-hint" href="#zukan">
        <span class="legend-hint-art">${A.yokai('raiju', 'happy', { silhouette: !raiju, cls: raiju ? 'is-legend' : '' })}</span>
        <span><b>${raiju ? '雷獣と出会いました' : '伝説の妖怪が、どこかで見ている……'}</b><small>妖怪当てで10問すべて正解すると、伝説の「雷獣」が現れます。</small></span>
      </a>

      <aside class="howto"><p class="howto-k">このゲームのねらい</p>
        <p>妖怪当ては、考え方のクセ（認知の歪み）を見分ける練習です。思い出して答えるほど、見分け方が身につきます。いまひろいは、注意を「いま」に向け直す練習です。考えをつかんでしまっても、気づいて離せば大丈夫。</p>
      </aside>`;
    };

    function openGame(cls, label, inner) {
      $('#game-root').innerHTML = `<div class="game ${cls}" role="dialog" aria-modal="true" aria-label="${esc(label)}">${inner}</div>`;
      document.body.classList.add('no-scroll');
    }
    function closeGame() {
      if (GM) { GM.alive = false; cancelAnimationFrame(GM.raf); clearTimeout(GM.t); }
      GM = null;
      $('#game-root').innerHTML = '';
      if (!document.querySelector('#sheet-root .sheet-wrap')) document.body.classList.remove('no-scroll');
    }
    ACT.gameQuit = () => { closeGame(); K.rerender(); };

    // ============ 妖怪当て早押し ============
    function buildQuiz() {
      const pool = shuffle(NT.LIST.slice());
      const qs = [];
      for (let i = 0; i < G.quizQuestions; i++) {
        const n = pool[i];
        if (i < G.quizQuestions - G.quizTsukkomi) {
          const others = shuffle(DIST.filter(y => y.id !== n.y)).slice(0, 3).map(y => y.id);
          qs.push({ type: 'yokai', n, answer: n.y, choices: shuffle([n.y].concat(others)) });
        } else {
          const correct = n.tk[0].id;
          const exclude = new Set(n.tk.map(t => t.id).concat(D.yokaiById[n.y].weak));
          const wrong = shuffle(D.TSUKKOMI.map(t => t.id).filter(id => !exclude.has(id))).slice(0, 2);
          qs.push({ type: 'tsukkomi', n, answer: correct, choices: shuffle([correct].concat(wrong)) });
        }
      }
      return shuffle(qs);
    }
    ACT.quizStart = () => {
      closeGame();
      GM = { kind: 'quiz', alive: true, qs: buildQuiz(), i: -1, score: 0, combo: 0, maxCombo: 0, correct: 0, missed: [], answered: false };
      openGame('game-quiz', '妖怪当て早押し', `
        <div class="game-top"><p class="game-title">妖怪当て早押し</p><span class="game-q" id="qNo"></span><span class="game-score" id="qScore">0</span><button class="game-x" data-act="gameQuit">やめる</button></div>
        <div class="q-timer" aria-hidden="true"><i id="qTimer"></i></div>
        <div class="q-stage">
          <p class="q-kind" id="qKind"></p>
          <div class="q-bubble" id="qBubble"></div>
          <p class="q-combo" id="qCombo" aria-live="polite"></p>
          <p class="q-burst" id="qBurst" aria-hidden="true"></p>
        </div>
        <div class="q-choices" id="qChoices"></div>
        <div class="q-feedback" id="qFb" aria-live="polite"></div>`);
      Sfx.hyoshigi();
      GM.t = setTimeout(nextQ, reduceMotion() ? 50 : 600);
    };
    function nextQ() {
      if (!GM || !GM.alive || GM.kind !== 'quiz') return;
      GM.i += 1;
      if (GM.i >= GM.qs.length) { quizEnd(); return; }
      const q = GM.qs[GM.i];
      GM.answered = false;
      $('#qNo').textContent = (GM.i + 1) + ' / ' + GM.qs.length;
      $('#qKind').textContent = q.type === 'yokai' ? 'このボケは、だれのしわざ？' : 'このボケに、いちばん効くツッコミは？';
      const b = $('#qBubble');
      b.innerHTML = `<span>「${esc(q.n.thought)}」</span>`;
      b.classList.remove('in'); void b.offsetWidth; b.classList.add('in');
      $('#qFb').innerHTML = '';
      $('#qChoices').className = 'q-choices' + (q.type === 'tsukkomi' ? ' tk' : '');
      $('#qChoices').innerHTML = q.choices.map(id => {
        if (q.type === 'yokai') {
          const y = D.yokaiById[id];
          return `<button class="q-choice" data-act="qAns" data-id="${id}">${A.yokai(id, 'norm')}<span class="qc-name">${esc(y.name)}</span><span class="qc-dist">${esc(y.distortion)}</span></button>`;
        }
        const T = D.tsukkomiById[id];
        return `<button class="q-choice q-choice-tk" data-act="qAns" data-id="${id}"><span class="qc-tk">${esc(tkSay(T))}</span><span class="qc-dist">${esc(T.tech)}</span></button>`;
      }).join('');
      GM.qStart = performance.now();
      const tick = () => {
        if (!GM || !GM.alive || GM.answered) return;
        const left = Math.max(0, 1 - (performance.now() - GM.qStart) / (G.quizSec * 1000));
        const bar = $('#qTimer'); if (bar) { bar.style.width = (left * 100) + '%'; bar.classList.toggle('low', left < 0.3); }
        if (left <= 0) { answer(null); return; }
        GM.raf = requestAnimationFrame(tick);
      };
      GM.raf = requestAnimationFrame(tick);
    }
    function answer(id) {
      if (!GM || GM.answered) return;
      GM.answered = true;
      cancelAnimationFrame(GM.raf);
      const q = GM.qs[GM.i];
      const ok = id === q.answer;
      const left = Math.max(0, 1 - (performance.now() - GM.qStart) / (G.quizSec * 1000));
      $$('#qChoices .q-choice').forEach(btn => {
        btn.disabled = true;
        if (btn.dataset.id === q.answer) btn.classList.add('right');
        else if (btn.dataset.id === id) btn.classList.add('wrong');
      });
      const burst = $('#qBurst');
      if (ok) {
        GM.combo += 1; GM.maxCombo = Math.max(GM.maxCombo, GM.combo); GM.correct += 1;
        const pts = 100 + Math.round(left * 100) + Math.min(100, (GM.combo - 1) * 20);
        GM.score += pts;
        $('#qScore').textContent = GM.score;
        burst.textContent = pick(['スパーン！', '正解！', 'お見事！']) + '  +' + pts;
        burst.classList.remove('pop'); void burst.offsetWidth; burst.classList.add('pop');
        $('#qCombo').textContent = GM.combo >= 2 ? GM.combo + '連続！' : '';
        Sfx.harisen(); buzz([20, 30, 20]);
        GM.t = setTimeout(nextQ, reduceMotion() ? 300 : 1100);
      } else {
        GM.combo = 0;
        $('#qCombo').textContent = '';
        GM.missed.push(q.n.y);
        const y = D.yokaiById[q.n.y];
        const fb = q.type === 'yokai'
          ? `<p class="fb-k">${id ? 'おしい！' : '時間切れ'}　正解は<strong>${esc(y.name)}</strong>（${esc(y.distortion)}）</p><p class="fb-t">見分け方：${esc(y.sign)}</p>`
          : (() => { const T = D.tsukkomiById[q.answer]; return `<p class="fb-k">${id ? 'おしい！' : '時間切れ'}　正解は<strong>${esc(tkSay(T))}</strong>（${esc(T.tech)}）</p><p class="fb-t">${esc(q.n.tk[0].a)}</p>`; })();
        $('#qFb').innerHTML = fb + '<button class="btn btn-primary btn-block" data-act="qNext">次へ</button>';
        Sfx.pop(); buzz(40);
      }
    }
    ACT.qAns = el => answer(el.dataset.id);
    ACT.qNext = () => nextQ();
    function quizEnd() {
      const g = gs();
      const prevBest = g.quiz.best;
      const perfect = GM.correct === GM.qs.length;
      g.quiz.plays += 1;
      g.quiz.best = Math.max(g.quiz.best, GM.score);
      if (perfect) g.quiz.perfect += 1;
      const up = addXP(D.XP.game);
      K.save();
      const missed = Array.from(new Set(GM.missed));
      if (perfect) Sfx.applause(); else Sfx.chime();
      $('.game-quiz').innerHTML = `<div class="game-result">
        <p class="gr-k">${perfect ? '全問正解！' : 'おつかれさまでした'}</p>
        <p class="gr-score">${GM.score}<small>点</small></p>
        ${GM.score > prevBest ? '<p class="gr-best">自己ベスト更新！</p>' : `<p class="gr-sub">自己ベスト ${g.quiz.best}点</p>`}
        <dl class="gr-stats"><div><dt>正解</dt><dd>${GM.correct}<small>/${GM.qs.length}</small></dd></div><div><dt>最大コンボ</dt><dd>${GM.maxCombo}</dd></div><div><dt>段位</dt><dd class="gr-rank">${quizRank(GM.score)}</dd></div></dl>
        ${missed.length ? `<div class="gr-missed"><p class="gr-missed-k">見分けにくかった妖怪</p><ul>${missed.map(id => `<li>${A.yokai(id, 'norm')}<span>${esc(D.yokaiById[id].name)}</span></li>`).join('')}</ul><p class="muted small">図鑑の「見分け方」と「持ちネタ」を見てから、もう一度どうぞ。</p></div>` : ''}
        ${up ? `<p class="xp-gain"><strong>${esc(up)}に昇進しました</strong></p>` : ''}
        <div class="btn-col"><button class="btn btn-primary" data-act="quizStart">もう一度</button><button class="btn btn-ghost" data-act="gameQuit">大喜利にもどる</button></div>
      </div>`;
      GM.alive = false;
    }

    // ============ いまひろい ============
    ACT.hiroiStart = () => {
      closeGame();
      GM = { kind: 'hiroi', alive: true, items: [], score: 0, combo: 0, picks: 0, passes: 0, grabs: 0, started: 0, lastSpawn: 0, last: 0 };
      openGame('game-hiroi', 'いまひろい', `
        <div class="game-top"><p class="game-title">いまひろい</p><span class="game-q" id="hTime">${G.hiroiSec}</span><span class="game-score" id="hScore">0</span><button class="game-x" data-act="gameQuit">やめる</button></div>
        <div class="hiroi-arena" id="hArena">
          <p class="hiroi-guide" id="hGuide">「いま」の泡だけをタップ。考えの泡は、見送ります。</p>
          <div class="hiroi-count" id="hCount" aria-live="assertive">3</div>
        </div>
        <div class="hiroi-legend"><span class="lg ima">いま（体・音・景色）</span><span class="lg kangae">考え（過去・未来・評価）</span></div>`);
      const arena = $('#hArena');
      arena.addEventListener('pointerdown', onHiroiTap);
      let n = 3;
      const count = () => {
        if (!GM || !GM.alive) return;
        const c = $('#hCount');
        if (n > 0) { c.textContent = n; Sfx.pop(); n -= 1; GM.t = setTimeout(count, 700); return; }
        c.textContent = 'はじめ！'; c.classList.add('go');
        setTimeout(() => { if (c) c.remove(); }, 600);
        GM.started = performance.now(); GM.last = GM.started; GM.lastSpawn = 0;
        GM.raf = requestAnimationFrame(hiroiLoop);
      };
      count();
    };
    function spawn(arena, elapsed) {
      const imaRatio = 0.55;
      const isIma = Math.random() < imaRatio;
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'hb ' + (isIma ? 'ima' : 'kangae');
      el.textContent = isIma ? pick(G.ima) : pick(G.kangae);
      el.setAttribute('aria-label', (isIma ? 'いま：' : '考え：') + el.textContent);
      arena.appendChild(el);
      const w = arena.clientWidth, h = arena.clientHeight;
      const bw = el.offsetWidth;
      const x = 8 + Math.random() * Math.max(10, w - bw - 16);
      const progress = elapsed / (G.hiroiSec * 1000);
      const speed = 60 + progress * 70 + Math.random() * 20; // px/秒
      const it = { el, ima: isIma, x, y: h + 10, speed, sway: Math.random() * Math.PI * 2, done: false };
      el.style.transform = `translate3d(${x}px, ${it.y}px, 0)`;
      GM.items.push(it);
    }
    function floatText(arena, x, y, text, cls) {
      const t = document.createElement('span');
      t.className = 'hf ' + (cls || '');
      t.textContent = text;
      t.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      arena.appendChild(t);
      setTimeout(() => t.remove(), 900);
    }
    function hiroiLoop(now) {
      if (!GM || !GM.alive || GM.kind !== 'hiroi') return;
      const arena = $('#hArena'); if (!arena) return;
      const dt = Math.min(0.05, (now - GM.last) / 1000); GM.last = now;
      const elapsed = now - GM.started;
      const left = Math.max(0, G.hiroiSec - elapsed / 1000);
      $('#hTime').textContent = Math.ceil(left);
      if (left <= 0) { hiroiEnd(); return; }
      const interval = 950 - (elapsed / (G.hiroiSec * 1000)) * 450;
      if (elapsed - GM.lastSpawn > interval) { GM.lastSpawn = elapsed; spawn(arena, elapsed); }
      GM.items.forEach(it => {
        if (it.done) return;
        it.y -= it.speed * dt * (it.grabbed ? 2.2 : 1);
        it.sway += dt * 2;
        const x = it.x + Math.sin(it.sway) * 8;
        it.el.style.transform = `translate3d(${x}px, ${it.y}px, 0)`;
        if (it.y < -60) {
          it.done = true; it.el.remove();
          if (!it.ima && !it.grabbed) { GM.passes += 1; GM.score += 3; $('#hScore').textContent = GM.score; floatText(arena, x, 6, '見送り +3', 'pass'); }
        }
      });
      GM.items = GM.items.filter(it => !it.done);
      GM.raf = requestAnimationFrame(hiroiLoop);
    }
    function onHiroiTap(e) {
      if (!GM || !GM.alive || GM.kind !== 'hiroi' || !GM.started) return;
      const el = e.target.closest('.hb'); if (!el) return;
      e.preventDefault();
      const it = GM.items.find(x => x.el === el); if (!it || it.done || it.grabbed) return;
      const arena = $('#hArena');
      const x = it.x, y = Math.max(0, it.y);
      if (it.ima) {
        GM.combo += 1; GM.picks += 1;
        const pts = 10 + Math.min(20, (GM.combo - 1) * 2);
        GM.score += pts;
        it.done = true; el.classList.add('picked');
        setTimeout(() => el.remove(), 250);
        floatText(arena, x, y, 'いま！ +' + pts, 'pick');
        Sfx.pop(); buzz(10);
      } else {
        GM.combo = 0; GM.grabs += 1;
        it.grabbed = true; el.classList.add('grabbed');
        floatText(arena, x, y, 'つかんだ……はなそう', 'grab');
        const g = $('#hGuide'); if (g) g.textContent = 'つかんでも大丈夫。気づいて、はなせばOK。';
        Sfx.plop(); buzz(25);
      }
      $('#hScore').textContent = GM.score;
    }
    function hiroiEnd() {
      const g = gs();
      const prevBest = g.hiroi.best;
      g.hiroi.plays += 1;
      g.hiroi.best = Math.max(g.hiroi.best, GM.score);
      const up = addXP(D.XP.game);
      K.save();
      Sfx.bell();
      GM.alive = false;
      cancelAnimationFrame(GM.raf);
      $('.game-hiroi').innerHTML = `<div class="game-result">
        <p class="gr-k">そこまで！</p>
        <p class="gr-score">${GM.score}<small>点</small></p>
        ${GM.score > prevBest ? '<p class="gr-best">自己ベスト更新！</p>' : `<p class="gr-sub">自己ベスト ${g.hiroi.best}点</p>`}
        <dl class="gr-stats"><div><dt>拾った「いま」</dt><dd>${GM.picks}</dd></div><div><dt>見送った考え</dt><dd>${GM.passes}</dd></div><div><dt>つかんだ考え</dt><dd>${GM.grabs}</dd></div></dl>
        <p class="gr-note">${GM.grabs ? '考えをつかんでも、気づいて離せたら大丈夫。注意は、何度でも「いま」に向け直せます。' : '考えに手を出さずに、「いま」を拾えました。注意の舵は、あなたが握っています。'}</p>
        ${up ? `<p class="xp-gain"><strong>${esc(up)}に昇進しました</strong></p>` : ''}
        <div class="btn-col"><button class="btn btn-primary" data-act="hiroiStart">もう一度</button><button class="btn btn-ghost" data-act="gameQuit">大喜利にもどる</button></div>
      </div>`;
    }

    document.addEventListener('keydown', e => { if (e.key === 'Escape' && GM && !document.querySelector('#sheet-root .sheet-wrap')) ACT.gameQuit(); });
    window.addEventListener('hashchange', () => { if (GM || $('#game-root').childElementCount) closeGame(); });
  });
})();
