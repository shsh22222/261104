/* ココロ寄席 ― 大喜利（ゲームのモード）
 * 第五回：妖怪当て早押し、いまひろい
 * 第六回：飽きない大喜利（docs/EXPERT_DEBATE_6.md）
 *   ・妖怪当てに段位（前座・真打・名人）、まぎらわしい選択肢、言い直し問題、苦手克服
 *   ・いまひろいに「いろなし（文字で判断）」、福の泡（長押しで味わう）、体のざわざわ、増える考え、いま三昧
 *   ・事実か考えか（左右に仕分けるスコアアタック）
 *   ・百鬼夜行（4つの演目 → 大トリ。提灯3つ、芸の札。今夜の百鬼夜行は日付で決まる）
 *   ・見分けの星（妖怪ごとの見分けの腕前）
 * 点数は自己ベストだけ。連続記録なし。3回続けたら、一度だけひと休みの声かけ。
 */
(function () {
  'use strict';
  (window.KY_EXT = window.KY_EXT || []).push(function (K) {
    const { D, A, $, $$, esc, toast, addXP, VIEWS, ACT, Sfx, buzz, reduceMotion, today } = K;
    const NT = window.KY_NETA;
    const G = D.GAME;
    const DIST = D.YOKAI.filter(y => !y.kind);
    const PERKS = Object.fromEntries(G.perks.map(p => [p.id, p]));
    const STACKABLE = ['kae', 'ohineri'];

    // ============ 乱数（今夜の百鬼夜行は、日付で決まる） ============
    function mulberry32(a) {
      return function () {
        a |= 0; a = a + 0x6D2B79F5 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }
    function seedOf(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
    let rnd = Math.random;
    const rpick = a => a[Math.floor(rnd() * a.length)];
    function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

    // ============ 記録 ============
    function gs() {
      const S = K.state();
      if (!S.game) S.game = {};
      const g = S.game;
      g.quiz = Object.assign({ plays: 0, best: 0, perfect: 0, levelBest: {} }, g.quiz);
      if (!g.quiz.levelBest) g.quiz.levelBest = {};
      if (g.quiz.best && !g.quiz.levelBest.zenza) g.quiz.levelBest.zenza = g.quiz.best;
      g.hiroi = Object.assign({ plays: 0, best: 0, bestNeutral: 0 }, g.hiroi);
      g.sort = Object.assign({ plays: 0, best: 0 }, g.sort);
      g.run = Object.assign({ plays: 0, best: 0, clears: 0, perfect: 0, daily: {} }, g.run);
      g.eye = g.eye || {};
      return g;
    }
    function eyeRecord(yid, ok) { const g = gs(); const e = g.eye[yid] || (g.eye[yid] = { ok: 0, ng: 0 }); if (ok) e.ok += 1; else e.ng += 1; }
    function stars(yid) {
      const e = gs().eye[yid]; if (!e) return 0;
      const acc = e.ok / Math.max(1, e.ok + e.ng);
      return e.ok >= 25 && acc >= 0.8 ? 3 : e.ok >= 10 && acc >= 0.7 ? 2 : e.ok >= 3 ? 1 : 0;
    }
    K.eyeStars = stars;
    const starStr = n => '★'.repeat(n) + '☆'.repeat(3 - n);
    const tkSay = T => (K.state().profile.style === 'kansai' ? T.kansai : T.yasashi);
    const thoughtOnly = t => { const parts = t.split('。').map(s => s.trim()).filter(Boolean); return parts[parts.length - 1]; };
    const levelUnlocked = L => { const g = gs(); const i = G.quizLevels.indexOf(L); if (i <= 0) return true; const prev = G.quizLevels[i - 1]; return (g.quiz.levelBest[prev.id] || 0) >= L.unlock; };
    const sessionRuns = [];
    let nudged = false;

    // ============ 大喜利（入口） ============
    VIEWS.ogiri = function () {
      const g = gs();
      const S = K.state();
      const legends = S.legends || {};
      const todayRec = g.run.daily && g.run.daily.date === today() ? g.run.daily : null;
      const hasEye = Object.keys(g.eye).length > 0;
      const parade = ['satori', 'kudan', 'namazu', 'nurikabe', 'karakasa', 'noppera', 'obariyon'];
      return `<header class="page-head"><h1 class="page-title">大喜利</h1><p class="page-sub">遊びながら、ツッコミと注意をきたえる</p></header>

      <section class="run-card" aria-labelledby="run-h">
        <div class="run-parade" aria-hidden="true">${parade.map(id => `<span>${A.yokai(id, 'smug')}</span>`).join('')}</div>
        <p class="run-k">毎日かわる、一夜の挑戦</p>
        <h2 id="run-h" class="run-name">今夜の百鬼夜行</h2>
        <p class="run-desc">妖怪当て・言い直し・事実か考えか・いまひろいの4演目を、毎回ちがう順番で。演目のあいだに「芸の札」を一枚選び、大トリで百鬼の行列を見送ります。提灯は3つ。約5分。</p>
        <p class="run-stat">${todayRec ? `今夜の記録 <strong>${todayRec.best}</strong>点` : '今夜はまだ挑んでいません'}・自己ベスト ${g.run.best}点・越えた夜 ${g.run.clears}回</p>
        <div class="btn-col run-btns">
          <button class="btn btn-run" data-act="runStart" data-daily="1">今夜の百鬼夜行に挑む</button>
          <button class="btn btn-small btn-run-ghost" data-act="runStart" data-daily="0">自由に挑む（毎回ちがう一夜）</button>
        </div>
      </section>

      <h2 class="sec-title"><span>単品の演目</span></h2>
      <p class="zk-shelf-note">命（提灯）はありません。段位や形を選んで、気軽にどうぞ。</p>

      <section class="game-card game-card-quiz" aria-labelledby="gq-h">
        <div class="gc-art">${A.yokai('satori', 'smug')}<span class="gc-q" aria-hidden="true">？</span></div>
        <div class="gc-body">
          <h3 id="gq-h" class="gc-name">妖怪当て早押し</h3>
          <p class="gc-desc">ボケを見て、どの妖怪のしわざかを当てます。段位が上がると、まぎらわしい妖怪どうしの見分けや、「言い直しはどれ？」の問題が加わります。10問。</p>
        </div>
        <div class="gc-foot">
          <div class="lv-row">${G.quizLevels.map(L => {
            const open = levelUnlocked(L);
            const i = G.quizLevels.indexOf(L);
            return `<button class="lv${open ? '' : ' locked'}" data-act="quizStart" data-level="${L.id}"${open ? '' : ' disabled'}>
              <b>${esc(L.name)}</b><small>${open ? `${L.choices}択・${L.sec}秒<br>ベスト ${g.quiz.levelBest[L.id] || 0}` : `${esc(G.quizLevels[i - 1].name)}で<br>${L.unlock}点`}</small></button>`;
          }).join('')}</div>
          ${hasEye ? '<button class="btn btn-small gc-focus" data-act="quizStart" data-level="zenza" data-focus="1">苦手克服（まちがえやすい妖怪を多めに）</button>' : ''}
        </div>
      </section>

      <section class="game-card game-card-hiroi" aria-labelledby="gh-h">
        <div class="gc-art gc-art-hiroi" aria-hidden="true"><span class="hb ima demo">息</span><span class="hb kangae demo">あの一言</span><span class="hb fuku demo">夕焼け</span></div>
        <div class="gc-body">
          <h3 id="gh-h" class="gc-name">いまひろい</h3>
          <p class="gc-desc">「いま」だけを拾い、考えは見送ります。考えをつかむと、二つに増えます。福の泡は長押しで味わうとボーナス。「いろなし」は文字だけで判断します。${G.hiroiSec}秒。</p>
          <p class="gc-stat">ベスト：いろつき <strong>${g.hiroi.best}</strong>点・いろなし <strong>${g.hiroi.bestNeutral}</strong>点</p>
        </div>
        <div class="gc-foot"><div class="btn-row"><button class="btn btn-small" data-act="hiroiStart" data-mode="color">いろつき（入門）</button><button class="btn btn-small btn-primary" data-act="hiroiStart" data-mode="neutral">いろなし（本番）</button></div></div>
      </section>

      <section class="game-card game-card-sort" aria-labelledby="gs-h">
        <div class="gc-art gc-art-sort" aria-hidden="true"><span class="sort-mini fact">事実</span><span class="sort-mini thought">考え</span></div>
        <div class="gc-body">
          <h3 id="gs-h" class="gc-name">事実か考えか</h3>
          <p class="gc-desc">出てくる文を、左（事実）と右（考え）に仕分けます。目安は「カメラに写るなら事実」。40秒のスコアアタック。</p>
          <p class="gc-stat">自己ベスト <strong>${g.sort.best}</strong>点・遊んだ ${g.sort.plays}回</p>
        </div>
        <div class="gc-foot"><button class="btn btn-small btn-primary" data-act="sortStart">はじめる</button></div>
      </section>

      <section class="eye-board" aria-labelledby="eye-h">
        <h2 id="eye-h" class="sec-title"><span>見分けの星</span></h2>
        <p class="zk-shelf-note">妖怪当てで正しく見分けた回数と正答率から、妖怪ごとの腕前が星になります（★3つで免許皆伝）。</p>
        <ul class="eye-grid">${DIST.map(y => { const e = g.eye[y.id] || { ok: 0, ng: 0 }; const n = stars(y.id); const acc = e.ok + e.ng ? Math.round(e.ok / (e.ok + e.ng) * 100) : null;
          return `<li class="eye-item s${n}">${A.yokai(y.id, 'norm')}<span class="eye-name">${esc(y.name)}</span><span class="eye-stars" aria-label="星${n}つ">${starStr(n)}</span><span class="eye-acc">${acc == null ? '—' : acc + '%'}</span></li>`; }).join('')}</ul>
      </section>

      <div class="legend-hints">
        <a class="legend-hint" href="#zukan">
          <span class="legend-hint-art">${A.yokai('raiju', 'happy', { silhouette: !legends.raiju, cls: legends.raiju ? 'is-legend' : '' })}</span>
          <span><b>${legends.raiju ? '雷獣と出会いました' : '伝説の雷獣'}</b><small>妖怪当てで10問すべて正解すると現れます。</small></span>
        </a>
        <a class="legend-hint" href="#zukan">
          <span class="legend-hint-art">${A.yokai('nue', 'happy', { silhouette: !legends.nue, cls: legends.nue ? 'is-legend' : '' })}</span>
          <span><b>${legends.nue ? '鵺と出会いました' : '伝説の鵺'}</b><small>提灯をひとつも失わずに百鬼夜行を越えると現れます。</small></span>
        </a>
      </div>

      <aside class="howto"><p class="howto-k">このゲームのねらい</p>
        <p>妖怪当ては考え方のクセを見分ける練習、言い直し問題は「現実に合った考え」と「ポジティブの押しつけ」を見分ける練習、事実か考えかは出来事と解釈を分ける練習、いまひろいは注意を「いま」に向け直す練習です。点数は自己ベストだけ。だれとも比べません。</p>
      </aside>`;
    };

    // ============ 共通の舞台（オーバーレイ） ============
    let GM = null;
    function openOverlay(cls, title, opts) {
      closeOverlay();
      opts = opts || {};
      GM = { alive: true, timers: [], raf: 0, score: 0, lanterns: opts.lanterns == null ? null : opts.lanterns, perks: new Set(), run: !!opts.run, lost: 0, cleanup: [], stageForgiven: false };
      $('#game-root').innerHTML = `<div class="game ${cls}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <div class="game-top"><p class="game-title" id="gTitle">${esc(title)}</p><span class="game-lan" id="gLan" aria-live="polite"></span><span class="game-q" id="gInfo"></span><span class="game-score" id="gScore">0</span><button class="game-x" data-act="gameQuit">やめる</button></div>
        <div class="game-main" id="gMain"></div>
      </div>`;
      document.body.classList.add('no-scroll');
      renderLanterns();
    }
    function closeOverlay() {
      if (GM) {
        GM.alive = false;
        GM.timers.forEach(clearTimeout);
        cancelAnimationFrame(GM.raf);
        GM.cleanup.forEach(f => { try { f(); } catch (e) { /* noop */ } });
      }
      GM = null;
      rnd = Math.random;
      const root = $('#game-root'); if (root) root.innerHTML = '';
      if (!document.querySelector('#sheet-root .sheet-wrap')) document.body.classList.remove('no-scroll');
    }
    ACT.gameQuit = () => { closeOverlay(); K.rerender(); };
    const alive = () => !!(GM && GM.alive);
    function later(fn, ms) { const g = GM; const t = setTimeout(() => { if (g && g.alive && GM === g) fn(); }, ms); if (g) g.timers.push(t); return t; }
    const wait = ms => new Promise(res => later(res, ms));
    function addScore(n) { if (!GM) return; GM.score += Math.round(n); const e = $('#gScore'); if (e) e.textContent = GM.score; }
    function setInfo(t) { const e = $('#gInfo'); if (e) e.textContent = t; }
    function renderLanterns() {
      const e = $('#gLan'); if (!e || !GM) return;
      if (GM.lanterns == null) { e.hidden = true; return; }
      e.hidden = false;
      const lit = Math.max(0, GM.lanterns);
      const off = Math.max(0, Math.min(GM.lost, 5 - lit));
      e.innerHTML = '<i class="lan"></i>'.repeat(lit) + '<i class="lan off"></i>'.repeat(off);
      e.setAttribute('aria-label', '提灯 ' + GM.lanterns);
    }
    function shake() { const g = $('#game-root .game'); if (!g) return; g.classList.remove('shake'); void g.offsetWidth; g.classList.add('shake'); }
    function flashMsg(text, cls) {
      const g = $('#game-root .game'); if (!g) return;
      const m = document.createElement('div'); m.className = 'g-flash ' + (cls || ''); m.textContent = text;
      g.appendChild(m); setTimeout(() => m.remove(), 1200);
    }
    // まちがえたとき（百鬼夜行では提灯が消える）。提灯が消えたら true
    function miss() {
      if (!GM || GM.lanterns == null) return false;
      if (GM.perks.has('nidome') && !GM.stageForgiven) { GM.stageForgiven = true; flashMsg('二度目の正直！ 提灯は無事', 'good'); return false; }
      GM.lanterns -= 1; GM.lost += 1;
      renderLanterns(); shake(); buzz([40, 30, 40]);
      flashMsg('提灯がひとつ消えた', 'bad');
      return true;
    }
    const dead = () => !!(GM && GM.lanterns != null && GM.lanterns <= 0);
    const perkMul = () => (GM && GM.perks.has('harisen') ? 1.5 : 1);

    // ============ 問題づくり ============
    function weightedNeta(focus) {
      if (!focus) return rpick(NT.LIST);
      const g = gs();
      const w = DIST.map(y => { const e = g.eye[y.id] || { ok: 0, ng: 0 }; return { id: y.id, w: (e.ng + 1) / (e.ok + 1) + 0.2 }; });
      const total = w.reduce((a, x) => a + x.w, 0);
      let r = rnd() * total; let yid = w[0].id;
      for (const x of w) { r -= x.w; if (r <= 0) { yid = x.id; break; } }
      return rpick(NT.LIST.filter(n => n.y === yid));
    }
    function makeQ(type, opt) {
      const n = opt.yid ? rpick(NT.LIST.filter(x => x.y === opt.yid)) : weightedNeta(opt.focus);
      if (type === 'tk') {
        const correct = n.tk[0].id;
        const exclude = new Set(n.tk.map(t => t.id).concat(D.yokaiById[n.y].weak));
        const wrong = shuffle(D.TSUKKOMI.map(t => t.id).filter(id => !exclude.has(id))).slice(0, 2);
        return { type, n, answer: correct, choices: shuffle([correct].concat(wrong)) };
      }
      if (type === 're') {
        const other = rpick(NT.LIST.filter(x => x.d === n.d && x.id !== n.id));
        const opts = shuffle([{ id: 'ok', t: n.re }, { id: 'toxic', t: rpick(G.toxic) }, { id: 'boke', t: other.thought }]);
        return { type, n, answer: 'ok', choices: opts.map(o => o.id), texts: Object.fromEntries(opts.map(o => [o.id, o.t])) };
      }
      let count = opt.choices - (GM && GM.perks.has('metsuke') ? 1 : 0);
      const pool = [];
      if (opt.confuse) shuffle((G.confuse[n.y] || []).slice()).slice(0, 2).forEach(id => pool.push(id));
      shuffle(DIST.map(y => y.id).filter(id => id !== n.y && !pool.includes(id))).forEach(id => pool.push(id));
      return { type: 'yokai', n, answer: n.y, choices: shuffle([n.y].concat(pool.slice(0, count - 1))) };
    }
    function qShell() {
      $('#gMain').innerHTML = `<div class="q-wrap">
        <div class="q-timer" aria-hidden="true"><i id="qTimer"></i></div>
        <div class="q-stage">
          <p class="q-kind" id="qKind"></p>
          <div class="q-bubble" id="qBubble"></div>
          <p class="q-combo" id="qCombo" aria-live="polite"></p>
          <p class="q-burst" id="qBurst" aria-hidden="true"></p>
        </div>
        <div class="q-choices" id="qChoices"></div>
        <div class="q-feedback" id="qFb" aria-live="polite"></div>
      </div>`;
    }
    function renderQ(q) {
      $('#qKind').textContent = q.type === 'yokai' ? 'このボケは、だれのしわざ？' : q.type === 'tk' ? 'このボケに、いちばん効くツッコミは？' : 'いちばん良い「言い直し」は？';
      const b = $('#qBubble');
      b.innerHTML = `<span>「${esc(q.n.thought)}」</span>`;
      b.classList.remove('in'); void b.offsetWidth; b.classList.add('in');
      $('#qFb').innerHTML = '';
      const box = $('#qChoices');
      box.className = 'q-choices' + (q.type === 'yokai' ? (q.choices.length > 4 ? ' six' : '') : ' tk');
      box.innerHTML = q.choices.map(id => {
        if (q.type === 'yokai') {
          const y = D.yokaiById[id];
          return `<button class="q-choice" data-id="${id}">${A.yokai(id, 'norm')}<span class="qc-name">${esc(y.name)}</span><span class="qc-dist">${esc(y.distortion)}</span></button>`;
        }
        if (q.type === 'tk') { const T = D.tsukkomiById[id]; return `<button class="q-choice q-choice-tk" data-id="${id}"><span class="qc-tk">${esc(tkSay(T))}</span><span class="qc-dist">${esc(T.tech)}</span></button>`; }
        return `<button class="q-choice q-choice-re" data-id="${id}"><span class="qc-re">${esc(q.texts[id])}</span></button>`;
      }).join('');
    }
    function askQ(sec) {
      return new Promise(resolve => {
        const box = $('#qChoices'); const t0 = performance.now(); let done = false;
        const finish = (id) => {
          if (done) return; done = true;
          box.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey);
          cancelAnimationFrame(GM && GM.raf);
          resolve({ id, left: Math.max(0, 1 - (performance.now() - t0) / (sec * 1000)) });
        };
        const onClick = e => { const b = e.target.closest('.q-choice'); if (b && !b.disabled) finish(b.dataset.id); };
        const onKey = e => { const n = parseInt(e.key, 10); const btns = $$('#qChoices .q-choice'); if (n >= 1 && n <= btns.length) finish(btns[n - 1].dataset.id); };
        box.addEventListener('click', onClick); document.addEventListener('keydown', onKey);
        if (GM) GM.cleanup.push(() => { box.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey); });
        const tick = () => {
          if (!alive() || done) return;
          const left = Math.max(0, 1 - (performance.now() - t0) / (sec * 1000));
          const bar = $('#qTimer'); if (bar) { bar.style.width = (left * 100) + '%'; bar.classList.toggle('low', left < 0.3); }
          if (left <= 0) { finish(null); return; }
          GM.raf = requestAnimationFrame(tick);
        };
        GM.raf = requestAnimationFrame(tick);
      });
    }
    function markChoices(q, id) {
      $$('#qChoices .q-choice').forEach(btn => {
        btn.disabled = true;
        if (btn.dataset.id === q.answer) btn.classList.add('right');
        else if (btn.dataset.id === id) btn.classList.add('wrong');
      });
    }
    function feedbackHtml(q, id) {
      const head = id ? 'おしい！' : '時間切れ';
      if (q.type === 'yokai') { const y = D.yokaiById[q.n.y]; return `<p class="fb-k">${head}　正解は<strong>${esc(y.name)}</strong>（${esc(y.distortion)}）</p><p class="fb-t">見分け方：${esc(y.sign)}</p>`; }
      if (q.type === 'tk') { const T = D.tsukkomiById[q.answer]; return `<p class="fb-k">${head}　正解は<strong>${esc(tkSay(T))}</strong>（${esc(T.tech)}）</p><p class="fb-t">${esc(q.n.tk[0].a)}</p>`; }
      const why = id === 'toxic' ? 'それは「ポジティブの押しつけ」。現実に合っていないと、心は信じられません。'
        : id === 'boke' ? 'それは、まだ妖怪のボケのまま。考え方のクセが残っています。'
          : '時間切れでした。';
      return `<p class="fb-k">${head}　${esc(why)}</p><p class="fb-t">良い言い直し：${esc(q.n.re)}</p>`;
    }
    function goodBurst(pts, combo) {
      const burst = $('#qBurst');
      if (burst) { burst.textContent = rpick(['スパーン！', '正解！', 'お見事！']) + '  +' + pts; burst.classList.remove('pop'); void burst.offsetWidth; burst.classList.add('pop'); }
      const c = $('#qCombo'); if (c) c.textContent = combo >= 2 ? combo + '連続！' : '';
      Sfx.harisen(); Sfx.combo(combo); buzz([20, 30, 20]);
    }

    // ============ ミニゲーム：妖怪当て（言い直し問題をふくむ） ============
    async function playQuiz(opt) {
      qShell();
      const res = { correct: 0, total: opt.n, missed: [], maxCombo: 0, dead: false };
      let combo = 0;
      if (GM) GM.stageForgiven = false;
      for (let i = 0; i < opt.n; i++) {
        if (!alive()) return null;
        const q = makeQ(rpick(opt.types), opt);
        setInfo((opt.label || '') + ' ' + (i + 1) + '/' + opt.n);
        renderQ(q);
        const sec = opt.sec + (GM.perks.has('chokou') && q.type !== 'tk' ? 3 : 0);
        const ans = await askQ(sec);
        if (!alive()) return null;
        const ok = ans.id === q.answer;
        markChoices(q, ans.id);
        if (q.type === 'yokai') eyeRecord(q.n.y, ok);
        if (ok) {
          combo += 1; res.correct += 1; res.maxCombo = Math.max(res.maxCombo, combo);
          const pts = Math.round((100 + Math.round(ans.left * 100) + Math.min(100, (combo - 1) * 20)) * perkMul());
          addScore(pts); goodBurst(pts, combo);
          await wait(reduceMotion() ? 300 : 950);
        } else {
          combo = 0;
          const c = $('#qCombo'); if (c) c.textContent = '';
          res.missed.push(q.n.y);
          $('#qFb').innerHTML = feedbackHtml(q, ans.id);
          Sfx.pop();
          miss();
          if (dead()) { res.dead = true; await wait(1400); return res; }
          if (opt.auto) await wait(2200);
          else await new Promise(r => { const b = document.createElement('button'); b.className = 'btn btn-primary btn-block'; b.textContent = '次へ'; b.addEventListener('click', r); $('#qFb').appendChild(b); b.focus({ preventScroll: true }); });
        }
      }
      return res;
    }

    // ============ ミニゲーム：事実か考えか ============
    function sortDeck() {
      const facts = G.facts.map(t => ({ t, k: 'fact' }));
      const thoughts = NT.LIST.map(n => ({ t: thoughtOnly(n.thought), k: 'thought' }));
      return shuffle(shuffle(facts).slice(0, 18).concat(shuffle(thoughts).slice(0, 18)));
    }
    async function playSort(opt) {
      $('#gMain').innerHTML = `<div class="sort-wrap">
        <p class="sort-guide">これは「事実」？ それとも「考え」？<small>目安：カメラに写るなら事実</small></p>
        <div class="sort-deck"><div class="sort-card" id="sCard"></div></div>
        <p class="sort-fb" id="sFb" aria-live="polite"></p>
        <div class="q-timer" aria-hidden="true"><i id="sTimer"></i></div>
        <div class="sort-btns"><button class="sort-btn fact" data-k="fact">← 事実</button><button class="sort-btn thought" data-k="thought">考え →</button></div>
      </div>`;
      const deck = sortDeck();
      const res = { correct: 0, total: 0, wrong: 0, maxCombo: 0, dead: false };
      let combo = 0;
      if (GM) GM.stageForgiven = false;
      const tStart = performance.now();
      const timeUp = () => opt.sec && performance.now() - tStart >= opt.sec * 1000;
      for (let i = 0; ; i++) {
        if (!alive()) return null;
        if (opt.n && i >= opt.n) break;
        if (timeUp()) break;
        const card = deck[i % deck.length];
        const el = $('#sCard');
        el.className = 'sort-card in';
        el.textContent = card.t;
        el.style.transform = '';
        if (GM.perks.has('mikiri')) { el.classList.add('hint-' + card.k); later(() => el.classList.remove('hint-' + card.k), 600); }
        setInfo(opt.n ? (i + 1) + '/' + opt.n : '残り ' + Math.max(0, Math.ceil(opt.sec - (performance.now() - tStart) / 1000)) + '秒');
        const ans = await new Promise(resolve => {
          let done = false; let sx = null;
          const finish = k => { if (done) return; done = true; cleanup(); resolve(k); };
          const btns = $('.sort-btns');
          const onBtn = e => { const b = e.target.closest('.sort-btn'); if (b) finish(b.dataset.k); };
          const onKey = e => { if (e.key === 'ArrowLeft') finish('fact'); else if (e.key === 'ArrowRight') finish('thought'); };
          const onDown = e => { sx = e.clientX; el.setPointerCapture && el.setPointerCapture(e.pointerId); };
          const onMove = e => { if (sx == null) return; const dx = e.clientX - sx; el.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`; };
          const onUp = e => { if (sx == null) return; const dx = e.clientX - sx; sx = null; if (dx < -70) finish('fact'); else if (dx > 70) finish('thought'); else el.style.transform = ''; };
          btns.addEventListener('click', onBtn); document.addEventListener('keydown', onKey);
          el.addEventListener('pointerdown', onDown); el.addEventListener('pointermove', onMove); el.addEventListener('pointerup', onUp);
          const cleanup = () => { btns.removeEventListener('click', onBtn); document.removeEventListener('keydown', onKey); el.removeEventListener('pointerdown', onDown); el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerup', onUp); };
          if (GM) GM.cleanup.push(cleanup);
          const t0 = performance.now();
          const tick = () => {
            if (!alive() || done) return;
            let left;
            if (opt.perCard) left = Math.max(0, 1 - (performance.now() - t0) / (opt.perCard * 1000));
            else left = Math.max(0, 1 - (performance.now() - tStart) / (opt.sec * 1000));
            const bar = $('#sTimer'); if (bar) { bar.style.width = (left * 100) + '%'; bar.classList.toggle('low', left < 0.3); }
            if (opt.perCard && left <= 0) { finish(null); return; }
            if (!opt.perCard && left <= 0) { finish('timeup'); return; }
            GM.raf = requestAnimationFrame(tick);
          };
          GM.raf = requestAnimationFrame(tick);
        });
        if (!alive()) return null;
        if (ans === 'timeup') break;
        res.total += 1;
        const ok = ans === card.k;
        el.classList.add(ans === 'fact' ? 'out-left' : 'out-right');
        const fb = $('#sFb');
        if (ok) {
          combo += 1; res.correct += 1; res.maxCombo = Math.max(res.maxCombo, combo);
          const pts = Math.round((50 + Math.min(60, (combo - 1) * 10)) * perkMul());
          addScore(pts);
          fb.className = 'sort-fb good'; fb.textContent = (card.k === 'fact' ? '事実！' : '考え！') + ' +' + pts + (combo >= 3 ? '　' + combo + '連続' : '');
          Sfx.combo(combo); buzz(10);
          await wait(reduceMotion() ? 100 : 260);
        } else {
          combo = 0; res.wrong += 1;
          fb.className = 'sort-fb bad';
          fb.textContent = (ans == null ? '時間切れ。' : '') + (card.k === 'fact' ? 'それは事実（起きたこと）。カメラに写ることは事実です。' : 'それは考え（解釈）。頭の中のセリフは、カメラに写りません。');
          Sfx.pop(); shake();
          miss();
          if (dead()) { res.dead = true; await wait(1400); return res; }
          await wait(1300);
        }
        fb.textContent = '';
      }
      return res;
    }

    // ============ ミニゲーム：いまひろい ============
    async function playHiroi(opt) {
      const neutral = !!opt.neutral;
      $('#gMain').innerHTML = `<div class="hiroi-wrap">
        <div class="hiroi-arena${neutral ? ' neutral' : ''}" id="hArena">
          <p class="hiroi-guide" id="hGuide">${neutral ? '色なし。文字を読んで、「いま」だけを拾います。' : '「いま」の泡だけをタップ。考えの泡は、見送ります。'}${opt.goal ? `<br><strong>${opt.goal}こ</strong>拾えばクリア` : ''}</p>
          <div class="hiroi-count" id="hCount" aria-live="assertive">3</div>
        </div>
        <div class="hiroi-legend"><span class="lg ima">いま</span><span class="lg body">からだ</span><span class="lg fuku">福（長押し）</span><span class="lg kangae">考え（見送る）</span></div>
      </div>`;
      const arena = $('#hArena');
      const st = { items: [], combo: 0, picks: 0, passes: 0, grabs: 0, savors: 0, started: 0, lastSpawn: 0, last: 0, fever: 0, bodyHint: false, holding: null };
      const slow = GM.perks.has('jishaku');
      for (let n = 3; n > 0; n--) { $('#hCount').textContent = n; Sfx.pop(); await wait(650); if (!alive()) return null; }
      const cEl = $('#hCount'); cEl.textContent = 'はじめ！'; cEl.classList.add('go'); later(() => cEl.remove(), 600);
      return new Promise(resolve => {
        st.started = performance.now(); st.last = st.started;
        const float = (x, y, text, cls) => { const t = document.createElement('span'); t.className = 'hf ' + (cls || ''); t.textContent = text; t.style.transform = `translate3d(${x}px, ${y}px, 0)`; arena.appendChild(t); setTimeout(() => t.remove(), 900); };
        const make = (kind, label, x, y, speed, small) => {
          const el = document.createElement('button');
          el.type = 'button';
          el.className = 'hb ' + kind + (small ? ' small' : '') + (neutral ? ' neutral' : '') + (slow ? ' big' : '');
          el.textContent = label;
          el.setAttribute('aria-label', label);
          arena.appendChild(el);
          const it = { el, kind, x, y, speed, sway: rnd() * Math.PI * 2, vx: 0, done: false };
          el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
          st.items.push(it);
          return it;
        };
        const spawn = elapsed => {
          const w = arena.clientWidth, h = arena.clientHeight;
          const prog = elapsed / (opt.sec * 1000);
          const r = rnd();
          let kind, label;
          if (opt.fuku && r < 0.07) { kind = 'fuku'; label = rpick(G.imaFuku); }
          else if (opt.body && r < 0.17) { kind = 'body'; label = rpick(G.imaBody); }
          else if (r < 0.55) { kind = 'ima'; label = rpick(G.ima); }
          else { kind = 'kangae'; label = rpick(G.kangae); }
          const speed = (60 + prog * 80 + rnd() * 20) * (slow ? 0.7 : 1) * (kind === 'fuku' ? 0.75 : 1);
          const x = 8 + rnd() * Math.max(10, w - 130);
          make(kind, label, x, h + 10, speed, false);
          if (prog > 0.45 && kind === 'kangae' && rnd() < 0.35) { // 考えの群れ
            make('kangae', rpick(G.kangae), Math.min(w - 110, x + 60), h + 60, speed, true);
          }
        };
        const award = (it, base, label, cls) => {
          st.combo += 1; st.picks += 1;
          if (st.combo > 0 && st.combo % 10 === 0) { st.fever = performance.now() + 6000; arena.classList.add('fever'); Sfx.chime(); float(arena.clientWidth / 2 - 50, 40, 'いま三昧！ ×2', 'fever'); }
          const fever = performance.now() < st.fever;
          const pts = Math.round((base + Math.min(20, (st.combo - 1) * 2)) * (fever ? 2 : 1) * perkMul());
          addScore(pts);
          it.done = true; it.el.classList.add('picked', 'reveal');
          setTimeout(() => it.el.remove(), 260);
          float(it.x, Math.max(0, it.y), label + ' +' + pts, cls);
          Sfx.combo(Math.min(st.combo, 20)); buzz(8);
        };
        const onDown = e => {
          if (!alive() || !st.started) return;
          const el = e.target.closest('.hb'); if (!el) return;
          e.preventDefault();
          const it = st.items.find(x => x.el === el); if (!it || it.done) return;
          if (it.kind === 'kangae') {
            st.combo = 0; st.grabs += 1;
            it.done = true; el.classList.add('reveal', 'grabbed');
            setTimeout(() => el.remove(), 300);
            const g = $('#hGuide'); if (g) g.textContent = 'つかむと、増える。気づいて、はなそう。';
            float(it.x, Math.max(0, it.y), 'つかんだ……増えた', 'grab');
            if (opt.split) { // 考えに手を出すと、考えは増える
              const a = make('kangae', rpick(G.kangae), it.x - 20, it.y, it.speed * 1.1, true); a.vx = -40;
              const b = make('kangae', rpick(G.kangae), it.x + 20, it.y, it.speed * 1.1, true); b.vx = 40;
            }
            Sfx.plop(); buzz(25);
            return;
          }
          if (it.kind === 'fuku') { // 長押しで味わう
            st.holding = { it, t0: performance.now() };
            el.classList.add('holding', 'reveal');
            return;
          }
          if (it.kind === 'body' && !st.bodyHint) { st.bodyHint = true; const g = $('#hGuide'); if (g) g.textContent = '体のざわざわも、「いま」の感覚です。'; }
          award(it, 10, it.kind === 'body' ? 'からだ' : 'いま', 'pick');
        };
        const onUp = () => {
          const h = st.holding; if (!h) return;
          st.holding = null;
          if (h.it.done) return;
          const held = performance.now() - h.t0;
          h.it.el.classList.remove('holding');
          if (held >= 600) { st.savors += 1; award(h.it, 60, '味わった！', 'savor'); Sfx.bell(); }
          else award(h.it, 15, '福', 'pick');
        };
        arena.addEventListener('pointerdown', onDown);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
        GM.cleanup.push(() => { window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp); });
        const loop = now => {
          if (!alive()) return;
          const dt = Math.min(0.05, (now - st.last) / 1000); st.last = now;
          const elapsed = now - st.started;
          const left = Math.max(0, opt.sec - elapsed / 1000);
          setInfo('残り ' + Math.ceil(left) + '秒' + (opt.goal ? '・' + st.picks + '/' + opt.goal : ''));
          if (st.fever && now > st.fever) { st.fever = 0; arena.classList.remove('fever'); }
          if (left <= 0) {
            arena.removeEventListener('pointerdown', onDown);
            resolve({ picks: st.picks, passes: st.passes, grabs: st.grabs, savors: st.savors, cleared: opt.goal ? st.picks >= opt.goal : true });
            return;
          }
          const interval = 900 - (elapsed / (opt.sec * 1000)) * 420;
          if (elapsed - st.lastSpawn > interval) { st.lastSpawn = elapsed; spawn(elapsed); }
          st.items.forEach(it => {
            if (it.done) return;
            const holding = st.holding && st.holding.it === it;
            if (!holding) it.y -= it.speed * dt;
            it.x += it.vx * dt; it.vx *= 0.96;
            it.sway += dt * 2;
            const x = it.x + Math.sin(it.sway) * 8;
            it.el.style.transform = `translate3d(${x}px, ${it.y}px, 0)`;
            if (it.y < -60) {
              it.done = true; it.el.remove();
              if (it.kind === 'kangae') { st.passes += 1; addScore(3 * perkMul()); float(x, 6, '見送り +3', 'pass'); }
              else if (st.holding && st.holding.it === it) st.holding = null;
            }
          });
          st.items = st.items.filter(it => !it.done);
          GM.raf = requestAnimationFrame(loop);
        };
        GM.raf = requestAnimationFrame(loop);
      });
    }

    // ============ ミニゲーム：大トリ「百鬼夜行」 ============
    async function playBoss() {
      const n = 12;
      const ids = shuffle(DIST.map(y => y.id)).slice(0, n);
      $('#gMain').innerHTML = `<div class="boss-wrap">
        <div class="parade" id="parade" aria-hidden="true">${ids.map((id, i) => `<span class="pm" data-i="${i}"><span class="pm-shadow">？</span></span>`).join('')}</div>
        <p class="boss-note" id="bossNote">見破られた妖怪は、お辞儀をして行列を離れていきます。</p>
        <div class="boss-q"></div>
      </div>`;
      const host = $('.boss-q');
      host.innerHTML = `<div class="q-timer" aria-hidden="true"><i id="qTimer"></i></div>
        <div class="q-stage compact"><div class="q-bubble" id="qBubble"></div><p class="q-combo" id="qCombo"></p><p class="q-burst" id="qBurst"></p><p class="q-kind" id="qKind" hidden></p></div>
        <div class="q-choices" id="qChoices"></div><div class="q-feedback" id="qFb"></div>`;
      if (GM) GM.stageForgiven = false;
      let combo = 0, cleared = 0;
      while (cleared < n) {
        if (!alive()) return null;
        const yid = ids[cleared];
        const q = makeQ('yokai', { yid, choices: cleared >= 6 ? 6 : 4, confuse: cleared >= 3 });
        setInfo('大トリ ' + (cleared + 1) + '/' + n);
        $$('#parade .pm').forEach((p, i) => p.classList.toggle('lead', i === cleared));
        renderQ(q);
        const sec = Math.max(4, 8 - cleared * 0.35) + (GM.perks.has('chokou') ? 3 : 0);
        const ans = await askQ(sec);
        if (!alive()) return null;
        const ok = ans.id === q.answer;
        markChoices(q, ans.id);
        eyeRecord(yid, ok);
        if (ok) {
          combo += 1;
          const pts = Math.round((150 + Math.round(ans.left * 100) + Math.min(150, (combo - 1) * 25)) * perkMul());
          addScore(pts); goodBurst(pts, combo);
          const pm = $$('#parade .pm')[cleared]; if (pm) { pm.innerHTML = A.yokai(yid, 'happy'); pm.classList.add('leave'); }
          cleared += 1;
          await wait(reduceMotion() ? 300 : 800);
        } else {
          combo = 0;
          $('#qFb').innerHTML = feedbackHtml(q, ans.id);
          Sfx.pop();
          miss();
          if (dead()) { await wait(1600); return { cleared: false, count: cleared }; }
          await wait(2000);
        }
      }
      return { cleared: true, count: n };
    }

    // ============ 百鬼夜行（ラン） ============
    const STAGE_NAME = { quiz: '妖怪当て', re: '言い直し', sort: '事実か考えか', hiroi: 'いまひろい', boss: '大トリ・百鬼夜行' };
    async function stageIntro(i, kind) {
      const label = kind === 'boss' ? '大トリ' : ['一夜目', '二夜目', '三夜目', '四夜目'][i];
      $('#gMain').innerHTML = `<div class="stage-intro${kind === 'boss' ? ' boss' : ''}">
        <p class="si-k">${label}</p><h2 class="si-name">${esc(STAGE_NAME[kind])}</h2>
        <p class="si-d">${kind === 'boss' ? '百鬼の行列が、やってきます。一体ずつ、正体を見破って見送りましょう。' : kind === 'hiroi' ? 'いまを拾えばクリア。考えをつかんでも提灯は消えません。' : 'まちがえると、提灯がひとつ消えます。'}</p>
      </div>`;
      Sfx.hyoshigi();
      await wait(reduceMotion() ? 400 : 1700);
    }
    async function perkPick() {
      const choices = shuffle(G.perks.filter(p => STACKABLE.includes(p.id) || !GM.perks.has(p.id)).slice()).slice(0, 3);
      $('#gMain').innerHTML = `<div class="perk-pick">
        <p class="pp-k">幕間</p><h2 class="pp-t">芸の札を、一枚えらぶ</h2>
        <div class="perk-cards">${choices.map(p => `<button class="perk-card" data-id="${p.id}"><b>${esc(p.name)}</b><span>${esc(p.desc)}</span></button>`).join('')}</div>
        ${GM.perks.size ? `<p class="pp-have">手持ち：${Array.from(GM.perks).map(id => esc(PERKS[id].name)).join('、')}</p>` : ''}
      </div>`;
      setInfo('幕間');
      const id = await new Promise(resolve => {
        const box = $('.perk-cards');
        const on = e => {
          const b = e.target.closest('.perk-card'); if (!b) return;
          box.removeEventListener('click', on);
          $$('.perk-card').forEach(c => { c.disabled = true; c.classList.toggle('chosen', c === b); });
          resolve(b.dataset.id);
        };
        box.addEventListener('click', on);
      });
      if (!alive()) return;
      Sfx.pop(); buzz(15);
      if (id === 'kae') { GM.lanterns = Math.min(5, GM.lanterns + 1); renderLanterns(); }
      else if (id === 'ohineri') addScore(300);
      else GM.perks.add(id);
      flashMsg(PERKS[id].name + '！', 'good');
      await wait(500);
    }
    async function startRun(daily) {
      rnd = daily ? mulberry32(seedOf('hyakki-' + today())) : Math.random;
      const rndKeep = rnd;
      openOverlay('game-run', daily ? '今夜の百鬼夜行' : '百鬼夜行', { lanterns: 3, run: true });
      rnd = rndKeep;
      GM.daily = daily;
      const order = shuffle(['quiz', 're', 'sort', 'hiroi']);
      const log = [];
      for (let i = 0; i < order.length; i++) {
        await stageIntro(i, order[i]);
        if (!alive()) return;
        let r;
        if (order[i] === 'quiz') r = await playQuiz({ n: 5, choices: i < 2 ? 4 : 6, sec: i < 2 ? 10 : 8, types: ['yokai', 'yokai', 'tk'], confuse: i >= 1, label: '妖怪当て', auto: true });
        else if (order[i] === 're') r = await playQuiz({ n: 3, choices: 3, sec: 12, types: ['re'], label: '言い直し', auto: true });
        else if (order[i] === 'sort') r = await playSort({ n: 8, perCard: Math.max(3.5, 5.5 - i * 0.5) });
        else {
          r = await playHiroi({ sec: 20, goal: 6 + i, neutral: i >= 1, fuku: true, body: true, split: true });
          if (r && !r.cleared) { miss(); await wait(900); }
        }
        if (!alive()) return;
        log.push(order[i]);
        if (dead()) { runEnd(false, log); return; }
        await perkPick();
        if (!alive()) return;
      }
      await stageIntro(4, 'boss');
      if (!alive()) return;
      const b = await playBoss();
      if (!alive()) return;
      runEnd(!!(b && b.cleared), log);
    }
    function runEnd(cleared, log) {
      const g = gs();
      const perfect = cleared && GM.lost === 0;
      const prevBest = g.run.best;
      g.run.plays += 1;
      g.run.best = Math.max(g.run.best, GM.score);
      if (cleared) g.run.clears += 1;
      if (perfect) g.run.perfect += 1;
      if (GM.daily) {
        const d = g.run.daily && g.run.daily.date === today() ? g.run.daily : { date: today(), best: 0, tries: 0 };
        d.best = Math.max(d.best, GM.score); d.tries = (d.tries || 0) + 1;
        g.run.daily = d;
      }
      const up = addXP(cleared ? 10 : D.XP.game);
      K.save();
      sessionRuns.push(Date.now());
      const recent = sessionRuns.filter(t => Date.now() - t < 30 * 60e3).length;
      const showNudge = recent >= 3 && !nudged;
      if (showNudge) nudged = true;
      if (cleared) Sfx.applause(); else Sfx.bell();
      setInfo('');
      $('#gMain').innerHTML = `<div class="game-result">
        <p class="gr-k">${perfect ? '提灯ひとつ消さずに、百鬼夜行を越えた！' : cleared ? '百鬼夜行を越えました！' : '今夜はここまで'}</p>
        <p class="gr-score">${GM.score}<small>点</small></p>
        ${GM.score > prevBest ? '<p class="gr-best">自己ベスト更新！</p>' : `<p class="gr-sub">自己ベスト ${g.run.best}点${GM.daily ? `・今夜の記録 ${g.run.daily.best}点` : ''}</p>`}
        <dl class="gr-stats"><div><dt>こなした演目</dt><dd>${log.length}<small>/4</small></dd></div><div><dt>残った提灯</dt><dd>${Math.max(0, GM.lanterns)}</dd></div><div><dt>大トリ</dt><dd class="gr-rank">${cleared ? '越えた' : '—'}</dd></div></dl>
        ${GM.perks.size ? `<p class="gr-note">この夜の芸の札：${Array.from(GM.perks).map(id => esc(PERKS[id].name)).join('、')}</p>` : ''}
        ${showNudge ? '<p class="gr-rest">3回続けて遊びました。ひと休みしませんか。水を一杯飲んだり、窓の外を眺めたり。休むのも芸のうちです。</p>' : ''}
        ${up ? `<p class="xp-gain"><strong>${esc(up)}に昇進しました</strong></p>` : ''}
        <div class="btn-col"><button class="btn btn-primary" data-act="runStart" data-daily="${GM.daily ? 1 : 0}">もう一夜</button><button class="btn btn-ghost" data-act="gameQuit">大喜利にもどる</button></div>
      </div>`;
      GM.alive = false; // ここから先はボタンだけ
      const g2 = $('#game-root .game'); if (g2) g2.classList.remove('shake');
    }
    ACT.runStart = el => { const daily = el.dataset.daily === '1'; startRun(daily); };

    // ============ 単品：妖怪当て ============
    async function startQuiz(levelId, focus) {
      rnd = Math.random;
      const L = G.quizLevels.find(x => x.id === levelId) || G.quizLevels[0];
      openOverlay('game-quiz', '妖怪当て・' + L.name + (focus ? '（苦手克服）' : ''), {});
      Sfx.hyoshigi();
      await wait(reduceMotion() ? 50 : 600);
      if (!alive()) return;
      const r = await playQuiz({ n: G.quizQuestions, choices: L.choices, sec: L.sec, types: L.types, confuse: L.confuse, focus, label: L.name });
      if (!r || !GM) return;
      const g = gs();
      const prevBest = g.quiz.levelBest[L.id] || 0;
      const perfect = r.correct === r.total;
      g.quiz.plays += 1;
      g.quiz.best = Math.max(g.quiz.best, GM.score);
      g.quiz.levelBest[L.id] = Math.max(prevBest, GM.score);
      if (perfect) g.quiz.perfect += 1;
      const next = G.quizLevels[G.quizLevels.indexOf(L) + 1];
      const unlocked = next && prevBest < next.unlock && GM.score >= next.unlock;
      const up = addXP(D.XP.game);
      K.save();
      if (perfect) Sfx.applause(); else Sfx.chime();
      const missed = Array.from(new Set(r.missed));
      setInfo('');
      $('#gMain').innerHTML = `<div class="game-result">
        <p class="gr-k">${perfect ? '全問正解！' : 'おつかれさまでした'}</p>
        <p class="gr-score">${GM.score}<small>点</small></p>
        ${GM.score > prevBest ? '<p class="gr-best">この段位の自己ベスト更新！</p>' : `<p class="gr-sub">${esc(L.name)}の自己ベスト ${g.quiz.levelBest[L.id]}点</p>`}
        ${unlocked ? `<p class="gr-unlock">「${esc(next.name)}」の段位が開きました！</p>` : next && !levelUnlocked(next) ? `<p class="gr-sub">「${esc(next.name)}」まで、あと${Math.max(0, next.unlock - g.quiz.levelBest[L.id])}点</p>` : ''}
        <dl class="gr-stats"><div><dt>正解</dt><dd>${r.correct}<small>/${r.total}</small></dd></div><div><dt>最大コンボ</dt><dd>${r.maxCombo}</dd></div><div><dt>段位</dt><dd class="gr-rank">${esc(L.name)}</dd></div></dl>
        ${missed.length ? `<div class="gr-missed"><p class="gr-missed-k">見分けにくかった妖怪</p><ul>${missed.map(id => `<li>${A.yokai(id, 'norm')}<span>${esc(D.yokaiById[id].name)} ${starStr(stars(id))}</span></li>`).join('')}</ul><p class="muted small">「苦手克服」で、まちがえやすい妖怪を多めに出せます。</p></div>` : ''}
        ${up ? `<p class="xp-gain"><strong>${esc(up)}に昇進しました</strong></p>` : ''}
        <div class="btn-col">
          <button class="btn btn-primary" data-act="quizStart" data-level="${L.id}">もう一度</button>
          ${missed.length ? `<button class="btn btn-ghost" data-act="quizStart" data-level="${L.id}" data-focus="1">苦手克服で練習</button>` : ''}
          <button class="btn btn-ghost" data-act="gameQuit">大喜利にもどる</button>
        </div>
      </div>`;
      GM.alive = false;
    }
    ACT.quizStart = el => startQuiz(el.dataset.level || 'zenza', el.dataset.focus === '1');

    // ============ 単品：いまひろい ============
    async function startHiroi(mode) {
      rnd = Math.random;
      const neutral = mode === 'neutral';
      openOverlay('game-hiroi', 'いまひろい' + (neutral ? '（いろなし）' : ''), {});
      const r = await playHiroi({ sec: G.hiroiSec, neutral, fuku: true, body: true, split: true });
      if (!r || !GM) return;
      const g = gs();
      const key = neutral ? 'bestNeutral' : 'best';
      const prevBest = g.hiroi[key] || 0;
      g.hiroi.plays += 1;
      g.hiroi[key] = Math.max(prevBest, GM.score);
      const up = addXP(D.XP.game);
      K.save();
      Sfx.bell();
      setInfo('');
      $('#gMain').innerHTML = `<div class="game-result">
        <p class="gr-k">そこまで！</p>
        <p class="gr-score">${GM.score}<small>点</small></p>
        ${GM.score > prevBest ? '<p class="gr-best">自己ベスト更新！</p>' : `<p class="gr-sub">自己ベスト ${g.hiroi[key]}点</p>`}
        <dl class="gr-stats"><div><dt>拾った「いま」</dt><dd>${r.picks}</dd></div><div><dt>見送った考え</dt><dd>${r.passes}</dd></div><div><dt>つかんだ考え</dt><dd>${r.grabs}</dd></div></dl>
        ${r.savors ? `<p class="gr-note">福の泡を${r.savors}回、味わいました。よいことは、少し長くとどめると残ります。</p>` : ''}
        <p class="gr-note">${r.grabs ? '考えをつかむと、考えは増えます。気づいて離せたら、それで大丈夫。注意は、何度でも「いま」に向け直せます。' : '考えに手を出さずに、「いま」を拾えました。注意の舵は、あなたが握っています。'}</p>
        ${up ? `<p class="xp-gain"><strong>${esc(up)}に昇進しました</strong></p>` : ''}
        <div class="btn-col"><button class="btn btn-primary" data-act="hiroiStart" data-mode="${mode}">もう一度</button>${neutral ? '' : '<button class="btn btn-ghost" data-act="hiroiStart" data-mode="neutral">いろなし（本番）に挑む</button>'}<button class="btn btn-ghost" data-act="gameQuit">大喜利にもどる</button></div>
      </div>`;
      GM.alive = false;
    }
    ACT.hiroiStart = el => startHiroi(el.dataset.mode || 'color');

    // ============ 単品：事実か考えか ============
    async function startSort() {
      rnd = Math.random;
      openOverlay('game-sort', '事実か考えか', {});
      Sfx.hyoshigi();
      await wait(reduceMotion() ? 50 : 500);
      if (!alive()) return;
      const r = await playSort({ sec: 40 });
      if (!r || !GM) return;
      const g = gs();
      const prevBest = g.sort.best;
      g.sort.plays += 1;
      g.sort.best = Math.max(prevBest, GM.score);
      const up = addXP(D.XP.game);
      K.save();
      Sfx.bell();
      setInfo('');
      const acc = r.total ? Math.round(r.correct / r.total * 100) : 0;
      $('#gMain').innerHTML = `<div class="game-result">
        <p class="gr-k">そこまで！</p>
        <p class="gr-score">${GM.score}<small>点</small></p>
        ${GM.score > prevBest ? '<p class="gr-best">自己ベスト更新！</p>' : `<p class="gr-sub">自己ベスト ${g.sort.best}点</p>`}
        <dl class="gr-stats"><div><dt>仕分けた</dt><dd>${r.total}<small>枚</small></dd></div><div><dt>正解率</dt><dd>${acc}<small>%</small></dd></div><div><dt>最大コンボ</dt><dd>${r.maxCombo}</dd></div></dl>
        <p class="gr-note">出来事（事実）と、頭の中のセリフ（考え）を分けられると、考えにツッコみやすくなります。</p>
        ${up ? `<p class="xp-gain"><strong>${esc(up)}に昇進しました</strong></p>` : ''}
        <div class="btn-col"><button class="btn btn-primary" data-act="sortStart">もう一度</button><button class="btn btn-ghost" data-act="gameQuit">大喜利にもどる</button></div>
      </div>`;
      GM.alive = false;
    }
    ACT.sortStart = () => startSort();

    document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#game-root').childElementCount && !document.querySelector('#sheet-root .sheet-wrap')) ACT.gameQuit(); });
    window.addEventListener('hashchange', () => { if ($('#game-root').childElementCount) closeOverlay(); });
  });
})();
