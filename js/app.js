/* ココロ寄席 ― 本体 */
(function () {
  'use strict';
  const D = window.KY_DATA;
  const A = window.KY_ART;
  const NT = window.KY_NETA;

  // ============ 小道具 ============
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const nl2br = s => esc(s).replace(/\n/g, '<br>');
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const today = () => ymd(new Date());
  const addDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };
  const fmtMD = s => { const d = new Date(s.length === 10 ? s + 'T00:00:00' : s); return (d.getMonth() + 1) + '月' + d.getDate() + '日'; };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const reduceMotion = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  function kanjiNum(n) {
    const d = '〇一二三四五六七八九';
    if (n < 10) return d[n];
    if (n < 20) return '十' + (n % 10 ? d[n % 10] : '');
    if (n < 100) return d[Math.floor(n / 10)] + '十' + (n % 10 ? d[n % 10] : '');
    return String(n);
  }

  // ============ 保存 ============
  const KEY = 'kokoro-yose.v1';
  const NAMES = ['ひよこ', 'こまめ', 'だんご', 'もなか', 'おもち', 'わかば', 'こはる', 'ちくわ', 'まめた', 'すずな'];
  function fresh() {
    return {
      v: 1,
      profile: { name: '', style: 'kansai', sound: true, voice: true, seenIntro: false, createdAt: new Date().toISOString(), lastVisit: null, autoPlay: false, fontSize: 'normal' },
      netaSeen: {},
      xp: 0, scripts: [], yokai: {}, prophecies: [], omikuji: [], myActions: [], draft: null, mikujiNow: null,
      nagame: { kizuki: [], sessions: [], geso: [], gesoSeq: 0 }
    };
  }
  let S = fresh();
  let storageOK = true;
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw);
        S = Object.assign(fresh(), p);
        S.profile = Object.assign(fresh().profile, p.profile || {});
        S.nagame = Object.assign(fresh().nagame, p.nagame || {});
      }
    } catch (e) { storageOK = false; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); storageOK = true; } catch (e) { storageOK = false; }
  }

  // ============ 音（Web Audio で合成） ============
  const Sfx = {
    ctx: null, nb: null,
    c() {
      if (!S.profile.sound) return null;
      try {
        if (!this.ctx) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return null;
          this.ctx = new AC();
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return this.ctx;
      } catch (e) { return null; }
    },
    noise(c) {
      if (this.nb) return this.nb;
      const len = c.sampleRate;
      const b = c.createBuffer(1, len, c.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      return (this.nb = b);
    },
    env(c, node, t, peak, dur) {
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      node.connect(g); g.connect(c.destination);
    },
    burst(c, t, freq, q, peak, dur, type) {
      const s = c.createBufferSource();
      s.buffer = this.noise(c);
      const f = c.createBiquadFilter();
      f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q;
      s.connect(f); this.env(c, f, t, peak, dur);
      s.start(t, Math.random() * 0.5, dur + 0.05);
    },
    tone(c, t, f0, f1, peak, dur, type) {
      const o = c.createOscillator();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(f0, t);
      if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      this.env(c, o, t, peak, dur);
      o.start(t); o.stop(t + dur + 0.05);
    },
    harisen() { // スパーン！
      const c = this.c(); if (!c) return;
      const t = c.currentTime + 0.01;
      this.burst(c, t, 2400, 0.7, 0.9, 0.16);
      this.burst(c, t, 900, 1.2, 0.5, 0.08);
      this.tone(c, t, 200, 70, 0.5, 0.12);
    },
    hyoshigi() { // 拍子木：チョン、チョン、チョンチョンチョン……
      const c = this.c(); if (!c) return;
      let t = c.currentTime + 0.05;
      [0.55, 0.45, 0.3, 0.22, 0.16, 0.12, 0.1, 0.09].forEach((g, i) => {
        const p = i < 2 ? 0.7 : 0.45;
        this.tone(c, t, 1750, 1700, p, 0.07, 'triangle');
        this.tone(c, t, 2650, 2600, p * 0.5, 0.05);
        this.burst(c, t, 3000, 2, p * 0.6, 0.03);
        t += g;
      });
    },
    taiko() { // 出囃子の太鼓
      const c = this.c(); if (!c) return;
      const t = c.currentTime + 0.02;
      [0, 0.28, 0.5].forEach((d, i) => {
        this.tone(c, t + d, 110, 48, i === 2 ? 0.9 : 0.7, 0.45);
        this.burst(c, t + d, 400, 1, 0.25, 0.06, 'lowpass');
      });
    },
    applause() {
      const c = this.c(); if (!c) return;
      const t0 = c.currentTime + 0.02;
      for (let i = 0; i < 80; i++) {
        const t = t0 + Math.random() * 2.0 * Math.pow(Math.random(), 0.6);
        this.burst(c, t, 1200 + Math.random() * 1800, 1.5, 0.1 + Math.random() * 0.18, 0.04);
      }
    },
    chime() {
      const c = this.c(); if (!c) return;
      const t = c.currentTime + 0.02;
      [[784, 0], [1046, 0.12], [1318, 0.24]].forEach(([f, d]) => this.tone(c, t + d, f, f, 0.22, 0.6));
    },
    rattle() { // おみくじ箱を振る音
      const c = this.c(); if (!c) return;
      const t0 = c.currentTime + 0.01;
      for (let i = 0; i < 9; i++) {
        const t = t0 + i * 0.08 + Math.random() * 0.03;
        this.tone(c, t, 900 + Math.random() * 500, 700, 0.28, 0.04, 'triangle');
        this.burst(c, t, 2000, 3, 0.2, 0.03);
      }
    },
    pop() {
      const c = this.c(); if (!c) return;
      this.tone(c, c.currentTime + 0.01, 500, 900, 0.25, 0.08);
    },
    bell() { // おりん：長く響く金属音
      const c = this.c(); if (!c) return;
      const t = c.currentTime + 0.02;
      [[528, 0.16, 4.5], [1457, 0.05, 2.6], [2851, 0.025, 1.4], [532, 0.06, 4.0]].forEach(([f, g, d]) => this.tone(c, t, f, f, g, d));
    },
    plop() { // 灯籠を水に置く音
      const c = this.c(); if (!c) return;
      const t = c.currentTime + 0.01;
      this.tone(c, t, 760, 260, 0.14, 0.18);
      this.burst(c, t, 900, 1, 0.04, 0.12, 'lowpass');
    },
    river: null,
    riverOn() { // 川の音（やわらかいノイズ）
      const c = this.c(); if (!c || this.river) return;
      try {
        const s = c.createBufferSource(); s.buffer = this.noise(c); s.loop = true;
        const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 520; f.Q.value = 0.4;
        const g = c.createGain(); g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(0.05, c.currentTime + 1.5);
        s.connect(f); f.connect(g); g.connect(c.destination); s.start();
        this.river = { s, g };
      } catch (e) { this.river = null; }
    },
    riverOff() {
      const r = this.river; this.river = null;
      if (!r || !this.ctx) return;
      try { const t = this.ctx.currentTime; r.g.gain.setValueAtTime(r.g.gain.value, t); r.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8); r.s.stop(t + 0.9); } catch (e) { /* noop */ }
    }
  };
  function buzz(p) { try { if (S.profile.sound && navigator.vibrate) navigator.vibrate(p); } catch (e) { /* 振動なし */ } }

  // ============ 声（Web Speech API） ============
  const Voice = {
    v: null, ok: false,
    init() {
      if (!('speechSynthesis' in window)) return;
      const choose = () => {
        try {
          const vs = speechSynthesis.getVoices() || [];
          this.v = vs.find(x => /^ja[-_]JP/i.test(x.lang)) || vs.find(x => /^ja/i.test(x.lang)) || null;
          const was = this.ok;
          this.ok = !!this.v;
          if (this.ok !== was) refreshVoiceUI();
        } catch (e) { this.ok = false; }
      };
      choose();
      try { speechSynthesis.addEventListener('voiceschanged', choose); } catch (e) { speechSynthesis.onvoiceschanged = choose; }
    },
    can() { return this.ok; },
    speak(text, o) {
      o = o || {};
      return new Promise(res => {
        if (!this.ok || (!o.force && !S.profile.voice)) return res();
        try {
          speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(String(text).replace(/[「」『』]/g, ''));
          u.voice = this.v; u.lang = this.v.lang;
          u.pitch = clamp(o.pitch == null ? 1 : o.pitch, 0, 2);
          u.rate = clamp(o.rate == null ? 1 : o.rate, 0.1, 3);
          if (o.volume != null) u.volume = o.volume;
          let done = false;
          const fin = () => { if (!done) { done = true; res(); } };
          u.onend = fin; u.onerror = fin;
          speechSynthesis.speak(u);
          setTimeout(fin, 15000);
        } catch (e) { res(); }
      });
    },
    stop() { try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) { /* noop */ } }
  };
  function refreshVoiceUI() { if (current === 'gakuya' && !sheets.length) rerender(); }

  // ============ トースト・シート ============
  let toastTimer = null;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
  }

  const sheets = [];
  function openSheet(html, opts) {
    opts = opts || {};
    const wrap = document.createElement('div');
    wrap.className = 'sheet-wrap';
    wrap.innerHTML = `<div class="sheet-backdrop" data-act="closeSheet"></div>
      <div class="sheet ${opts.cls || ''}" role="dialog" aria-modal="true" aria-label="${esc(opts.label || '')}" tabindex="-1">
        <div class="sheet-top"><span class="sheet-grip" aria-hidden="true"></span><button class="sheet-close" data-act="closeSheet">閉じる</button></div>
        <div class="sheet-body">${html}</div>
      </div>`;
    $('#sheet-root').appendChild(wrap);
    sheets.push({ wrap, prev: document.activeElement, onClose: opts.onClose });
    document.body.classList.add('no-scroll');
    requestAnimationFrame(() => { wrap.classList.add('open'); const s = $('.sheet', wrap); if (s) s.focus({ preventScroll: true }); });
    return wrap;
  }
  function sheetBody() { const s = sheets[sheets.length - 1]; return s ? $('.sheet-body', s.wrap) : null; }
  function closeSheet() {
    const s = sheets.pop();
    if (!s) return;
    s.wrap.classList.remove('open');
    setTimeout(() => s.wrap.remove(), 240);
    if (!sheets.length && !overlayOpen()) document.body.classList.remove('no-scroll');
    if (s.onClose) s.onClose();
    try { if (s.prev && s.prev.focus) s.prev.focus({ preventScroll: true }); } catch (e) { /* noop */ }
  }
  function closeAllSheets() { while (sheets.length) closeSheet(); }
  function overlayOpen() {
    const a = document.getElementById('stage-root'), b = document.getElementById('calm-root');
    return !!((a && a.childElementCount) || (b && b.childElementCount));
  }
  function confirmSheet(msg, yesLabel, onYes) {
    openSheet(`<div class="confirm"><p class="confirm-msg">${esc(msg)}</p>
      <div class="btn-row"><button class="btn btn-ghost" data-act="closeSheet">やめる</button>
      <button class="btn btn-danger" data-act="confirmYes">${esc(yesLabel)}</button></div></div>`, { label: '確認' });
    pendingConfirm = onYes;
  }
  let pendingConfirm = null;

  // ============ 計算 ============
  function rankOf(xp) {
    let r = D.RANKS[0], next = D.RANKS[1] || null;
    D.RANKS.forEach((k, i) => { if (xp >= k.min) { r = k; next = D.RANKS[i + 1] || null; } });
    return { name: r.name, min: r.min, next };
  }
  let pendingRank = null;
  function addXP(n) {
    const before = rankOf(S.xp).name;
    S.xp += n;
    const after = rankOf(S.xp).name;
    if (after !== before) { pendingRank = after; return after; }
    return null;
  }
  // 昇進披露口上（次の画面描画のあとに、晴れ舞台としてお披露目）
  function celebrateRank(rank) {
    Sfx.hyoshigi();
    openSheet(`<div class="kojo">
      <div class="mekuri mekuri-big" aria-hidden="true"><span class="mekuri-rank">${esc(rank)}</span><span class="mekuri-name">${esc(S.profile.name)}</span></div>
      <p class="eyebrow">昇進披露口上</p>
      <h2 class="sheet-title">「${esc(rank)}」に昇進いたしました</h2>
      <p class="kojo-text">高いところからではございますが、ひとことご挨拶を申し上げます。このたび${esc(S.profile.name)}、「${esc(rank)}」に昇進いたしました。これもひとえに、頭の中の妖怪たちが毎晩せっせとボケつづけてくれたおかげでございます。今後とも、ツッコんだり、眺めたり、休んだりしながら、精進してまいります。</p>
      <button class="btn btn-primary btn-block" data-act="closeSheet">よっ、待ってました！</button>
    </div>`, { label: '昇進披露口上' });
  }
  function metCount() { return D.YOKAI.filter(y => S.yokai[y.id] && S.yokai[y.id].met > 0).length; }
  function hearts(n) {
    n = n || 0;
    const heart = on => `<svg class="h${on ? ' on' : ''}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.6-4.5-9.4-9.3C1.4 8 3.4 4.5 6.9 4.5c2.2 0 3.8 1.3 5.1 3 1.3-1.7 2.9-3 5.1-3 3.5 0 5.5 3.5 4.3 6.7-1.8 4.8-9.4 9.3-9.4 9.3z"/></svg>`;
    let s = '';
    for (let i = 0; i < 5; i++) s += heart(i < n);
    return `<span class="hearts" role="img" aria-label="なかよし度 ${n}/5">${s}</span>`;
  }
  function kudanStats() {
    const ch = S.prophecies.filter(p => p.status === 'checked');
    const score = ch.reduce((s, p) => s + (p.result === 'hit' ? 1 : p.result === 'partial' ? 0.5 : 0), 0);
    const n = ch.length;
    return {
      n,
      pct: n ? Math.round(score / n * 100) : null,
      hits: ch.filter(p => p.result === 'hit').length,
      misses: ch.filter(p => p.result === 'miss').length,
      avgPred: n ? ch.reduce((s, p) => s + p.severity, 0) / n : null,
      avgAct: n ? ch.reduce((s, p) => s + (p.actualSeverity || 0), 0) / n : null
    };
  }
  function mikujiStats() {
    const done = S.omikuji.filter(o => o.done);
    const n = done.length;
    const better = done.filter(o => o.actual > o.predicted).length;
    const gain = n ? done.reduce((s, o) => s + (o.actual - o.predicted), 0) / n : 0;
    return { n, better, gain };
  }
  function isRisky(text) {
    const t = String(text || '');
    return D.RISK_WORDS.some(w => t.includes(w)) || D.RISK_REGEX.test(t);
  }
  function styleOf() { return S.profile.style === 'kansai' ? 'kansai' : 'yasashi'; }
  function tkLine(t, gentle) { return styleOf() === 'kansai' && !gentle ? t.kansai : t.yasashi; }
  function bokeLine(y, thought) { return y.pre + '「' + thought + '」' + y.post; }

  // ============ ルーター ============
  let current = 'home';
  let welcomeBack = false;
  const VIEWS = {};
  function route() {
    const h = (location.hash || '').replace('#', '');
    if (ST) closeStage(); // 画面を移ったら、上演は幕を下ろす
    render(VIEWS[h] ? h : 'home');
  }
  function render(name, keepScroll) {
    current = name;
    closeAllSheets();
    const v = $('#view');
    v.innerHTML = VIEWS[name]();
    v.dataset.view = name;
    $$('[data-tab]').forEach(t => {
      const on = t.dataset.tab === name || (name === 'manzai' && t.dataset.tab === 'home') || (name === 'mochineta' && t.dataset.tab === 'neta');
      t.classList.toggle('is-active', on);
      if (on) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    });
    if (!keepScroll) window.scrollTo(0, 0);
    if (pendingRank) {
      const r = pendingRank; pendingRank = null;
      setTimeout(() => { if (!overlayOpen()) celebrateRank(r); else pendingRank = r; }, 600);
    }
  }
  function rerender() { render(current, true); }
  function go(name) {
    if (location.hash === '#' + name) render(name);
    else location.hash = name;
  }

  const ACT = {};
  const BIND = {};
  const FORM = {};

  // ============ 番組（ホーム） ============
  VIEWS.home = function () {
    const r = rankOf(S.xp);
    const prog = r.next ? Math.round((S.xp - r.min) / (r.next.min - r.min) * 100) : 100;
    const ks = kudanStats();
    const due = S.prophecies.filter(p => p.status === 'open' && p.checkDate <= today()).length;
    const gesoDue = (S.nagame.geso || []).filter(g => g.status === 'held' && new Date(g.due) <= new Date()).length;
    const tip = D.TIPS[Math.floor(Date.now() / 864e5) % D.TIPS.length];
    const draft = S.draft && S.draft.thought && S.draft.phase === 'edit';
    const h = new Date().getHours();
    const seki = h < 5 ? '深夜席' : h < 11 ? '朝席' : h < 17 ? '昼席' : '夜席';
    return `
    ${!storageOK ? `<p class="notice">この画面では記録を保存できません（プライベートモードなど）。閉じると記録は消えます。</p>` : ''}
    ${welcomeBack ? `<p class="okaeri">おかえりなさい。間があいても大丈夫。ここは毎晩開いています。</p>` : ''}
    <section class="hero" aria-label="今夜のあなた">
      <div class="mekuri" aria-label="めくり ${esc(r.name)} ${esc(S.profile.name)}">
        <span class="mekuri-rank">${esc(r.name)}</span>
        <span class="mekuri-name">${esc(S.profile.name)}</span>
      </div>
      <div class="hero-body">
        <p class="eyebrow">ココロ寄席 ${seki}</p>
        <h1 class="hero-title">頭の中のボケに、<br>ツッコミを。</h1>
        <p class="hero-sub">ツッコめない不安は、眺めて流す。</p>
        <div class="rank-line">
          <div class="meter" role="progressbar" aria-valuenow="${prog}" aria-valuemin="0" aria-valuemax="100" aria-label="次の位までの進み具合"><i style="width:${prog}%"></i></div>
          <span class="rank-next">${r.next ? esc(r.next.name) + 'まで あと' + (r.next.min - S.xp) : '最高位です'}</span>
        </div>
        <dl class="tally">
          <div><dt>上演</dt><dd>${S.scripts.length}<small>回</small></dd></div>
          <div><dt>妖怪</dt><dd>${metCount()}<small>/${D.YOKAI.length}</small></dd></div>
          <div><dt>くだん的中率</dt><dd>${ks.pct == null ? '<span class="dash">—</span>' : ks.pct + '<small>%</small>'}</dd></div>
        </dl>
      </div>
    </section>

    <section class="seat-pick" aria-labelledby="seat-h">
      <h2 id="seat-h" class="seat-q">いま、頭の中は？</h2>
      <div class="seat-btns">
        <button class="seat seat-tsukkomi" data-act="startManzai">
          <span class="seat-k">はっきりしたセリフが浮かんでいる</span>
          <span class="seat-t">ツッコむ席へ</span>
          <span class="seat-s">妖怪漫才</span>
        </button>
        <a class="seat seat-nagame" href="#nagame">
          <span class="seat-k">もやもや・ぐるぐるしている</span>
          <span class="seat-t">ながめる席へ</span>
          <span class="seat-s">ながめ席</span>
        </a>
      </div>
    </section>

    <section class="bangumi" aria-labelledby="bangumi-h">
      <h2 id="bangumi-h" class="sec-title"><span>本日の番組</span></h2>
      <ol class="program">
        <li><button class="act act-main" data-act="startManzai">
          <span class="act-no">一</span>
          <span class="act-body"><span class="act-name">妖怪漫才</span>
          <span class="act-desc">${draft ? '書きかけのネタがあります。続きからどうぞ' : '頭に浮かんだセリフを妖怪に言わせて、ツッコむ'}</span>
          <span class="act-cta">${draft ? '続きから' : 'ネタを作る'}</span></span>
          <span class="act-art">${A.yokai('satori', 'smug')}</span>
        </button></li>
        <li><a class="act act-nagame" href="#nagame">
          <span class="act-no">二</span>
          <span class="act-body"><span class="act-name">ながめ席${gesoDue ? ` <em class="badge">札の引き取り ${gesoDue}</em>` : ''}</span>
          <span class="act-desc">理由のない不安や止まらない考えを、ツッコまずに眺めて流す</span></span>
          <span class="act-art">${A.yokai('nurarihyon', 'norm')}</span>
        </a></li>
        <li><a class="act" href="#yogen">
          <span class="act-no">三</span>
          <span class="act-body"><span class="act-name">予言くだん${due ? ` <em class="badge">答え合わせ ${due}</em>` : ''}</span>
          <span class="act-desc">不安な予言を記録して、あとで答え合わせ</span></span>
          <span class="act-art">${A.yokai('kudan', 'norm')}</span>
        </a></li>
        <li><a class="act" href="#omikuji">
          <span class="act-no">四</span>
          <span class="act-body"><span class="act-name">行動おみくじ${S.mikujiNow ? ' <em class="badge">挑戦中</em>' : ''}</span>
          <span class="act-desc">元気の残りに合わせて、小さな一手を引く</span></span>
          <span class="act-art act-art-mikuji">${A.omikujiBox()}</span>
        </a></li>
        <li class="nakairi"><button class="nakairi-btn" data-act="openSos">
          <span class="nakairi-k">仲入り</span><span class="nakairi-t">休憩所 ― 呼吸・グラウンディング・相談先</span>
        </button></li>
        <li><a class="act act-sub" href="#zukan">
          <span class="act-no">五</span>
          <span class="act-body"><span class="act-name">妖怪図鑑</span><span class="act-desc">${D.YOKAI.length}の妖怪（考え方のクセと心の状態）となかよくなる</span></span>
        </a></li>
        <li><a class="act act-sub" href="#neta">
          <span class="act-no">六</span>
          <span class="act-body"><span class="act-name">ネタ帳</span><span class="act-desc">これまでの漫才を、もう一度上演する</span></span>
        </a></li>
      </ol>
    </section>

    <aside class="kobanashi" aria-label="今日の小噺"><p class="kobanashi-k">今日の小噺</p><p class="kobanashi-t">${esc(tip)}</p></aside>
    ${S.scripts.length === 0 ? `<section class="first-show"><p>はじめての方は、まず見本の漫才をどうぞ。1分で終わります。</p><button class="btn btn-ghost" data-act="playSample">見本の漫才を観る</button></section>` : ''}
    `;
  };

  ACT.playSample = () => startPerformance(D.SAMPLE, {});
  ACT.openSos = () => openSos();
  ACT.closeSheet = () => closeSheet();
  ACT.confirmYes = () => { const f = pendingConfirm; pendingConfirm = null; closeSheet(); if (f) f(); };
  ACT.goHome = () => { RESULT = null; go('home'); };

  // ============ 妖怪漫才（ネタ作り） ============
  const STEPS = [
    { id: 'feel', label: '気分' }, { id: 'boke', label: 'ボケ' }, { id: 'kantei', label: '鑑定' },
    { id: 'kouza', label: '高座' }, { id: 'tsukkomi', label: 'ツッコミ' }, { id: 'iinaoshi', label: '言い直し' }
  ];
  let MZ = null;
  let RESULT = null;
  function newDraft() {
    return { id: uid(), phase: 'edit', step: 0, emotion: null, emoBefore: 60, situation: '', thought: '', beliefBefore: 70,
      yokai: [], tk: {}, open: null, newThought: '', gentle: false, riskAck: false, beliefAfter: 70, emoAfter: 60, fx: '' };
  }
  function mz() { if (!MZ) MZ = S.draft || newDraft(); return MZ; }
  function saveDraft() { if (MZ) { S.draft = MZ; save(); } }
  let draftTimer = null;
  function saveDraftSoon() { clearTimeout(draftTimer); draftTimer = setTimeout(saveDraft, 300); }
  function setNext(ok) { const b = $('#mzNextBtn'); if (b) b.disabled = !ok; }

  ACT.startManzai = () => { RESULT = null; mz(); saveDraft(); go('manzai'); };
  function startManzaiWith(thought, fromNeta) {
    const run = () => {
      RESULT = null;
      MZ = newDraft();
      MZ.thought = String(thought || '').slice(0, 300);
      if (fromNeta) MZ.fromNeta = fromNeta;
      saveDraft();
      go('manzai');
    };
    const d = MZ || S.draft;
    if (d && d.phase === 'edit' && d.thought && d.thought !== thought) {
      confirmSheet('書きかけのネタがあります。新しいネタに置きかえますか？（書きかけは消えます）', '置きかえる', run);
    } else run();
  }

  VIEWS.manzai = function () {
    if (RESULT) return mzDone(RESULT);
    const m = mz();
    if (m.phase === 'rate') return mzRate(m);
    const step = STEPS[m.step].id;
    return ({ feel: sFeel, boke: sBoke, kantei: sKantei, kouza: sKouza, tsukkomi: sTsukkomi, iinaoshi: sIinaoshi })[step](m);
  };

  function stepHead(i) {
    return `<div class="wiz-head">
      <button class="link-btn" data-act="mzQuit">やめる</button>
      <ol class="steps" aria-label="ネタ作りの進み具合">${STEPS.map((s, k) => `<li class="${k < i ? 'done' : k === i ? 'now' : ''}"${k === i ? ' aria-current="step"' : ''}><span>${s.label}</span></li>`).join('')}</ol>
    </div>`;
  }
  function wizNav(i, label, disabled) {
    return `<div class="wiz-nav">
      ${i > 0 ? '<button class="btn btn-ghost" data-act="mzPrev">もどる</button>' : '<span></span>'}
      <button class="btn btn-primary" id="mzNextBtn" data-act="mzNext"${disabled ? ' disabled' : ''}>${esc(label || '次へ')}</button>
    </div>`;
  }

  function sFeel(m) {
    return `${stepHead(0)}
    <h1 class="wiz-title">いま、どんな気分？</h1>
    <p class="wiz-lead">いちばん近いものを、ひとつ選んでください。</p>
    <div class="chips" role="group" aria-label="気分">${D.EMOTIONS.map(e =>
      `<button class="chip${m.emotion === e.id ? ' on' : ''}" aria-pressed="${m.emotion === e.id}" data-act="mzEmotion" data-id="${e.id}">${e.label}</button>`).join('')}</div>
    <div class="field">
      <label for="emoBefore">その気分の強さ <output id="emoBeforeOut">${m.emoBefore}</output></label>
      <input type="range" id="emoBefore" min="0" max="100" step="5" value="${m.emoBefore}" data-out="emoBeforeOut" data-bind="emoBefore">
      <div class="range-scale"><span>かすか</span><span>いっぱい</span></div>
    </div>
    <a class="detour" href="#nagame"><span class="detour-k">はっきりした出来事や考えがないときは</span><span class="detour-t">ながめ席で、ただ眺める</span></a>
    ${wizNav(0, '次へ', !m.emotion)}`;
  }

  function sBoke(m) {
    return `${stepHead(1)}
    <h1 class="wiz-title">頭に浮かんだセリフは？</h1>
    <p class="wiz-lead">考えたことを、そのまま一行で。ここに書いたことは、この端末の外には出ません。</p>
    <div class="field">
      <label for="situation">何があった？ <span class="opt">書かなくてもOK</span></label>
      <input type="text" id="situation" maxlength="120" value="${esc(m.situation)}" placeholder="例：明日の会議で発表する" data-bind="situation" autocomplete="off">
    </div>
    <div class="field">
      <label for="thought">ボケ（頭の中のセリフ）</label>
      <textarea id="thought" rows="3" maxlength="300" placeholder="例：どうせ、みんなに嫌われてる" data-bind="thought">${esc(m.thought)}</textarea>
      <div class="examples"><span class="examples-k">例から選ぶ</span>${D.EXAMPLE_THOUGHTS.map((t, i) =>
        `<button class="chip chip-sm" data-act="mzExample" data-i="${i}">${esc(t)}</button>`).join('')}
        <button class="chip chip-sm chip-lib" data-act="pickNeta">持ちネタ集（${NT.LIST.length}本）から探す</button></div>
    </div>
    <div class="field">
      <label for="beliefBefore">どれくらい本気で信じてる？ <output id="beliefBeforeOut">${m.beliefBefore}%</output></label>
      <input type="range" id="beliefBefore" min="0" max="100" step="5" value="${m.beliefBefore}" data-out="beliefBeforeOut" data-unit="%" data-bind="beliefBefore">
      <div class="range-scale"><span>ぜんぜん</span><span>100%本気</span></div>
    </div>
    ${wizNav(1, '鑑定へ', m.thought.trim().length < 2)}`;
  }

  const DISTORTIONS = D.YOKAI.filter(y => y.kind !== 'state');
  const STATES = D.YOKAI.filter(y => y.kind === 'state');
  function vagueOf(text) {
    const t = String(text || '');
    return STATES.filter(y => y.keywords.some(k => t.includes(k))).map(y => y.id);
  }
  function suggest(text) {
    const t = String(text || '');
    return DISTORTIONS
      .map(y => ({ id: y.id, s: y.keywords.reduce((a, k) => a + (t.includes(k) ? 1 : 0), 0) }))
      .filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 3).map(x => x.id);
  }

  function sKantei(m) {
    const sug = suggest(m.thought + ' ' + m.situation);
    const vague = vagueOf(m.thought + ' ' + m.situation);
    return `${stepHead(2)}
    <h1 class="wiz-title">妖怪鑑定</h1>
    <p class="wiz-lead">このセリフは、どの妖怪のしわざ？ 2体まで選べます。</p>
    <blockquote class="boke-quote">「${esc(m.thought)}」</blockquote>
    ${vague.length ? `<div class="vague-hint">
      <div class="vague-art">${A.yokai(vague[0], 'norm')}</div>
      <div><p><strong>${esc(D.yokaiById[vague[0]].name)}</strong>の気配もします。理由のはっきりしない不安や、止まらない考えには、言い返すより「眺める」ほうが合うことがあります。</p>
      <a class="btn btn-small" href="#nagame">ながめ席へ</a></div>
    </div>` : ''}
    ${sug.length
      ? `<p class="hint">ことばから鑑定すると……<strong>${sug.map(id => esc(D.yokaiById[id].name)).join('、')}</strong>が怪しい。</p>`
      : `<p class="hint">ピンとくるものを選んでください。迷ったら、いちばん近そうな1体でOK。</p>`}
    <div class="yk-grid">${DISTORTIONS.map(y => {
      const on = m.yokai.includes(y.id);
      return `<button class="yk-pick${on ? ' on' : ''}${sug.includes(y.id) ? ' sus' : ''}" aria-pressed="${on}" data-act="mzYokai" data-id="${y.id}">
        ${sug.includes(y.id) ? '<span class="sus-tag">怪しい</span>' : ''}
        ${A.yokai(y.id, on ? 'smug' : 'norm')}
        <span class="yk-pick-name">${esc(y.name)}</span>
        <span class="yk-pick-dist">${esc(y.distortion)}</span>
        <span class="yk-pick-kc">「${esc(y.kuchiguse[0])}」</span>
      </button>`;
    }).join('')}</div>
    ${wizNav(2, '高座にあげる', !m.yokai.length)}`;
  }

  function sKouza(m) {
    const y = D.yokaiById[m.yokai[0]];
    const voiceNote = Voice.can() ? '' : '<p class="muted small">この端末では読み上げが使えないため、見た目だけ変わります。</p>';
    return `${stepHead(3)}
    <h1 class="wiz-title">高座にあげてみよう</h1>
    <p class="wiz-lead">そのセリフを、${esc(y.name)}に言わせてみます。声や大きさを変えて、遊んでみてください。</p>
    <div class="mini-stage">
      <div class="mini-bubble" id="kouzaBubble" data-fx="${esc(m.fx)}"><span class="who">${esc(y.name)}</span><span class="mini-text">${esc(bokeLine(y, m.thought))}</span></div>
      <div class="mini-actor" id="kouzaActor">${A.yokai(y.id, 'smug')}</div>
    </div>
    <div class="fx-row" role="group" aria-label="セリフで遊ぶ">
      <button class="btn btn-small" data-act="kouzaFx" data-fx="yokai">妖怪の声</button>
      <button class="btn btn-small" data-act="kouzaFx" data-fx="helium">ヘリウム声</button>
      <button class="btn btn-small" data-act="kouzaFx" data-fx="slow">スローモー</button>
      <button class="btn btn-small" data-act="kouzaFx" data-fx="tiny">ちっちゃく</button>
      <button class="btn btn-small fx-telop" data-act="kouzaFx" data-fx="telop">テロップを出す</button>
    </div>
    ${voiceNote}
    <div class="defuse">
      <p class="defuse-k">ここがポイント</p>
      <p>このセリフを言っているのは<strong>${esc(y.name)}</strong>。あなたではありません。</p>
      <p class="defuse-reframe">「${esc(m.thought)}」<br><span>……という考えが、いま浮かんでいる。</span></p>
      <p class="muted">落語家が扇子一本でそばをすすって見せるように、妖怪はセリフ一つで、まだ起きていない出来事を見せる名人です。出来事は本物でも、頭の中のセリフには脚色が入っています。セリフなら、ツッコめます。</p>
    </div>
    ${wizNav(3, 'ツッコミへ', false)}`;
  }

  function recTk(m) {
    const ids = [];
    m.yokai.forEach(yid => D.yokaiById[yid].weak.forEach(t => { if (!ids.includes(t)) ids.push(t); }));
    return ids.slice(0, 4);
  }
  function tkCard(m, id) {
    const t = D.tsukkomiById[id];
    const a = m.tk[id] || '';
    const open = m.open === id || !!a.trim();
    return `<div class="tk-card${open ? ' open' : ''}${a.trim() ? ' answered' : ''}">
      <button class="tk-head" data-act="tkToggle" data-id="${id}" aria-expanded="${open}" aria-controls="tkb-${id}">
        <span class="tk-line">${esc(tkLine(t, m.gentle))}</span><span class="tk-tech">${esc(t.tech)}</span><span class="tk-check" aria-hidden="true"></span>
      </button>
      <div class="tk-body" id="tkb-${id}"${open ? '' : ' hidden'}>
        <label for="tk-${id}">${esc(t.q)}</label>
        <textarea id="tk-${id}" rows="3" maxlength="400" placeholder="${esc(t.ph)}" data-bind="tk" data-id="${id}">${esc(a)}</textarea>
      </div>
    </div>`;
  }
  function sTsukkomi(m) {
    const rec = recTk(m);
    const others = D.TSUKKOMI.map(t => t.id).filter(id => !rec.includes(id));
    const answered = Object.values(m.tk).filter(v => v && v.trim()).length;
    const othersOpen = others.some(id => (m.tk[id] || '').trim() || m.open === id);
    const names = m.yokai.map(id => D.yokaiById[id].name).join('と');
    return `${stepHead(4)}
    <h1 class="wiz-title">ツッコミを入れよう</h1>
    <p class="wiz-lead">${esc(names)}の弱点は、このあたり。気になるものを開いて、1つ以上答えてみてください。</p>
    <blockquote class="boke-quote">「${esc(m.thought)}」</blockquote>
    <div class="tk-list">${rec.map(id => tkCard(m, id)).join('')}</div>
    <details class="more-tk"${othersOpen ? ' open' : ''}><summary>ほかのツッコミ（${others.length}）</summary>
      <div class="tk-list">${others.map(id => tkCard(m, id)).join('')}</div>
    </details>
    ${wizNav(4, '言い直しへ', answered === 0)}`;
  }

  function sIinaoshi(m) {
    const answered = Object.entries(m.tk).filter(([, v]) => v && v.trim());
    return `${stepHead(5)}
    <h1 class="wiz-title">言い直しのセリフ</h1>
    <p class="wiz-lead">ツッコミをふまえて、しっくりくる言い方に。完璧じゃなくていい。「ちょっとマシ」で十分です。</p>
    <div class="recap">
      <p class="recap-row"><span class="recap-k">ボケ</span><span>「${esc(m.thought)}」</span></p>
      ${answered.map(([id, a]) => `<p class="recap-row"><span class="recap-k tk">${esc(tkLine(D.tsukkomiById[id], m.gentle))}</span><span>${nl2br(a)}</span></p>`).join('')}
    </div>
    <div class="field">
      <label for="newThought">新しいセリフ</label>
      <div class="examples"><span class="examples-k">書き出しを入れる</span>${D.STEMS.map((s, i) =>
        `<button class="chip chip-sm" data-act="mzStem" data-i="${i}">${esc(s)}</button>`).join('')}</div>
      <textarea id="newThought" rows="4" maxlength="400" placeholder="例：変だと思う人もいるかもしれない。でも、前はうなずいてもらえた。" data-bind="newThought">${esc(m.newThought)}</textarea>
    </div>
    ${wizNav(5, m.gentle ? '読み上げる' : 'いざ、上演！', m.newThought.trim().length < 2)}`;
  }

  function mzRate(m) {
    const emo = D.emotionById[m.emotion] || { label: '気分' };
    return `<div class="wiz-head"><span class="eyebrow">終演</span></div>
    <h1 class="wiz-title">おつかれさまでした</h1>
    <p class="wiz-lead">上演してみて、いまはどうですか。感じたままで大丈夫です。</p>
    <blockquote class="boke-quote">「${esc(m.thought)}」</blockquote>
    <div class="field">
      <label for="beliefAfter">このセリフ、いまはどれくらい信じてる？ <output id="beliefAfterOut">${m.beliefAfter}%</output></label>
      <input type="range" id="beliefAfter" min="0" max="100" step="5" value="${m.beliefAfter}" data-out="beliefAfterOut" data-unit="%" data-bind="beliefAfter">
      <div class="range-scale"><span>ぜんぜん</span><span>100%本気</span></div>
      <p class="was">上演前は ${m.beliefBefore}%</p>
    </div>
    <div class="field">
      <label for="emoAfter">「${esc(emo.label)}」の強さは？ <output id="emoAfterOut">${m.emoAfter}</output></label>
      <input type="range" id="emoAfter" min="0" max="100" step="5" value="${m.emoAfter}" data-out="emoAfterOut" data-bind="emoAfter">
      <div class="range-scale"><span>かすか</span><span>いっぱい</span></div>
      <p class="was">上演前は ${m.emoBefore}</p>
    </div>
    <fieldset class="field belief-field"><legend>このボケの奥にあったのは？ <span class="opt">選ばなくてもOK</span></legend>
      <p class="muted small">考えの奥には、昔からの「思いこみのクセ」がひそんでいることがあります。近いものがあれば、ひとつ。</p>
      <div class="chips" role="group" aria-label="奥にある思い">${NT.BELIEFS.map(b =>
        `<button class="chip${m.belief === b.id ? ' on' : ''}" aria-pressed="${m.belief === b.id}" data-act="mzBelief" data-id="${b.id}">${esc(b.label)}</button>`).join('')}
        <button class="chip${m.belief === 'unknown' ? ' on' : ''}" aria-pressed="${m.belief === 'unknown'}" data-act="mzBelief" data-id="unknown">わからない</button></div>
    </fieldset>
    <div class="wiz-nav"><button class="btn btn-ghost" data-act="mzReplayDraft">もう一度観る</button><button class="btn btn-primary" data-act="mzSave">ネタ帳にしまう</button></div>`;
  }
  ACT.mzBelief = el => {
    const m = mz(); const id = el.dataset.id;
    m.belief = m.belief === id ? null : id;
    $$('.chip[data-act="mzBelief"]').forEach(c => { const on = c.dataset.id === m.belief; c.classList.toggle('on', on); c.setAttribute('aria-pressed', on); });
    saveDraftSoon();
  };

  function baRow(label, before, after, unit) {
    const d = after - before;
    const delta = d < 0 ? '−' + (-d) : d > 0 ? '+' + d : '±0';
    return `<div class="ba-row">
      <p class="ba-k">${esc(label)}</p>
      <div class="ba-bars">
        <div class="ba-line"><span class="ba-tag">前</span><span class="ba-track"><i class="ba-fill before" style="width:${before}%"></i></span><span class="ba-v">${before}${unit}</span></div>
        <div class="ba-line"><span class="ba-tag">後</span><span class="ba-track"><i class="ba-fill after" style="width:${after}%"></i></span><span class="ba-v">${after}${unit}</span></div>
      </div>
      <p class="ba-delta${d < 0 ? ' down' : ''}">${delta}</p>
    </div>`;
  }

  function mzDone(r) {
    const sc = S.scripts.find(s => s.id === r.id);
    if (!sc) { RESULT = null; return VIEWS.home(); }
    const y = D.yokaiById[sc.yokai[0]];
    const rec = S.yokai[y.id] || { friend: 0 };
    const drop = sc.beliefBefore - sc.beliefAfter;
    const emo = D.emotionById[sc.emotion] || { label: '気分' };
    return `<div class="done">
      <div class="done-hero">
        <div class="done-art">${A.yokai(y.id, 'happy')}</div>
        <p class="done-k">${esc(y.name)}と、なかよくなりました</p>
        ${hearts(rec.friend)}
      </div>
      <section class="ba" aria-label="上演の前と後">
        ${baRow('セリフの信じ度', sc.beliefBefore, sc.beliefAfter, '%')}
        ${baRow('「' + emo.label + '」の強さ', sc.emoBefore, sc.emoAfter, '')}
      </section>
      <p class="done-msg">${drop > 0
        ? `セリフの重みが <strong>${drop}ポイント</strong> 軽くなりました。`
        : '数字が変わらなくても大丈夫。ツッコミを入れてみたこと自体が、次の練習になります。'}</p>
      <p class="xp-gain">経験 +${r.xp}${r.rankUp ? `　<strong>${esc(r.rankUp)}に昇進しました</strong>` : ''}</p>
      ${r.unlocked.map(id => { const u = D.yokaiById[id]; return `<div class="honne"><p class="honne-k">${esc(u.name)}の本音が聞けるようになりました</p><blockquote>${esc(u.honne)}</blockquote></div>`; }).join('')}
      ${sc.gentle ? `<div class="gentle-note"><p>今日はとてもしんどい気持ちを書いてくれました。ひとりで抱えなくて大丈夫です。</p><button class="btn btn-ghost" data-act="openSos">相談先を見る</button></div>` : ''}
      <div class="btn-row"><button class="btn btn-ghost" data-act="replay" data-id="${sc.id}">もう一度上演</button><button class="btn btn-primary" data-act="goHome">番組にもどる</button></div>
    </div>`;
  }

  // ---- ネタ作りの操作 ----
  ACT.mzQuit = () => {
    const m = mz();
    if (!m.thought && !m.emotion) { MZ = null; S.draft = null; save(); go('home'); return; }
    openSheet(`<div class="confirm"><p class="confirm-msg">書きかけのネタは保存されています。番組から、いつでも続きを再開できます。</p>
      <div class="btn-col"><button class="btn btn-primary" data-act="mzQuitKeep">保存して番組にもどる</button>
      <button class="btn btn-ghost danger-text" data-act="mzQuitDrop">書きかけを捨てる</button></div></div>`, { label: 'ネタ作りをやめる' });
  };
  ACT.mzQuitKeep = () => { saveDraft(); MZ = null; closeSheet(); go('home'); };
  ACT.mzQuitDrop = () => { MZ = null; S.draft = null; save(); closeSheet(); go('home'); };
  ACT.mzPrev = () => { const m = mz(); m.step = Math.max(0, m.step - 1); saveDraft(); render('manzai'); };
  ACT.mzEmotion = el => {
    const m = mz(); m.emotion = el.dataset.id;
    $$('.chip[data-act="mzEmotion"]').forEach(c => { const on = c.dataset.id === m.emotion; c.classList.toggle('on', on); c.setAttribute('aria-pressed', on); });
    setNext(true); saveDraftSoon();
  };
  ACT.mzExample = el => {
    const t = D.EXAMPLE_THOUGHTS[+el.dataset.i];
    const ta = $('#thought'); ta.value = t; mz().thought = t; setNext(true); saveDraftSoon(); ta.focus();
  };
  ACT.mzYokai = el => {
    const m = mz(); const id = el.dataset.id;
    if (m.yokai.includes(id)) m.yokai = m.yokai.filter(x => x !== id);
    else { m.yokai.push(id); if (m.yokai.length > 2) m.yokai.shift(); }
    saveDraft(); rerender();
  };
  ACT.kouzaFx = el => {
    const m = mz(); const y = D.yokaiById[m.yokai[0]]; const fx = el.dataset.fx;
    const b = $('#kouzaBubble'); const actor = $('#kouzaActor');
    if (fx === 'telop') { // ※イメージです
      const stage = b.closest('.mini-stage');
      let t = $('.mini-telop', stage);
      if (!t) { t = document.createElement('span'); t.className = 'mini-telop'; t.setAttribute('role', 'status'); stage.appendChild(t); }
      let txt = pick(D.TELOPS);
      for (let k = 0; k < 4 && txt === t.textContent; k++) txt = pick(D.TELOPS);
      t.textContent = txt;
      t.classList.remove('in'); void t.offsetWidth; t.classList.add('in');
      Sfx.pop(); buzz(10);
      Voice.speak(txt.replace('※', ''), { force: true, pitch: 1, rate: 1.15 });
      return;
    }
    m.fx = fx;
    b.dataset.fx = ''; void b.offsetWidth; b.dataset.fx = fx;
    actor.classList.remove('bob'); void actor.offsetWidth; actor.classList.add('bob');
    const text = bokeLine(y, m.thought);
    const v = { yokai: y.voice, helium: { pitch: 2, rate: 1.7 }, slow: { pitch: 0.6, rate: 0.45 }, tiny: { pitch: 1.9, rate: 1.1, volume: 0.35 } }[fx];
    Voice.speak(text, Object.assign({ force: true }, v));
  };
  ACT.tkToggle = el => {
    const m = mz(); const id = el.dataset.id;
    const card = el.closest('.tk-card'); const body = $('.tk-body', card);
    const open = body.hidden;
    body.hidden = !open; card.classList.toggle('open', open); el.setAttribute('aria-expanded', open);
    m.open = open ? id : null;
    if (open) { const ta = $('textarea', body); setTimeout(() => ta.focus(), 30); }
  };
  ACT.mzStem = el => {
    const s = D.STEMS[+el.dataset.i];
    const ta = $('#newThought');
    const v = ta.value;
    ta.value = v ? v.replace(/\s*$/, '') + (v.trim() ? '\n' : '') + s : s;
    mz().newThought = ta.value; setNext(ta.value.trim().length >= 2); saveDraftSoon();
    ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
  };

  let riskNext = null;
  function guardRisk(text, cont) {
    const m = mz();
    if (!m.riskAck && isRisky(text)) {
      riskNext = cont;
      openSheet(`<div class="risk">
        <h2 class="sheet-title">少しだけ、立ち止まらせてください</h2>
        <p>とてもつらい気持ちが書かれているように見えました。これは、漫才のネタにするには重すぎるテーマかもしれません。あなたの安全が、いちばん大事です。</p>
        <div class="btn-col">
          <button class="btn btn-primary" data-act="openSos">相談先と休憩所を見る</button>
          <button class="btn btn-ghost" data-act="riskContinue">このまま書き続ける（静かなモードで）</button>
          <button class="btn btn-ghost" data-act="riskStop">今日はここまでにする</button>
        </div>
        <p class="muted small">いますぐ命の危険を感じるときは、迷わず 119（救急）に連絡してください。</p>
      </div>`, { label: '安全の確認' });
      return true;
    }
    return false;
  }
  ACT.riskContinue = () => {
    const m = mz(); m.riskAck = true; m.gentle = true; saveDraft();
    closeSheet();
    toast('静かなモードにしました。効果音とハリセンはお休みです。');
    const f = riskNext; riskNext = null; if (f) f();
  };
  ACT.riskStop = () => { saveDraft(); MZ = null; riskNext = null; closeSheet(); go('home'); toast('書いたところまで保存しました。今日はゆっくり休んでください。'); };

  ACT.mzNext = () => {
    const m = mz();
    const step = STEPS[m.step].id;
    const advance = () => { m.step = Math.min(m.step + 1, STEPS.length - 1); saveDraft(); render('manzai'); };
    if (step === 'boke') { if (guardRisk(m.thought + ' ' + m.situation, advance)) return; }
    if (step === 'tsukkomi') { if (guardRisk(Object.values(m.tk).join(' '), advance)) return; }
    if (step === 'iinaoshi') {
      const perform = () => {
        startPerformance(scriptFromDraft(m), {
          onEnd: () => { m.phase = 'rate'; m.beliefAfter = m.beliefBefore; m.emoAfter = m.emoBefore; saveDraft(); render('manzai'); }
        });
      };
      if (guardRisk(m.newThought, perform)) return;
      perform();
      return;
    }
    advance();
  };
  ACT.mzReplayDraft = () => startPerformance(scriptFromDraft(mz()), {});

  function scriptFromDraft(m) {
    return {
      id: m.id, date: new Date().toISOString(), emotion: m.emotion, emoBefore: m.emoBefore,
      situation: m.situation.trim(), thought: m.thought.trim(), beliefBefore: m.beliefBefore,
      yokai: m.yokai.slice(),
      tk: Object.entries(m.tk).filter(([, v]) => v && v.trim()).map(([id, a]) => ({ id, a: a.trim() })),
      newThought: m.newThought.trim(), gentle: !!m.gentle
    };
  }

  ACT.mzSave = () => {
    const m = mz();
    const sc = scriptFromDraft(m);
    sc.beliefAfter = m.beliefAfter; sc.emoAfter = m.emoAfter; sc.replays = 0;
    if (m.belief) sc.belief = m.belief;
    if (m.fromNeta) sc.fromNeta = m.fromNeta;
    S.scripts.unshift(sc);
    const unlocked = [];
    sc.yokai.forEach(id => {
      const r = S.yokai[id] || (S.yokai[id] = { met: 0, friend: 0 });
      const before = r.friend;
      r.met += 1; r.friend = Math.min(5, r.friend + 1);
      if (before < 3 && r.friend >= 3) unlocked.push(id);
    });
    const rankUp = addXP(D.XP.manzai);
    S.draft = null; MZ = null;
    RESULT = { id: sc.id, unlocked, rankUp, xp: D.XP.manzai };
    save();
    if (!sc.gentle) Sfx.chime();
    render('manzai');
  };

  // ---- 入力のひもづけ ----
  BIND.emoBefore = el => { mz().emoBefore = +el.value; saveDraftSoon(); };
  BIND.situation = el => { mz().situation = el.value; saveDraftSoon(); };
  BIND.thought = el => { mz().thought = el.value; setNext(el.value.trim().length >= 2); saveDraftSoon(); };
  BIND.beliefBefore = el => { mz().beliefBefore = +el.value; saveDraftSoon(); };
  BIND.tk = el => {
    const m = mz(); m.tk[el.dataset.id] = el.value;
    el.closest('.tk-card').classList.toggle('answered', !!el.value.trim());
    setNext(Object.values(m.tk).some(v => v && v.trim())); saveDraftSoon();
  };
  BIND.newThought = el => { mz().newThought = el.value; setNext(el.value.trim().length >= 2); saveDraftSoon(); };
  BIND.beliefAfter = el => { mz().beliefAfter = +el.value; saveDraftSoon(); };
  BIND.emoAfter = el => { mz().emoAfter = +el.value; saveDraftSoon(); };

  // ============ 上演（舞台） ============
  let ST = null;
  const REACTIONS = ['む、むむ……', 'ぐぬぬ……', 'そ、そう来たか……'];

  function buildLines(sc) {
    const y = D.yokaiById[sc.yokai[0]];
    const y2 = sc.yokai[1] ? D.yokaiById[sc.yokai[1]] : null;
    const G = !!sc.gentle;
    const K = styleOf() === 'kansai' && !G;
    const name = S.profile.name || 'ココロ亭';
    const L = [];
    if (G) {
      L.push({ who: 'you', text: name + 'です。今日は、静かにやりますね。' });
      L.push({ who: 'yokai', text: y.name + 'じゃ。……そっと話そう。', mood: 'norm' });
    } else {
      L.push({ who: 'you', text: K ? 'どうもー！ ' + name + 'です！' : 'どうもー、' + name + 'です。' });
      L.push({ who: 'yokai', text: y.name + 'じゃ。よろしゅう。', mood: 'smug' });
      L.push({ who: 'you', text: K ? 'いや聞いてくださいよ。こいつがまた、頭の中で好き勝手しゃべりよるんですわ。' : '今日もこの子が、頭の中でいろいろ言ってきまして。' });
    }
    L.push({ who: 'yokai', kind: 'boke', text: bokeLine(y, sc.thought), mood: 'smug' });
    if (y2) L.push({ who: 'yokai', yid: y2.id, kind: 'boke', text: y2.pre + y2.post, mood: 'smug' });
    const tks = sc.tk.slice(0, 3);
    tks.forEach((t, i) => {
      const T = D.tsukkomiById[t.id];
      if (!T) return;
      const say = G ? T.yasashi : pick(K ? [T.kansai].concat(T.kansaiAlt || []) : [T.yasashi].concat(T.yasashiAlt || []));
      L.push({ who: 'you', kind: G ? 'soft' : 'tsukkomi', text: say, ymood: 'shock' });
      L.push({ who: 'you', text: t.a });
      if (i < tks.length - 1) L.push({ who: 'yokai', text: REACTIONS[i % REACTIONS.length], mood: 'shock' });
    });
    L.push({ who: 'yokai', text: y.concede, mood: 'meek' });
    L.push({ who: 'you', text: G ? 'じゃあ、こう言い直してみるね。' : K ? 'ほな、言い直すで。よう聞いときや。' : 'じゃあ、言い直してみるね。' });
    L.push({ who: 'you', kind: 'final', text: sc.newThought });
    L.push({ who: 'yokai', text: G ? '……うん。その言い方、やさしいのう。' : '……その言い直し、わるくないのう。', mood: 'happy' });
    if (G) {
      L.push({ who: 'both', text: '話してくれて、ありがとう。今日はここまで。', mood: 'happy' });
    } else if (K) {
      L.push({ who: 'you', kind: 'tsukkomi', text: 'もうええわ！', ymood: 'happy' });
      L.push({ who: 'both', text: 'どうも、ありがとうございましたー！', mood: 'happy' });
    } else {
      L.push({ who: 'you', kind: 'tsukkomi', text: 'もう、いいかげんにしなさいっ。', ymood: 'happy' });
      L.push({ who: 'both', text: 'ありがとうございましたー！', mood: 'happy' });
    }
    // 考えはフィクション。ただし、しんどさは本物。
    L.push({ who: 'telop', kind: 'telop', text: G ? D.END_TELOP.gentleMain : D.END_TELOP.main, sub: G ? D.END_TELOP.gentleCare : D.END_TELOP.care, mood: 'happy' });
    return L;
  }

  function startPerformance(sc, opts) {
    opts = opts || {};
    closeAllSheets();
    Voice.stop();
    const y = D.yokaiById[sc.yokai[0]];
    const G = !!sc.gentle;
    const root = $('#stage-root');
    root.innerHTML = `<div class="stage${G ? ' is-gentle' : ''}" role="dialog" aria-modal="true" aria-label="漫才の上演">
      <div class="stage-top">
        <p class="stage-title"><span class="stage-k">${sc.sample ? '見本' : G ? '静かな上演' : '上演中'}</span>${esc(S.profile.name || 'ココロ亭')}・${esc(y.name)}</p>
        <button class="stage-x" data-act="stageClose">やめる</button>
      </div>
      <div class="stage-scene" data-act="stageNext">
        <div class="chochin c1" aria-hidden="true"><span>寄</span></div>
        <div class="chochin c2" aria-hidden="true"><span>席</span></div>
        <div class="bubble-wrap"><div class="bubble" id="stBubble" aria-live="polite"></div></div>
        <div class="burst" id="stBurst" aria-hidden="true"></div>
        <div class="actors">
          <div class="actor actor-yokai" id="stYokai">${A.yokai(y.id, 'smug')}</div>
          <div class="actor actor-mic">${A.mic()}</div>
          <div class="actor actor-you" id="stYou">${A.you('norm')}</div>
        </div>
        <div class="kouza-floor" aria-hidden="true"></div>
      </div>
      <div class="stage-bar">
        <span class="stage-count" id="stCount">開演</span>
        <button class="btn btn-stage-ghost" id="stAuto" data-act="stageAuto" aria-pressed="${!!S.profile.autoPlay}">オート</button>
        ${G ? '' : '<button class="btn btn-stage-ghost" data-act="stageSmack" aria-label="ハリセンでたたく">ハリセン</button>'}
        <button class="btn btn-primary" id="stNext" data-act="stageNext">次へ</button>
      </div>
      <div class="curtain cl" aria-hidden="true"></div><div class="curtain cr" aria-hidden="true"></div>
      <div class="oiri" id="stOiri" hidden><span>${G ? 'おつかれさま' : '大入'}</span></div>
    </div>`;
    document.body.classList.add('no-scroll');
    ST = { sc, lines: buildLines(sc), i: -1, opts, opening: true, ended: false, auto: !!S.profile.autoPlay, autoT: null };
    const stage = $('.stage', root);
    const fast = reduceMotion();
    if (!G) Sfx.hyoshigi();
    setTimeout(() => {
      if (!ST) return;
      stage.classList.add('open');
      if (!G) setTimeout(() => Sfx.taiko(), 300);
      setTimeout(() => { if (!ST) return; ST.opening = false; stageNext(); }, fast ? 50 : 1000);
    }, G || fast ? 200 : 1500);
    setTimeout(() => { const b = $('#stNext'); if (b) b.focus({ preventScroll: true }); }, 50);
  }

  function smack() {
    const you = $('#stYou'), yk = $('#stYokai'), burst = $('#stBurst');
    if (!you || !yk) return;
    you.classList.remove('swing'); yk.classList.remove('hit'); void you.offsetWidth;
    you.classList.add('swing');
    setTimeout(() => {
      yk.classList.add('hit');
      Sfx.harisen(); buzz([30, 30, 40]);
      burst.textContent = pick(['スパーン！', 'パシーン！', 'ペシッ！']);
      burst.classList.remove('pop'); void burst.offsetWidth; burst.classList.add('pop');
    }, 150);
  }

  function stageNext() {
    if (!ST || ST.opening) return;
    clearTimeout(ST.autoT);
    if (ST.ended) { finishStage(); return; }
    ST.i += 1;
    if (ST.i >= ST.lines.length) { endShow(); return; }
    const L = ST.lines[ST.i];
    const yid = L.yid || ST.sc.yokai[0];
    const b = $('#stBubble');
    b.className = 'bubble from-' + L.who + (L.kind ? ' k-' + L.kind : '');
    if (L.who === 'telop') {
      b.innerHTML = `<span class="line">${esc(L.text)}</span><span class="telop-care">${esc(L.sub || '')}</span>`;
    } else {
      const who = L.who === 'you' ? (S.profile.name || 'あなた') : L.who === 'both' ? 'ふたり' : D.yokaiById[yid].name;
      b.innerHTML = `<span class="who">${esc(who)}</span><span class="line">${nl2br(L.text)}</span>`;
    }
    void b.offsetWidth; b.classList.add('in');
    const yEl = $('#stYokai');
    if (L.who === 'yokai' || L.who === 'both' || L.who === 'telop') yEl.innerHTML = A.yokai(yid, L.mood || 'norm');
    else if (L.ymood) yEl.innerHTML = A.yokai(ST.sc.yokai[0], L.ymood);
    $('#stYou').classList.toggle('talking', L.who === 'you' || L.who === 'both');
    yEl.classList.toggle('talking', L.who === 'yokai' || L.who === 'both');
    if (L.kind === 'tsukkomi') smack();
    $('#stCount').textContent = (ST.i + 1) + ' / ' + ST.lines.length;
    $('#stNext').textContent = ST.i === ST.lines.length - 1 ? '終演' : '次へ';
    const spoken = speakLine(L, yid);
    if (ST.auto) scheduleAuto(L, spoken);
  }

  function scheduleAuto(L, spoken) {
    if (!ST || !ST.auto || ST.ended) return;
    const idx = ST.i;
    const goNext = () => { if (ST && ST.auto && !ST.ended && ST.i === idx) stageNext(); };
    if (spoken) {
      spoken.then(() => { if (ST && ST.i === idx) ST.autoT = setTimeout(goNext, 700); });
    } else {
      const len = (L.text || '').length + (L.sub || '').length;
      const ms = clamp(1400 + len * 95, 2000, 8000) + (L.kind === 'tsukkomi' ? 500 : 0) + (L.who === 'telop' ? 2000 : 0);
      ST.autoT = setTimeout(goNext, ms);
    }
  }

  function speakLine(L, yid) {
    if (!S.profile.voice || !Voice.can()) return null;
    const isY = L.who === 'yokai';
    const o = isY ? D.yokaiById[yid].voice : L.kind === 'tsukkomi' ? { pitch: 1.15, rate: 1.3 } : { pitch: 1.05, rate: 1.05 };
    const text = L.who === 'telop' ? L.text.replace(/^※/, '') + ' ' + (L.sub || '') : L.text;
    return Voice.speak(text, o);
  }

  ACT.stageAuto = el => {
    if (!ST) return;
    ST.auto = !ST.auto;
    S.profile.autoPlay = ST.auto; save();
    el.setAttribute('aria-pressed', ST.auto);
    clearTimeout(ST.autoT);
    if (ST.auto && !ST.opening && !ST.ended) ST.autoT = setTimeout(() => { if (ST && ST.auto) stageNext(); }, 1200);
    toast(ST.auto ? 'オートで進みます' : '自分のペースで進みます');
  };

  function endShow() {
    ST.ended = true;
    clearTimeout(ST.autoT);
    Voice.stop();
    const stage = $('.stage');
    stage.classList.remove('open');
    stage.classList.add('closing');
    setTimeout(() => {
      const o = $('#stOiri'); if (!o) return;
      o.hidden = false;
      if (!ST || !ST.sc.gentle) { Sfx.applause(); buzz(80); }
    }, reduceMotion() ? 50 : 900);
    $('#stNext').textContent = ST.opts.onEnd ? '感想へ' : '閉じる';
    $('#stCount').textContent = '終演';
  }

  function closeStage() {
    if (ST) clearTimeout(ST.autoT);
    Voice.stop();
    $('#stage-root').innerHTML = '';
    ST = null;
    if (!sheets.length && !overlayOpen()) document.body.classList.remove('no-scroll');
  }
  function finishStage() {
    const s = ST; closeStage();
    if (s && s.opts.onEnd) s.opts.onEnd();
  }
  ACT.stageNext = () => stageNext();
  ACT.stageSmack = () => { if (ST && !ST.opening) smack(); };
  ACT.stageClose = () => closeStage();

  ACT.replay = el => {
    const sc = S.scripts.find(s => s.id === el.dataset.id);
    if (!sc) return;
    sc.replays = (sc.replays || 0) + 1; save();
    startPerformance(sc, {});
  };

  // ============ 妖怪図鑑 ============
  VIEWS.zukan = function () {
    const card = y => {
      const i = D.YOKAI.indexOf(y);
      const r = S.yokai[y.id];
      const known = !!(r && r.met > 0);
      return `<button class="zk-card${known ? '' : ' unknown'}${y.kind === 'state' ? ' state' : ''}" data-act="zukanOpen" data-id="${y.id}">
        <span class="zk-no">其の${kanjiNum(i + 1)}</span>
        ${A.yokai(y.id, known && r.friend >= 3 ? 'happy' : 'norm', { silhouette: !known })}
        <span class="zk-name">${known ? esc(y.name) : '？？？'}</span>
        <span class="zk-dist">${esc(y.distortion)}</span>
        ${known ? hearts(r.friend) : '<span class="zk-hint">未発見</span>'}
      </button>`;
    };
    return `<header class="page-head"><h1 class="page-title">妖怪図鑑</h1><p class="page-sub">出会った妖怪 <strong>${metCount()}</strong> / ${D.YOKAI.length}</p></header>
    <p class="page-lead">妖怪の正体は、だれにでもある「考え方のクセ」と「心の状態」。退治はしません。ツッコんだり眺めたりするたびに、なかよくなっていきます。</p>
    <section aria-labelledby="zk-d-h"><h2 id="zk-d-h" class="sec-title"><span>考え方のクセ</span></h2>
      <p class="zk-shelf-note">妖怪漫才でツッコむと、静かになる妖怪たち。</p>
      <div class="zk-grid">${DISTORTIONS.map(card).join('')}</div></section>
    <section aria-labelledby="zk-s-h"><h2 id="zk-s-h" class="sec-title"><span>心の状態</span></h2>
      <p class="zk-shelf-note">ツッコむより、ながめ席で眺めると静かになる妖怪たち。</p>
      <div class="zk-grid">${STATES.map(card).join('')}</div></section>`;
  };
  ACT.zukanOpen = el => {
    const y = D.yokaiById[el.dataset.id];
    const r = S.yokai[y.id] || { met: 0, friend: 0 };
    const known = r.met > 0;
    openSheet(`<div class="zk-detail">
      <div class="zk-detail-art">${A.yokai(y.id, known ? (r.friend >= 3 ? 'happy' : 'smug') : 'norm', { silhouette: !known })}</div>
      <p class="zk-detail-dist">${esc(y.distortion)}</p>
      <h2 class="zk-detail-name">${known ? esc(y.name) : '？？？'}</h2>
      <p class="zk-detail-origin">${known ? '元になった伝承：' + esc(y.origin) : y.kind === 'state' ? 'まだ出会っていません。ながめ席で眺めると、正体がわかります。' : 'まだ出会っていません。漫才で鑑定すると、正体がわかります。'}</p>
      <p>${esc(y.desc)}</p>
      <h3>口ぐせ</h3><ul class="kc">${y.kuchiguse.map(k => `<li>「${esc(k)}」</li>`).join('')}</ul>
      <h3>見分け方</h3><p>${esc(y.sign)}</p>
      ${y.kind === 'state'
        ? `<h3>静かになる演目（ながめ席）</h3><ul class="weak">${y.practices.map(pid => { const P = D.NAGAME.practices.find(p => p.id === pid); return `<li><b>${esc(P.name)}</b><span>${esc(P.when)}</span></li>`; }).join('')}</ul>
           <a class="btn btn-ghost" href="#nagame">ながめ席へ</a>`
        : `<h3>弱点のツッコミ</h3><ul class="weak">${y.weak.map(t => { const T = D.tsukkomiById[t]; return `<li><b>${esc(tkLine(T))}</b><span>${esc(T.tech)}</span></li>`; }).join('')}</ul>
           <h3>持ちネタ（${NT.LIST.filter(n => n.y === y.id).length}本）</h3>
           <ul class="pick-list">${NT.LIST.filter(n => n.y === y.id).map(n => `<li><button class="pick-item${seenOf(n.id) ? ' seen' : ''}" data-act="libOpen" data-id="${n.id}"><span>「${esc(n.thought)}」</span><small>${esc(NT.domainById[n.d].label)}${seenOf(n.id) ? '・観た' : ''}</small></button></li>`).join('')}</ul>`}
      <h3>なかよし度</h3><div class="zk-friend">${hearts(r.friend)}<span class="muted">出会った回数 ${r.met}回</span></div>
      <h3>本音</h3>${r.friend >= 3 ? `<blockquote class="honne-q">${esc(y.honne)}</blockquote>` : `<p class="locked">なかよし度が3になると、本音が聞けます（あと${3 - r.friend}）</p>`}
    </div>`, { label: known ? y.name : '未発見の妖怪' });
  };

  // ============ 予言くだん（行動実験） ============
  VIEWS.yogen = function () {
    const ks = kudanStats();
    const open = S.prophecies.filter(p => p.status === 'open').sort((a, b) => a.checkDate.localeCompare(b.checkDate));
    const done = S.prophecies.filter(p => p.status === 'checked').sort((a, b) => (b.checkedAt || '').localeCompare(a.checkedAt || ''));
    const mood = ks.n === 0 ? 'smug' : ks.pct <= 30 ? 'meek' : ks.pct <= 60 ? 'norm' : 'smug';
    const line = ks.n === 0
      ? '予言しよう……おぬしの不安は、ぜんぶ当たる。……たぶん。'
      : ks.pct <= 30 ? '……' + ks.n + '回のうち、ほとんど外れておる。ワシの予言、あてにならんのう。'
        : ks.pct <= 60 ? '……半分くらいは、外れておるようじゃ。'
          : '……当たることもある。それでも、おぬしは乗り越えてきた。';
    return `<header class="page-head"><h1 class="page-title">予言くだん</h1><p class="page-sub">不安の予言を、答え合わせする演目</p></header>
    <section class="kudan-board" aria-label="くだんの成績">
      <div class="kudan-art">${A.yokai('kudan', mood)}</div>
      <div class="kudan-score">
        <p class="kudan-k">くだんの的中率</p>
        <p class="kudan-pct">${ks.pct == null ? '<span class="dash">—</span>' : ks.pct + '<small>%</small>'}</p>
        <p class="kudan-sub">${ks.n ? '答え合わせ ' + ks.n + '件<br>当たり ' + ks.hits + '・外れ ' + ks.misses + '・少し当たり ' + (ks.n - ks.hits - ks.misses) : 'まだ答え合わせがありません'}</p>
      </div>
      <p class="kudan-line">${esc(line)}</p>
      ${ks.n ? `<div class="sev">
        <p class="sev-k">ひどさ（0〜10）の平均</p>
        <div class="ba-line"><span class="ba-tag">予言</span><span class="ba-track"><i class="ba-fill before" style="width:${ks.avgPred * 10}%"></i></span><span class="ba-v">${ks.avgPred.toFixed(1)}</span></div>
        <div class="ba-line"><span class="ba-tag">実際</span><span class="ba-track"><i class="ba-fill after" style="width:${ks.avgAct * 10}%"></i></span><span class="ba-v">${ks.avgAct.toFixed(1)}</span></div>
      </div>` : ''}
    </section>
    <button class="btn btn-primary btn-block" data-act="yogenNew">新しい予言を記録する</button>
    <section aria-labelledby="yg-open-h">
      <h2 id="yg-open-h" class="sec-title"><span>答え合わせ待ち</span></h2>
      ${open.length ? `<ul class="yg-list">${open.map(ygOpenItem).join('')}</ul>` : '<p class="empty">いまは答え合わせ待ちの予言はありません。不安なことが浮かんだら、予言として書き残しておきましょう。</p>'}
    </section>
    ${done.length ? `<section aria-labelledby="yg-done-h"><h2 id="yg-done-h" class="sec-title"><span>答え合わせ済み</span></h2><ul class="yg-list">${done.map(ygDoneItem).join('')}</ul></section>` : ygSample()}
    <aside class="howto"><p class="howto-k">この演目のねらい</p><p>不安は「未来の予言」です。予言を書き残して、あとで実際どうだったかを確かめると、不安の予言がどれくらい当たるのかが見えてきます。CBTでいう「行動実験」です。</p></aside>`;
  };
  function ygOpenItem(p) {
    const due = p.checkDate <= today();
    return `<li class="yg-item${due ? ' due' : ''}">
      <div class="yg-main"><p class="yg-text">「${esc(p.text)}」</p>
      <p class="yg-meta">確率 ${p.prob}%・ひどさ ${p.severity}/10・${due ? '<strong>答え合わせの日です</strong>' : fmtMD(p.checkDate) + 'に答え合わせ'}</p>
      ${p.plan ? `<p class="yg-plan">確かめ方：${esc(p.plan)}</p>` : ''}</div>
      <div class="yg-actions"><button class="btn btn-small${due ? ' btn-primary' : ''}" data-act="yogenCheck" data-id="${p.id}">答え合わせ</button>
      <button class="link-btn small" data-act="yogenDelete" data-id="${p.id}">消す</button></div>
    </li>`;
  }
  const RESULT_LABEL = { miss: '外れ', partial: '少し当たり', hit: '当たり' };
  function ygDoneItem(p) {
    return `<li class="yg-item done">
      <div class="yg-main"><p class="yg-text">「${esc(p.text)}」</p>
      <p class="yg-meta"><span class="res res-${p.result}">${RESULT_LABEL[p.result]}</span> ひどさ 予言${p.severity} → 実際${p.actualSeverity}</p>
      ${p.outcome ? `<p class="yg-plan">実際：${esc(p.outcome)}</p>` : ''}
      ${p.learned ? `<p class="yg-plan">気づき：${esc(p.learned)}</p>` : ''}</div>
      <div class="yg-actions"><button class="link-btn small" data-act="yogenDelete" data-id="${p.id}">消す</button></div>
    </li>`;
  }
  function ygSample() {
    return `<section aria-label="見本"><h2 class="sec-title"><span>見本</span></h2>
      <ul class="yg-list"><li class="yg-item done sample">
        <div class="yg-main"><p class="yg-text">「明日の発表で言葉につまって、みんなに笑われる」</p>
        <p class="yg-meta"><span class="res res-miss">外れ</span> ひどさ 予言8 → 実際2</p>
        <p class="yg-plan">実際：一度つまったけど、笑った人はいなかった。質問が2つ来た。</p></div>
        <span class="sample-tag">見本</span>
      </li></ul></section>`;
  }
  ACT.yogenNew = () => {
    openSheet(`<form class="form" data-form="yogenNew">
      <h2 class="sheet-title">不安の予言を記録する</h2>
      <p class="muted">ヨゲンくだんがささやく「これから起きること」を、そのまま書いてみましょう。</p>
      <div class="field"><label for="ygText">予言</label>
        <textarea id="ygText" rows="3" maxlength="200" required placeholder="例：明日の発表で言葉につまって、みんなに笑われる"></textarea></div>
      <div class="field"><label for="ygProb">起きる確率（くだんの自信） <output id="ygProbOut">70%</output></label>
        <input type="range" id="ygProb" min="0" max="100" step="5" value="70" data-out="ygProbOut" data-unit="%"></div>
      <div class="field"><label for="ygSev">起きたら、どれくらいひどい？ <output id="ygSevOut">7</output></label>
        <input type="range" id="ygSev" min="0" max="10" step="1" value="7" data-out="ygSevOut">
        <div class="range-scale"><span>0 なんともない</span><span>10 最悪</span></div></div>
      <div class="field"><label for="ygPlan">どうやって確かめる？ <span class="opt">任意</span></label>
        <input type="text" id="ygPlan" maxlength="120" placeholder="例：逃げずに、とりあえず発表してみる" autocomplete="off"></div>
      <div class="field"><label for="ygDate">答え合わせの日</label>
        <input type="date" id="ygDate" value="${addDays(1)}" min="${today()}"></div>
      <button class="btn btn-primary btn-block" type="submit">この予言を封印する</button>
    </form>`, { label: '予言の記録' });
  };
  FORM.yogenNew = f => {
    const text = $('#ygText', f).value.trim();
    if (text.length < 2) { $('#ygText', f).focus(); toast('予言を書いてください'); return; }
    S.prophecies.push({
      id: uid(), created: new Date().toISOString(), text,
      prob: +$('#ygProb', f).value, severity: +$('#ygSev', f).value,
      plan: $('#ygPlan', f).value.trim(), checkDate: $('#ygDate', f).value || addDays(1), status: 'open'
    });
    const checkDate = $('#ygDate', f).value || addDays(1);
    const up = addXP(D.XP.yogenNew);
    save(); closeSheet(); rerender();
    toast('予言を封印しました。' + fmtMD(checkDate) + 'に答え合わせしましょう。' + (up ? ' ' + up + 'に昇進！' : ''));
    if (isRisky(text)) setTimeout(() => openSos(), 400);
  };
  ACT.yogenCheck = el => {
    const p = S.prophecies.find(x => x.id === el.dataset.id);
    if (!p) return;
    openSheet(`<form class="form" data-form="yogenCheck" data-id="${p.id}">
      <h2 class="sheet-title">答え合わせ</h2>
      <blockquote class="boke-quote">「${esc(p.text)}」</blockquote>
      <p class="muted small">予言したとき：確率 ${p.prob}%・ひどさ ${p.severity}/10</p>
      <div class="field"><label for="ygOutcome">実際には、何が起きた？</label>
        <textarea id="ygOutcome" rows="3" maxlength="300" placeholder="例：一度つまったけど、笑った人はいなかった"></textarea></div>
      <fieldset class="field"><legend>くだんの予言は……</legend>
        <div class="seg">
          <label><input type="radio" name="ygRes" value="miss" checked><span>外れた</span></label>
          <label><input type="radio" name="ygRes" value="partial"><span>少し当たった</span></label>
          <label><input type="radio" name="ygRes" value="hit"><span>当たった</span></label>
        </div></fieldset>
      <div class="field"><label for="ygAct">実際のひどさ <output id="ygActOut">3</output></label>
        <input type="range" id="ygAct" min="0" max="10" step="1" value="3" data-out="ygActOut">
        <div class="range-scale"><span>0 なんともない</span><span>10 最悪</span></div></div>
      <div class="field"><label for="ygLearned">気づいたこと <span class="opt">任意</span></label>
        <input type="text" id="ygLearned" maxlength="160" placeholder="例：思ったより、みんな自分のことで精一杯" autocomplete="off"></div>
      <button class="btn btn-primary btn-block" type="submit">答え合わせする</button>
    </form>`, { label: '答え合わせ' });
  };
  FORM.yogenCheck = f => {
    const p = S.prophecies.find(x => x.id === f.dataset.id);
    if (!p) return;
    p.outcome = $('#ygOutcome', f).value.trim();
    p.result = (f.querySelector('input[name="ygRes"]:checked') || { value: 'miss' }).value;
    p.actualSeverity = +$('#ygAct', f).value;
    p.learned = $('#ygLearned', f).value.trim();
    p.status = 'checked'; p.checkedAt = new Date().toISOString();
    const up = addXP(D.XP.yogenCheck);
    save();
    const msg = {
      miss: ['meek', 'ぐぬぬ……また外れた。', '予言は外れました。不安の予言は、こうして外れることのほうが多いのです。この記録が、次に不安になったときの反証になります。'],
      partial: ['norm', '……半分だけ、か。', '少し当たって、少し外れました。ひどさは予言の' + p.severity + 'に対して、実際は' + p.actualSeverity + '。思っていた形とは、どこが違いましたか。'],
      hit: ['norm', '……当たってしもうた。', '当たることもあります。それでも、あなたは今日を乗り切りました。「当たったとき、どう対処できたか」も、大事な記録です。']
    }[p.result];
    sheetBody().innerHTML = `<div class="yg-result">
      <div class="yg-result-art">${A.yokai('kudan', msg[0])}</div>
      <p class="yg-result-say">${esc(msg[1])}</p>
      <p>${esc(msg[2])}</p>
      <p class="xp-gain">経験 +${D.XP.yogenCheck}${up ? `　<strong>${esc(up)}に昇進しました</strong>` : ''}</p>
      <button class="btn btn-primary btn-block" data-act="closeAndRender">閉じる</button>
    </div>`;
    if (p.result === 'miss') Sfx.chime();
  };
  ACT.closeAndRender = () => { closeSheet(); rerender(); };
  ACT.yogenDelete = el => {
    const id = el.dataset.id;
    confirmSheet('この予言を消しますか？ 元には戻せません。', '消す', () => {
      S.prophecies = S.prophecies.filter(p => p.id !== id); save(); rerender(); toast('消しました');
    });
  };

  // ============ 行動おみくじ（行動活性化） ============
  const OM = { energy: 2, drawn: null, busy: false, prevText: null };
  const ENERGY = [
    { v: 1, label: 'ほぼゼロ' }, { v: 2, label: 'ふつう' }, { v: 3, label: 'わりと元気' }
  ];
  function weighted(list) {
    const total = list.reduce((s, x) => s + x.w, 0);
    let r = Math.random() * total;
    for (const x of list) { r -= x.w; if (r <= 0) return x; }
    return list[list.length - 1];
  }
  function drawOmikuji(energy, prevText) {
    const f = weighted(D.FORTUNES);
    let action;
    if (f.id === 'kyo') action = D.KYO_ACTION;
    else {
      let pool = D.ACTIONS.concat(S.myActions.map(a => ({ t: a.t, e: a.e, c: a.c || 'kai', mine: true }))).filter(a => a.e <= energy);
      const near = pool.filter(a => a.e === energy || a.mine);
      if (near.length >= 4 && Math.random() < 0.7) pool = near;
      const fresh2 = pool.filter(a => a.t !== prevText);
      action = pick(fresh2.length ? fresh2 : pool);
    }
    return {
      no: 1 + Math.floor(Math.random() * 99), fortune: f, action,
      lines: { negai: pick(D.OMIKUJI_LINES.negai), machibito: pick(D.OMIKUJI_LINES.machibito), usemono: pick(D.OMIKUJI_LINES.usemono) },
      predicted: 4
    };
  }
  function mkPaper(d, small) {
    const cat = D.CATEGORIES[d.action.c] || D.CATEGORIES.kai;
    return `<div class="mk-paper${small ? ' small' : ''}${d.fortune.id === 'kyo' ? ' kyo' : ''}" aria-label="おみくじ ${esc(d.fortune.label)}">
      <p class="mk-no">第${kanjiNum(d.no)}番</p>
      <p class="mk-fortune">${esc(d.fortune.label)}</p>
      <p class="mk-msg">${esc(d.fortune.msg)}</p>
      <p class="mk-act"><b class="mk-k">行動</b>${esc(d.action.t)}</p>
      ${small ? '' : `<p class="mk-line"><b class="mk-k">願望</b>${esc(d.lines.negai)}</p>
      <p class="mk-line"><b class="mk-k">待人</b>${esc(d.lines.machibito)}</p>
      <p class="mk-line"><b class="mk-k">失物</b>${esc(d.lines.usemono)}</p>`}
    </div>
    <p class="mk-cat"><span class="mk-cat-k">${esc(cat.label)}</span>${esc(cat.desc)}の行動</p>`;
  }
  const canShake = () => typeof window.DeviceMotionEvent !== 'undefined' && !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);

  VIEWS.omikuji = function () {
    const ms = mikujiStats();
    const now = S.mikujiNow;
    let main;
    if (now) {
      main = `<section class="mk-now" aria-label="挑戦中のおみくじ">
        <p class="eyebrow">挑戦中</p>
        ${mkPaper(now, true)}
        <p class="mk-pred">やる前の予想：気分の上がり具合 <strong>${now.predicted}</strong>/10</p>
        <div class="btn-col"><button class="btn btn-primary" data-act="mkDone">やってきた！</button>
        <button class="btn btn-ghost" data-act="mkGiveup">今日はやめておく</button></div>
      </section>`;
    } else if (OM.drawn) {
      const d = OM.drawn;
      main = `<section class="mk-drawn" aria-label="引いたおみくじ">
        ${mkPaper(d, false)}
        <div class="field"><label for="mkPred">やる前の予想：これをやったら、気分はどれくらい上がりそう？ <output id="mkPredOut">${d.predicted}</output></label>
          <input type="range" id="mkPred" min="0" max="10" step="1" value="${d.predicted}" data-out="mkPredOut" data-bind="mkPred">
          <div class="range-scale"><span>0 変わらない</span><span>10 すごく上がる</span></div></div>
        <div class="btn-col"><button class="btn btn-primary" data-act="mkAccept">${d.fortune.id === 'kyo' ? '休む' : 'やってみる'}</button>
        <button class="btn btn-ghost" data-act="mkRedraw">別のを引く</button></div>
        <p class="muted small">何度引き直しても大丈夫。しっくりくるものを選んでください。</p>
      </section>`;
    } else {
      main = `<section class="mk-draw" aria-label="おみくじを引く">
        <fieldset class="field"><legend>いまの元気の残りは？</legend>
          <div class="seg energy">${ENERGY.map(e => `<label><input type="radio" name="mkEnergy" value="${e.v}"${OM.energy === e.v ? ' checked' : ''} data-bind="mkEnergy"><span><i class="bat" data-v="${e.v}" aria-hidden="true"></i>${e.label}</span></label>`).join('')}</div>
        </fieldset>
        <button class="mikuji-box" id="mkBox" data-act="mkDraw" aria-label="おみくじを引く">${A.omikujiBox()}</button>
        <div class="btn-col"><button class="btn btn-primary" data-act="mkDraw">おみくじを引く</button>
        ${canShake() ? '<button class="btn btn-ghost" data-act="mkShake">スマホを振って引く</button>' : ''}</div>
      </section>`;
    }
    return `<header class="page-head"><h1 class="page-title">行動おみくじ</h1><p class="page-sub">元気が出るのを待たずに、小さな一手を</p></header>
    ${main}
    <section class="mk-stats" aria-label="これまでのおみくじ">
      <h2 class="sec-title"><span>予想と実際</span></h2>
      ${ms.n ? `<dl class="tally">
        <div><dt>やってみた</dt><dd>${ms.n}<small>回</small></dd></div>
        <div><dt>思ったより良かった</dt><dd>${ms.better}<small>回</small></dd></div>
        <div><dt>予想との差（平均）</dt><dd>${ms.gain >= 0 ? '+' : '−'}${Math.abs(ms.gain).toFixed(1)}</dd></div>
      </dl><p class="muted small">気分が落ちているとき、人は「やったら楽しいか」を低く見積もりがちです。予想と実際の差が、その証拠になります。</p>`
      : '<p class="empty">まだ記録がありません。やる前に予想して、やった後に実際を記録すると、ここに差が出ます。</p>'}
    </section>
    <details class="my-actions"><summary>マイみくじ（自分で足した行動 ${S.myActions.length}）</summary>
      <form class="form inline-form" data-form="myAction">
        <div class="field"><label for="myActText">行動</label><input type="text" id="myActText" maxlength="60" placeholder="例：好きな入浴剤を入れる" autocomplete="off"></div>
        <div class="field"><label for="myActEnergy">必要な元気</label><select id="myActEnergy">${ENERGY.map(e => `<option value="${e.v}">${e.label}</option>`).join('')}</select></div>
        <button class="btn btn-small btn-primary" type="submit">足す</button>
      </form>
      ${S.myActions.length ? `<ul class="my-list">${S.myActions.map((a, i) => `<li><span>${esc(a.t)}</span><span class="muted small">${ENERGY[a.e - 1].label}</span><button class="link-btn small" data-act="myActDel" data-i="${i}">消す</button></li>`).join('')}</ul>` : ''}
    </details>`;
  };
  BIND.mkEnergy = el => { OM.energy = +el.value; };
  BIND.mkPred = el => { if (OM.drawn) OM.drawn.predicted = +el.value; };
  ACT.mkDraw = async () => {
    if (OM.busy) return;
    OM.busy = true;
    const box = $('#mkBox');
    const fast = reduceMotion();
    if (box) box.classList.add('shaking');
    Sfx.rattle(); buzz([20, 40, 20, 40, 20]);
    await sleep(fast ? 50 : 900);
    if (box) { box.classList.remove('shaking'); box.classList.add('drawn'); }
    Sfx.pop();
    await sleep(fast ? 50 : 450);
    OM.drawn = drawOmikuji(OM.energy, OM.drawn ? OM.drawn.action.t : OM.prevText);
    OM.prevText = null;
    OM.busy = false;
    if (current === 'omikuji') rerender();
    if (OM.drawn.fortune.id === 'daikichi') Sfx.chime();
  };
  ACT.mkRedraw = () => { OM.prevText = OM.drawn ? OM.drawn.action.t : null; OM.drawn = null; rerender(); setTimeout(() => ACT.mkDraw(), 60); };
  ACT.mkShake = async () => {
    try {
      if (typeof DeviceMotionEvent.requestPermission === 'function') {
        const r = await DeviceMotionEvent.requestPermission();
        if (r !== 'granted') throw new Error('denied');
      }
    } catch (e) { toast('振る機能が使えないので、タップで引いてください'); return; }
    toast('スマホを振ってください');
    let hits = 0, last = 0, got = false;
    const h = ev => {
      const a = ev.accelerationIncludingGravity || ev.acceleration;
      if (!a) return;
      got = true;
      const mag = Math.abs(a.x || 0) + Math.abs(a.y || 0) + Math.abs(a.z || 0);
      const t = Date.now();
      if (mag > 32 && t - last > 140) {
        last = t; hits += 1;
        const box = $('#mkBox');
        if (box) { box.classList.remove('jolt'); void box.offsetWidth; box.classList.add('jolt'); }
        Sfx.rattle();
        if (hits >= 3) { window.removeEventListener('devicemotion', h); ACT.mkDraw(); }
      }
    };
    window.addEventListener('devicemotion', h);
    setTimeout(() => {
      window.removeEventListener('devicemotion', h);
      if (!got) toast('振っても反応しないときは、タップで引いてください');
    }, 8000);
  };
  ACT.mkAccept = () => {
    const d = OM.drawn; if (!d) return;
    S.mikujiNow = Object.assign({ id: uid(), drawnAt: new Date().toISOString() }, d);
    OM.drawn = null; save(); rerender();
    toast(d.fortune.id === 'kyo' ? 'いってらっしゃい。ゆっくり休んでください。' : 'いってらっしゃい。終わったら記録しに来てください。');
  };
  ACT.mkGiveup = () => {
    S.mikujiNow = null; save(); rerender();
    toast('やめるのも、ひとつの選択です。また引きに来てください。');
  };
  ACT.mkDone = () => {
    const n = S.mikujiNow; if (!n) return;
    openSheet(`<form class="form" data-form="mkDone">
      <h2 class="sheet-title">おかえりなさい</h2>
      <p>「${esc(n.action.t)}」をやってきました。</p>
      <div class="field"><label for="mkAct">実際、気分はどれくらい上がった？ <output id="mkActOut">${n.predicted}</output></label>
        <input type="range" id="mkAct" min="0" max="10" step="1" value="${n.predicted}" data-out="mkActOut">
        <div class="range-scale"><span>0 変わらない</span><span>10 すごく上がった</span></div>
        <p class="was">やる前の予想は ${n.predicted}</p></div>
      <button class="btn btn-primary btn-block" type="submit">記録する</button>
    </form>`, { label: 'おみくじの記録' });
  };
  FORM.mkDone = f => {
    const n = S.mikujiNow; if (!n) return;
    const actual = +$('#mkAct', f).value;
    S.omikuji.unshift({ id: n.id, date: new Date().toISOString(), text: n.action.t, cat: n.action.c, fortune: n.fortune.id, predicted: n.predicted, actual, done: true });
    S.mikujiNow = null;
    const up = addXP(D.XP.omikujiDone);
    save();
    const d = actual - n.predicted;
    sheetBody().innerHTML = `<div class="yg-result">
      <p class="mk-result-num">${n.predicted}<span>→</span>${actual}</p>
      <p class="yg-result-say">${d > 0 ? '思ったより +' + d + '！' : d === 0 ? '予想どおり。' : '予想ほどではなかった日。'}</p>
      <p>${d > 0 ? '動いてみたら、予想より気分が上がりました。気分は、行動のあとからついてくることがあります。' : d === 0 ? '予想どおりに動けたこと自体が、ひとつの達成です。' : '予想ほどではなくても、動いたこと自体が一歩です。今日はそれで十分。'}</p>
      <p class="xp-gain">経験 +${D.XP.omikujiDone}${up ? `　<strong>${esc(up)}に昇進しました</strong>` : ''}</p>
      <button class="btn btn-primary btn-block" data-act="closeAndRender">閉じる</button>
    </div>`;
    if (d > 0) Sfx.chime();
  };
  FORM.myAction = f => {
    const t = $('#myActText', f).value.trim();
    if (!t) { $('#myActText', f).focus(); return; }
    S.myActions.push({ t, e: +$('#myActEnergy', f).value, c: 'kai' });
    save(); rerender();
    const d = $('.my-actions'); if (d) d.open = true;
    toast('マイみくじに足しました');
  };
  ACT.myActDel = el => {
    S.myActions.splice(+el.dataset.i, 1); save(); rerender();
    const d = $('.my-actions'); if (d) d.open = true;
  };

  // ============ ネタ帳 ============
  function netaTabs(active) {
    return `<nav class="seg-tabs" aria-label="ネタ帳の切りかえ">
      <a href="#neta" class="${active === 'mine' ? 'on' : ''}"${active === 'mine' ? ' aria-current="page"' : ''}>自分のネタ</a>
      <a href="#mochineta" class="${active === 'lib' ? 'on' : ''}"${active === 'lib' ? ' aria-current="page"' : ''}>持ちネタ集 <small>${NT.LIST.length}</small></a>
    </nav>`;
  }
  function weekJournal() {
    const since = Date.now() - 7 * 864e5;
    const inWeek = iso => iso && new Date(iso).getTime() >= since;
    const g = S.nagame || {};
    const sc = S.scripts.filter(s => inWeek(s.date));
    const rows = [
      ['妖怪漫才を上演', sc.length, '回'],
      ['ながめ席で眺めた', (g.sessions || []).filter(s => inWeek(s.date)).length, '回'],
      ['「はっ」と気づいた', (g.kizuki || []).filter(inWeek).length, '回'],
      ['心配を下足番に預けた', (g.geso || []).filter(x => inWeek(x.created)).length, '枚'],
      ['予言を答え合わせした', S.prophecies.filter(p => inWeek(p.checkedAt)).length, '件'],
      ['行動おみくじをやってみた', S.omikuji.filter(o => inWeek(o.date)).length, '回'],
      ['持ちネタを観た', Object.values(S.netaSeen || {}).filter(inWeek).length, '本']
    ].filter(r => r[1] > 0);
    const ys = {};
    sc.forEach(s => s.yokai.forEach(id => { ys[id] = (ys[id] || 0) + 1; }));
    const topY = Object.entries(ys).sort((a, b) => b[1] - a[1])[0];
    return `<section class="journal" aria-labelledby="journal-h">
      <h2 id="journal-h" class="journal-k">楽屋日誌 ― この7日間</h2>
      ${rows.length ? `<ul class="journal-list">${rows.map(r => `<li><span>${r[0]}</span><b>${r[1]}<small>${r[2]}</small></b></li>`).join('')}</ul>
        ${topY ? `<p class="journal-note">この7日間によく出た妖怪は「${esc(D.yokaiById[topY[0]].name)}」でした。</p>` : ''}`
        : '<p class="journal-note">この7日間は、お休みでした。休むのも、大事な演目です。</p>'}
    </section>`;
  }
  function beliefSummary() {
    const counts = {};
    S.scripts.forEach(s => { if (s.belief && NT.beliefById[s.belief]) counts[s.belief] = (counts[s.belief] || 0) + 1; });
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    if (!total) return '';
    const max = Math.max.apply(null, Object.values(counts));
    return `<section class="belief-sum" aria-labelledby="belief-h">
      <p id="belief-h" class="neta-top-k">ボケの奥にあるもの</p>
      <div class="belief-bars">${NT.BELIEFS.map(b => { const c = counts[b.id] || 0; return `<div class="ba-line"><span class="ba-tag">${esc(b.label)}</span><span class="ba-track"><i class="ba-fill after" style="width:${c / max * 100}%"></i></span><span class="ba-v">${c}</span></div>`; }).join('')}</div>
      <p class="muted small">いちばん多いものが、あなたの「思いこみのクセ」の入口かもしれません。クセに気づけば、妖怪のボケにも早く気づけます。</p>
    </section>`;
  }

  VIEWS.neta = function () {
    const list = S.scripts;
    const n = list.length;
    const avg = n ? Math.round(list.reduce((s, x) => s + (x.beliefBefore - x.beliefAfter), 0) / n) : 0;
    const freq = {};
    list.forEach(s => s.yokai.forEach(id => { freq[id] = (freq[id] || 0) + 1; }));
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 3);
    return `${netaTabs('mine')}
    <header class="page-head"><h1 class="page-title">ネタ帳</h1><p class="page-sub">つらかったことが、あなたのネタになる</p></header>
    ${weekJournal()}
    ${n ? `<section class="neta-sum" aria-label="ネタ帳のまとめ">
      <dl class="tally">
        <div><dt>上演</dt><dd>${n}<small>回</small></dd></div>
        <div><dt>信じ度の変化（平均）</dt><dd>${avg > 0 ? '−' : avg < 0 ? '+' : '±'}${Math.abs(avg)}<small>pt</small></dd></div>
      </dl>
      ${top.length ? `<p class="neta-top-k">よく出る妖怪</p><ul class="neta-top">${top.map(([id, c]) => `<li>${A.yokai(id, 'norm')}<span>${esc(D.yokaiById[id].name)}</span><b>${c}回</b></li>`).join('')}</ul>
      <p class="muted small">同じ妖怪がよく出るのは、あなたの考え方のクセ。気づけたら、それだけでツッコミやすくなります。</p>` : ''}
    </section>
    ${beliefSummary()}` : `<p class="empty">まだネタがありません。番組の「妖怪漫才」から、最初のネタを作ってみましょう。見本がほしいときは<a href="#mochineta">持ちネタ集（${NT.LIST.length}本）</a>へ。</p>`}
    <ul class="neta-list">
      ${list.map(s => netaItem(s)).join('')}
      ${netaItem(D.SAMPLE)}
    </ul>`;
  };
  function netaItem(s) {
    const y = D.yokaiById[s.yokai[0]];
    return `<li><button class="neta-item" data-act="netaOpen" data-id="${s.id}">
      <span class="neta-art">${A.yokai(y.id, 'norm')}</span>
      <span class="neta-main"><span class="neta-date">${s.sample ? '見本' : fmtMD(s.date)}・${esc(y.name)}</span>
      <span class="neta-thought">「${esc(s.thought)}」</span></span>
      <span class="neta-ba">${s.beliefBefore}<i>→</i>${s.beliefAfter}<small>%</small></span>
    </button></li>`;
  }
  ACT.netaOpen = el => {
    const s = el.dataset.id === 'sample' ? D.SAMPLE : S.scripts.find(x => x.id === el.dataset.id);
    if (!s) return;
    const emo = D.emotionById[s.emotion] || { label: '気分' };
    const yn = s.yokai.map(id => D.yokaiById[id].name).join('・');
    openSheet(`<div class="daihon">
      <p class="eyebrow">${s.sample ? '見本の台本' : fmtMD(s.date) + 'の台本'}</p>
      <h2 class="sheet-title">${esc(S.profile.name || 'ココロ亭')}・${esc(yn)}</h2>
      ${s.situation ? `<p class="daihon-sit">状況：${esc(s.situation)}</p>` : ''}
      <dl class="daihon-lines">
        <dt>${esc(D.yokaiById[s.yokai[0]].name)}（ボケ）</dt><dd>「${esc(s.thought)}」</dd>
        ${s.tk.map(t => { const T = D.tsukkomiById[t.id]; return T ? `<dt class="tk">${esc(tkLine(T, s.gentle))}</dt><dd>${nl2br(t.a)}</dd>` : ''; }).join('')}
        <dt class="final">言い直し</dt><dd class="final">${nl2br(s.newThought)}</dd>
      </dl>
      <section class="ba" aria-label="上演の前と後">
        ${baRow('セリフの信じ度', s.beliefBefore, s.beliefAfter, '%')}
        ${baRow('「' + emo.label + '」の強さ', s.emoBefore, s.emoAfter, '')}
      </section>
      ${s.replays ? `<p class="muted small">再演 ${s.replays}回</p>` : ''}
      <div class="btn-row">${s.sample ? '' : `<button class="btn btn-ghost danger-text" data-act="netaDelete" data-id="${s.id}">消す</button>`}
      <button class="btn btn-primary" data-act="${s.sample ? 'playSample' : 'replay'}" data-id="${s.id}">もう一度上演</button></div>
    </div>`, { label: '台本' });
  };
  ACT.netaDelete = el => {
    const id = el.dataset.id;
    confirmSheet('このネタを消しますか？ 元には戻せません。', '消す', () => {
      S.scripts = S.scripts.filter(s => s.id !== id); save(); closeAllSheets(); rerender(); toast('消しました');
    });
  };

  // ============ 持ちネタ集（96本） ============
  const YSHORT = { nurikabe: 'ぬりかべ', itsumo: 'イツモ入道', hitotsume: '一つ目小僧', magure: 'マグレ狐', satori: 'サトリ', kudan: 'くだん', namazu: 'ナマズ', kagami: 'キブン鏡', bekibouzu: 'ベキ坊主', karakasa: '唐傘', obariyon: 'おばりよん', noppera: 'のっぺら' };
  const LF = { d: 'all', y: 'all', b: 'all', limit: 24 };
  const seenOf = id => !!(S.netaSeen && S.netaSeen[id]);
  function markSeen(id) { if (!S.netaSeen) S.netaSeen = {}; S.netaSeen[id] = new Date().toISOString(); save(); }

  VIEWS.mochineta = function () {
    const seenN = NT.LIST.filter(n => seenOf(n.id)).length;
    const list = NT.LIST.filter(n => (LF.d === 'all' || n.d === LF.d) && (LF.y === 'all' || n.y === LF.y) && (LF.b === 'all' || n.b === LF.b));
    const ys = DISTORTIONS;
    return `${netaTabs('lib')}
    <header class="page-head"><h1 class="page-title">持ちネタ集</h1><p class="page-sub">見本の漫才 ${NT.LIST.length}本。観るだけでも、ツッコミの型が身につきます。</p></header>
    <section class="lib-progress" aria-label="観たネタ">
      <p>観たネタ <strong>${seenN}</strong> / ${NT.LIST.length}</p>
      <div class="meter" role="progressbar" aria-valuenow="${seenN}" aria-valuemin="0" aria-valuemax="${NT.LIST.length}" aria-label="観たネタの数"><i style="width:${seenN / NT.LIST.length * 100}%"></i></div>
    </section>
    <details class="neta-table-wrap" open>
      <summary>ネタ表（妖怪 × 場面）</summary>
      <div class="table-scroll">
        <table class="neta-table">
          <thead><tr><th scope="col"><span class="sr-only">妖怪</span></th>${NT.DOMAINS.map(d => `<th scope="col">${esc(d.short)}</th>`).join('')}</tr></thead>
          <tbody>${ys.map(y => `<tr><th scope="row">${esc(YSHORT[y.id] || y.name)}</th>${NT.DOMAINS.map(d => {
            const id = y.id + '-' + d.id;
            return `<td><button class="cell${seenOf(id) ? ' seen' : ''}" data-act="libOpen" data-id="${id}" aria-label="${esc(y.name)}・${esc(d.label)}${seenOf(id) ? '（観た）' : ''}"></button></td>`;
          }).join('')}</tr>`).join('')}</tbody>
        </table>
      </div>
      <p class="muted small">縦は認知の歪み（妖怪）、横は生活の場面。塗りつぶしは観たネタです。マスをタップすると開きます。</p>
    </details>
    <section class="lib-filter" aria-label="絞りこみ">
      <div class="chips chips-scroll" role="group" aria-label="場面">${[{ id: 'all', short: 'すべて' }].concat(NT.DOMAINS).map(d =>
        `<button class="chip chip-sm${LF.d === d.id ? ' on' : ''}" aria-pressed="${LF.d === d.id}" data-act="libD" data-id="${d.id}">${esc(d.short)}</button>`).join('')}</div>
      <div class="lib-selects">
        <label class="field"><span>妖怪</span><select id="libY" data-bind="libY"><option value="all">すべて</option>${ys.map(y => `<option value="${y.id}"${LF.y === y.id ? ' selected' : ''}>${esc(y.name)}（${esc(y.distortion)}）</option>`).join('')}</select></label>
        <label class="field"><span>奥にある思い</span><select id="libB" data-bind="libB"><option value="all">すべて</option>${NT.BELIEFS.map(b => `<option value="${b.id}"${LF.b === b.id ? ' selected' : ''}>${esc(b.label)}</option>`).join('')}</select></label>
      </div>
    </section>
    <p class="lib-count">${list.length}本${list.length > LF.limit ? `のうち ${LF.limit}本を表示` : ''}</p>
    <ul class="lib-list">${list.slice(0, LF.limit).map(libItem).join('')}</ul>
    ${list.length > LF.limit ? `<button class="btn btn-ghost lib-more" data-act="libMore">もっと見る（残り ${list.length - LF.limit}本）</button>` : ''}
    <aside class="howto"><p class="howto-k">分類のしかた</p>
      <p>縦軸は認知の歪み12種（Burnsの認知の歪みリストに「比較」を加えたもの）。横軸は生活の8つの場面。それぞれのネタに、考えの奥にある思い（ジュディス・ベックの中核信念の3分類：無力・愛されない・価値がない）を、やわらかい言葉でタグづけしています。</p>
      <p class="muted small" style="margin-top:6px">見本は「型」を覚えるためのもの。自分の漫才では、ツッコミと言い直しを自分の言葉で書いてみてください。</p>
    </aside>`;
  };
  function libItem(n) {
    const y = D.yokaiById[n.y];
    const seen = seenOf(n.id);
    return `<li><button class="lib-item${seen ? ' seen' : ''}" data-act="libOpen" data-id="${n.id}">
      <span class="lib-art">${A.yokai(n.y, 'norm')}</span>
      <span class="lib-main"><span class="lib-thought">「${esc(n.thought)}」</span>
        <span class="lib-tags"><span>${esc(y.name)}</span><span>${esc(NT.domainById[n.d].short)}</span><span>${esc(NT.beliefById[n.b].label)}</span></span></span>
      ${seen ? '<span class="lib-seen">観た</span>' : ''}
    </button></li>`;
  }
  function libSheet(n) {
    const y = D.yokaiById[n.y];
    const dm = NT.domainById[n.d], bl = NT.beliefById[n.b];
    const i = NT.LIST.indexOf(n);
    const prev = NT.LIST[(i - 1 + NT.LIST.length) % NT.LIST.length], next = NT.LIST[(i + 1) % NT.LIST.length];
    return `<div class="daihon lib-sheet">
      <p class="eyebrow">持ちネタ 其の${i + 1 < 100 ? kanjiNum(i + 1) : i + 1}</p>
      <div class="lib-head">${A.yokai(n.y, 'smug')}<h2 class="sheet-title">「${esc(n.thought)}」</h2></div>
      <p class="lib-meta"><span class="tag">${esc(y.name)}（${esc(y.distortion)}）</span><span class="tag">${esc(dm.label)}</span><span class="tag">${esc(bl.label)}（${esc(bl.theory)}）</span></p>
      <dl class="daihon-lines">
        <dt>${esc(y.name)}（ボケ）</dt><dd>${esc(y.pre)}「${esc(n.thought)}」${esc(y.post)}</dd>
        ${n.tk.map(t => { const T = D.tsukkomiById[t.id]; return `<dt class="tk">${esc(tkLine(T))}</dt><dd>${esc(t.a)}</dd>`; }).join('')}
        <dt class="final">言い直し</dt><dd class="final">${esc(n.re)}</dd>
      </dl>
      <p class="telop-note">${esc(D.END_TELOP.main)}<br>${esc(D.END_TELOP.care)}</p>
      <div class="btn-col">
        <button class="btn btn-primary" data-act="libPlay" data-id="${n.id}">上演を観る</button>
        <button class="btn btn-ghost" data-act="libMine" data-id="${n.id}">このボケで、自分の漫才を作る</button>
      </div>
      <p class="muted small">「自分の漫才を作る」では、ボケだけが入った状態で始まります。ツッコミと言い直しは、あなたの言葉で。</p>
      <div class="lib-nav"><button class="link-btn" data-act="libOpen" data-id="${prev.id}">← 前のネタ</button><button class="link-btn" data-act="libOpen" data-id="${next.id}">次のネタ →</button></div>
    </div>`;
  }
  ACT.libOpen = el => {
    const n = NT.byId[el.dataset.id];
    if (!n) return;
    markSeen(n.id);
    const body = sheetBody();
    if (body && $('.lib-sheet', body)) { body.innerHTML = libSheet(n); body.closest('.sheet').scrollTop = 0; }
    else openSheet(libSheet(n), { label: '持ちネタ', onClose: () => setTimeout(() => { if (current === 'mochineta' && !sheets.length && !overlayOpen()) rerender(); }, 0) });
  };
  function libScript(n) {
    return { id: 'lib-' + n.id, sample: true, emotion: 'fuan', emoBefore: 70, emoAfter: 40, situation: '', thought: n.thought,
      beliefBefore: 80, beliefAfter: 40, yokai: [n.y], tk: n.tk, newThought: n.re, gentle: false };
  }
  ACT.libPlay = el => { const n = NT.byId[el.dataset.id]; if (!n) return; markSeen(n.id); startPerformance(libScript(n), {}); };
  ACT.libMine = el => { const n = NT.byId[el.dataset.id]; if (!n) return; closeAllSheets(); startManzaiWith(n.thought, n.id); };
  ACT.libD = el => { LF.d = el.dataset.id; LF.limit = 24; rerender(); };
  ACT.libMore = () => { LF.limit += 24; rerender(); };
  BIND.libY = el => { LF.y = el.value; LF.limit = 24; rerender(); };
  BIND.libB = el => { LF.b = el.value; LF.limit = 24; rerender(); };

  // 漫才のボケ入力から、持ちネタ集を探す
  let PK = 'all';
  function pickerHtml() {
    const list = NT.LIST.filter(n => PK === 'all' || n.d === PK);
    return `<div class="picker">
      <h2 class="sheet-title">持ちネタ集から探す</h2>
      <p class="muted small">自分に近いボケを選ぶと、入力欄に入ります。あとから自分の言葉に書きかえてOK。</p>
      <div class="chips chips-scroll" role="group" aria-label="場面">${[{ id: 'all', short: 'すべて' }].concat(NT.DOMAINS).map(d =>
        `<button class="chip chip-sm${PK === d.id ? ' on' : ''}" aria-pressed="${PK === d.id}" data-act="pickD" data-id="${d.id}">${esc(d.short)}</button>`).join('')}</div>
      <ul class="pick-list">${list.map(n => `<li><button class="pick-item" data-act="pickUse" data-id="${n.id}"><span>「${esc(n.thought)}」</span><small>${esc(D.yokaiById[n.y].name)}・${esc(NT.domainById[n.d].short)}</small></button></li>`).join('')}</ul>
    </div>`;
  }
  ACT.pickNeta = () => openSheet(pickerHtml(), { label: '持ちネタ集から探す' });
  ACT.pickD = el => { PK = el.dataset.id; const b = sheetBody(); if (b) b.innerHTML = pickerHtml(); };
  ACT.pickUse = el => {
    const n = NT.byId[el.dataset.id]; if (!n) return;
    const m = mz(); m.thought = n.thought; m.fromNeta = n.id; saveDraft();
    closeSheet();
    const ta = $('#thought'); if (ta) { ta.value = n.thought; setNext(true); }
    toast('ボケを入れました。自分の言葉に書きかえてもOKです');
  };

  // ============ 楽屋（設定） ============
  VIEWS.gakuya = function () {
    const st = styleOf();
    return `<header class="page-head"><h1 class="page-title">楽屋</h1><p class="page-sub">設定と、このアプリについて</p></header>
    <section class="panel" aria-labelledby="g-name-h">
      <h2 id="g-name-h" class="panel-title">芸名</h2>
      <div class="field"><label for="gName" class="sr-only">芸名</label><input type="text" id="gName" maxlength="16" value="${esc(S.profile.name)}" data-bind="name" autocomplete="off"></div>
    </section>
    <section class="panel" aria-labelledby="g-style-h">
      <h2 id="g-style-h" class="panel-title">ツッコミの口調</h2>
      <div class="seg style-seg">
        <label><input type="radio" name="gStyle" value="yasashi"${st === 'yasashi' ? ' checked' : ''} data-bind="style"><span><b>やさしめ</b><small>「その証拠、ある？」</small></span></label>
        <label><input type="radio" name="gStyle" value="kansai"${st === 'kansai' ? ' checked' : ''} data-bind="style"><span><b>キレキレ関西</b><small>「証拠あるんかい！」</small></span></label>
      </div>
      <p class="muted small">ツッコむ相手は、いつも「考え」です。あなた自身には向けません。</p>
    </section>
    <section class="panel" aria-labelledby="g-sound-h">
      <h2 id="g-sound-h" class="panel-title">音と声</h2>
      <label class="toggle"><input type="checkbox" id="gSound"${S.profile.sound ? ' checked' : ''} data-bind="sound"><span class="toggle-ui" aria-hidden="true"></span><span>効果音と振動（拍子木・ハリセン・拍手）</span></label>
      <label class="toggle"><input type="checkbox" id="gVoice"${S.profile.voice ? ' checked' : ''}${Voice.can() ? '' : ' disabled'} data-bind="voice"><span class="toggle-ui" aria-hidden="true"></span><span>上演の読み上げ${Voice.can() ? '' : '（この端末では使えません）'}</span></label>
      <label class="toggle"><input type="checkbox" id="gAuto"${S.profile.autoPlay ? ' checked' : ''} data-bind="autoPlay"><span class="toggle-ui" aria-hidden="true"></span><span>上演をオートで進める（舞台の「オート」でも切りかえられます）</span></label>
    </section>
    <section class="panel" aria-labelledby="g-font-h">
      <h2 id="g-font-h" class="panel-title">文字の大きさ</h2>
      <div class="seg">
        <label><input type="radio" name="gFont" value="normal"${S.profile.fontSize !== 'large' ? ' checked' : ''} data-bind="fontSize"><span>ふつう</span></label>
        <label><input type="radio" name="gFont" value="large"${S.profile.fontSize === 'large' ? ' checked' : ''} data-bind="fontSize"><span style="font-size:1.15em">大きめ</span></label>
      </div>
    </section>
    <section class="panel" aria-labelledby="g-data-h">
      <h2 id="g-data-h" class="panel-title">記録</h2>
      <p>記録はすべて、この端末のブラウザの中だけに保存されます。どこにも送信されません。</p>
      <div class="btn-col">
        ${window.KY_PWA ? '<button class="btn btn-ghost" data-act="saveFile">記録をファイルで保存</button>' : ''}
        <button class="btn btn-ghost" data-act="exportData">記録を書き出す（コピー）</button>
        <button class="btn btn-ghost" data-act="importData">記録を読み込む</button>
        <button class="btn btn-ghost danger-text" data-act="wipeData">すべての記録を消す</button>
      </div>
    </section>
    <section class="panel about" aria-labelledby="g-about-h">
      <h2 id="g-about-h" class="panel-title">ココロ寄席について</h2>
      <p>ココロ寄席は、認知行動療法（CBT）の技法を「寄席の演目」に仕立てたセルフケアの道具です。臨床心理士、精神科医、ゲームデザイナー、漫才作家、民俗学者、神経科学者、行動経済学者、即興演劇の演出家、UXデザイナー、当事者のピアサポーター、マインドフルネス講師、睡眠専門医、プロダクトデザイナー、落語家、ユーモア研究者、スキーマ療法家、放送作家の視点で、3回の設計会議を重ねてつくりました。</p>
      <p class="fiction-note">出来事とあなたのつらさは本物。でも、頭の中のセリフには、いつも脚色が入っています。※この考えはフィクションです。</p>
      <h3>演目とCBTの対応</h3>
      <dl class="map">
        <div><dt>妖怪漫才</dt><dd>思考記録表（コラム法）、認知再構成法、ソクラテス式質問、脱フュージョン</dd></div>
        <div><dt>持ちネタ集</dt><dd>認知の歪み12 × 生活の場面8 の見本96本。中核信念（無力・愛されない・価値がない）のタグつき</dd></div>
        <div><dt>ながめ席</dt><dd>マインドフルネス、ACTの脱フュージョン、メタ認知療法（心配の先送り・注意の訓練）、体の感覚への注意</dd></div>
        <div><dt>妖怪図鑑</dt><dd>認知の歪みの心理教育、問題の外在化</dd></div>
        <div><dt>予言くだん</dt><dd>行動実験、予測の検証</dd></div>
        <div><dt>行動おみくじ</dt><dd>行動活性化、楽しさ予測の検証</dd></div>
        <div><dt>仲入り</dt><dd>呼吸法、5-4-3-2-1グラウンディング、相談先</dd></div>
      </dl>
      <h3>設計の約束</h3>
      <ul class="promises">
        <li>笑うのは考え。あなたではありません。</li>
        <li>妖怪は退治しません。手なずけます。</li>
        <li>連続記録はつくりません。間があいても「おかえり」です。</li>
        <li>おみくじは何度でも引き直せます。課金はありません。</li>
        <li>しんどい言葉に気づいたら、笑いを止めます。</li>
        <li>考えを止めることは目標にしません。気づけたら、それで一本です。</li>
      </ul>
      <p class="muted small">ながめ席は、マインドフルネスやメタ認知療法に加えて、エックハルト・トールやネドじゅんが紹介している「考えと自分を同一視しない」「頭のおしゃべりから、いまの体の感覚に戻る」という考え方を参考にしています。特別な体験や不安が消えることは約束しません。やってみて、どう感じたかを確かめてください。</p>
      <p class="disclaimer">ココロ寄席は医療の代わりではありません。つらさが2週間以上続くとき、日常生活がままならないときは、医療機関や相談窓口を頼ってください。</p>
    </section>`;
  };
  BIND.name = el => { S.profile.name = el.value.slice(0, 16) || 'ココロ亭'; save(); };
  BIND.style = el => { S.profile.style = el.value; save(); toast(el.value === 'kansai' ? 'キレキレ関西にしました' : 'やさしめにしました'); };
  BIND.sound = el => { S.profile.sound = el.checked; save(); if (el.checked) Sfx.pop(); };
  BIND.voice = el => { S.profile.voice = el.checked; save(); if (el.checked) Voice.speak('声で上演します', {}); };
  BIND.autoPlay = el => { S.profile.autoPlay = el.checked; save(); };
  BIND.fontSize = el => { S.profile.fontSize = el.value; save(); applyFont(); };
  function applyFont() { document.documentElement.classList.toggle('fs-large', S.profile.fontSize === 'large'); }

  ACT.saveFile = () => {
    try {
      const blob = new Blob([JSON.stringify(Object.assign({}, S, { draft: null }), null, 1)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'kokoro-yose-' + today() + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast('保存を始めました。保存されない環境では「コピー」を使ってください');
    } catch (e) { toast('この環境ではファイルを保存できません。「コピー」を使ってください'); }
  };

  ACT.exportData = () => {
    const json = JSON.stringify(Object.assign({}, S, { draft: null }), null, 1);
    openSheet(`<div class="form"><h2 class="sheet-title">記録を書き出す</h2>
      <p class="muted small">下の文字をコピーして、メモアプリなどに保存してください。「読み込む」で元に戻せます。</p>
      <textarea id="exportBox" rows="8" readonly>${esc(json)}</textarea>
      <button class="btn btn-primary btn-block" data-act="copyExport">コピーする</button></div>`, { label: '書き出し' });
  };
  ACT.copyExport = () => copyText($('#exportBox').value, $('#exportBox'));
  ACT.importData = () => {
    openSheet(`<form class="form" data-form="importData"><h2 class="sheet-title">記録を読み込む</h2>
      <p class="muted small">保存したファイルを選ぶか、書き出した文字を貼りつけてください。いまの記録は置き換わります。</p>
      <label class="file-pick"><span>ファイルを選ぶ</span><input type="file" id="importFile" accept="application/json,.json" data-bind="importFile"></label>
      <label for="importBox" class="sr-only">記録</label><textarea id="importBox" rows="8" placeholder='{"v":1, ...}'></textarea>
      <button class="btn btn-primary btn-block" type="submit">読み込む</button></form>`, { label: '読み込み' });
  };
  FORM.importData = f => {
    let p;
    try { p = JSON.parse($('#importBox', f).value); } catch (e) { toast('読み込めませんでした。書き出した文字をそのまま貼りつけてください。'); return; }
    if (!p || !Array.isArray(p.scripts) || !p.profile) { toast('ココロ寄席の記録ではないようです'); return; }
    confirmSheet('いまの記録を、貼りつけた記録で置き換えます。よろしいですか？', '置き換える', () => {
      S = Object.assign(fresh(), p); S.profile = Object.assign(fresh().profile, p.profile); S.nagame = Object.assign(fresh().nagame, p.nagame || {}); S.draft = null; MZ = null;
      save(); applyFont(); closeAllSheets(); rerender(); toast('読み込みました');
    });
  };
  BIND.importFile = el => {
    const f = el.files && el.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { const box = $('#importBox'); if (box) box.value = String(r.result || ''); toast('ファイルを読みこみました。「読み込む」を押してください'); };
    r.onerror = () => toast('ファイルを読めませんでした');
    r.readAsText(f);
  };
  ACT.wipeData = () => {
    confirmSheet('すべての記録（ネタ帳・予言・おみくじ・図鑑・経験）を消します。元には戻せません。', 'すべて消す', () => {
      const keep = { name: S.profile.name, style: S.profile.style, sound: S.profile.sound, voice: S.profile.voice, autoPlay: S.profile.autoPlay, fontSize: S.profile.fontSize };
      S = fresh(); Object.assign(S.profile, keep, { seenIntro: true, lastVisit: new Date().toISOString() });
      MZ = null; RESULT = null; OM.drawn = null;
      save(); rerender(); toast('すべての記録を消しました');
    });
  };

  function copyText(text, el) {
    const fallback = () => { if (el) { el.focus(); el.select(); } toast('選択しました。長押しでコピーしてください'); };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => toast('コピーしました'), fallback);
      } else fallback();
    } catch (e) { fallback(); }
  }

  // ============ 仲入り（休憩所） ============
  function openSos() {
    openSheet(`<div class="sos">
      <h2 class="sheet-title">仲入り ― 休憩所</h2>
      <p>ここでは、笑わなくて大丈夫です。</p>
      <section class="sos-block" aria-labelledby="sos-b-h">
        <h3 id="sos-b-h">ちょうちん呼吸</h3>
        <p class="muted small">4秒吸って、4秒とめて、6秒かけて吐く。ちょうちんに合わせて、4回。</p>
        <div class="breath"><div class="breath-lantern" id="breathL"><span id="breathTxt">準備</span></div></div>
        <button class="btn btn-ghost btn-block" data-act="breathStart" id="breathBtn">呼吸をはじめる</button>
      </section>
      <section class="sos-block" aria-labelledby="sos-g-h">
        <h3 id="sos-g-h">5-4-3-2-1</h3>
        <p class="muted small">まわりのものを数えて、「いま・ここ」に戻ります。見つけたら、丸をタップ。</p>
        <ul class="ground">${[['見えるもの', 5], ['聞こえる音', 4], ['ふれているもの', 3], ['におい', 2], ['味', 1]].map(([k, n]) =>
          `<li><span class="ground-k">${k}</span><span class="ground-dots">${Array.from({ length: n }, (_, j) => `<button class="dot" data-act="groundDot" aria-pressed="false" aria-label="${k} ${j + 1}つめ"></button>`).join('')}</span></li>`).join('')}</ul>
      </section>
      <section class="sos-block" aria-labelledby="sos-h-h">
        <h3 id="sos-h-h">話せる場所</h3>
        <p class="muted small">ひとりで抱えなくていい。話すのが苦手でも、聞いてくれる人がいます。</p>
        <ul class="hotlines">${D.HOTLINES.map((h, i) => `<li>
          <p class="hl-name">${esc(h.name)}</p>
          <p class="hl-tel" id="tel${i}">${esc(h.tel)}</p>
          <p class="hl-note">${esc(h.note)}</p>
          <div class="hl-actions"><a class="btn btn-small" href="tel:${h.tel.replace(/-/g, '')}">電話をかける</a><button class="btn btn-small btn-ghost" data-act="copyTel" data-i="${i}">番号をコピー</button></div>
        </li>`).join('')}</ul>
        <p class="emergency">いますぐ命の危険があるときは <b>119</b>（救急）へ。</p>
        <p class="muted small">番号や受付時間は変わることがあります。最新の情報は厚生労働省の<a href="https://www.mhlw.go.jp/mamorouyokokoro/" target="_blank" rel="noopener">「まもろうよ こころ」</a>で確認できます。</p>
      </section>
    </div>`, { label: '休憩所', cls: 'sheet-quiet', onClose: () => { breathRun = 0; } });
  }
  let breathRun = 0;
  ACT.breathStart = async () => {
    const run = ++breathRun;
    const L = $('#breathL'), T = $('#breathTxt'), B = $('#breathBtn');
    if (!L) return;
    B.disabled = true;
    const phases = [['吸って', 4000, 'in'], ['とめて', 4000, 'hold'], ['吐いて', 6000, 'out']];
    for (let c = 0; c < 4; c++) {
      for (const [label, ms, cls] of phases) {
        if (run !== breathRun || !document.body.contains(L)) return;
        L.className = 'breath-lantern ' + cls;
        L.style.transitionDuration = ms + 'ms';
        for (let s = Math.round(ms / 1000); s > 0; s--) {
          if (run !== breathRun) return;
          T.textContent = label + ' ' + s;
          await sleep(1000);
        }
      }
    }
    if (run !== breathRun) return;
    L.className = 'breath-lantern'; T.textContent = 'おつかれさま';
    B.disabled = false; B.textContent = 'もう一度';
  };
  ACT.groundDot = el => { const on = el.getAttribute('aria-pressed') !== 'true'; el.setAttribute('aria-pressed', on); if (on) buzz(10); };
  ACT.copyTel = el => copyText(D.HOTLINES[+el.dataset.i].tel, document.getElementById('tel' + el.dataset.i));

  // ============ はじめての人へ ============
  function openIntro() {
    openSheet(`<div class="intro">
      <div class="intro-art">${A.yokai('satori', 'smug')}${A.mic()}${A.you('norm')}</div>
      <h2 class="sheet-title">ようこそ、ココロ寄席へ</h2>
      <p>頭の中に浮かぶネガティブなセリフは、妖怪のしわざ。あなたは<strong>ツッコミ担当</strong>です。妖怪のボケにツッコんで、ふたりで漫才にしてしまいましょう。</p>
      <div class="field"><label for="introName">あなたの芸名</label><input type="text" id="introName" maxlength="16" value="${esc(S.profile.name)}" autocomplete="off"></div>
      <fieldset class="field"><legend>ツッコミの口調</legend>
        <div class="seg style-seg">
          <label><input type="radio" name="introStyle" value="yasashi"${styleOf() === 'yasashi' ? ' checked' : ''}><span><b>やさしめ</b><small>「その証拠、ある？」</small></span></label>
          <label><input type="radio" name="introStyle" value="kansai"${styleOf() === 'kansai' ? ' checked' : ''}><span><b>キレキレ関西</b><small>「証拠あるんかい！」</small></span></label>
        </div>
        <p class="muted small">あとから楽屋で変えられます。</p>
      </fieldset>
      <div class="btn-col"><button class="btn btn-primary" data-act="introStart">はじめる</button>
      <button class="btn btn-ghost" data-act="introSample">まず見本の漫才を観る</button></div>
      <p class="disclaimer">ココロ寄席は、認知行動療法（CBT）の考え方を使ったセルフケアの道具です。医療の代わりではありません。記録はこの端末の中だけに保存されます。</p>
    </div>`, { label: 'ようこそ' });
  }
  function introSave() {
    const n = $('#introName'); const st = document.querySelector('input[name="introStyle"]:checked');
    if (n && n.value.trim()) S.profile.name = n.value.trim().slice(0, 16);
    if (st) S.profile.style = st.value;
    S.profile.seenIntro = true; save();
  }
  ACT.introStart = () => { introSave(); closeSheet(); rerender(); Sfx.pop(); };
  ACT.introSample = () => { introSave(); closeSheet(); rerender(); startPerformance(D.SAMPLE, {}); };

  // ============ イベント ============
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const fn = ACT[el.dataset.act];
    if (!fn) return;
    if (el.tagName === 'A' || el.tagName === 'BUTTON') e.preventDefault();
    fn(el, e);
  });
  document.addEventListener('input', e => {
    const el = e.target;
    if (el.dataset && el.dataset.out) {
      const o = document.getElementById(el.dataset.out);
      if (o) o.textContent = el.value + (el.dataset.unit || '');
    }
    if (el.dataset && el.dataset.bind && BIND[el.dataset.bind] && el.type !== 'radio' && el.type !== 'checkbox') BIND[el.dataset.bind](el);
  });
  document.addEventListener('change', e => {
    const el = e.target;
    if (el.dataset && el.dataset.bind && BIND[el.dataset.bind] && (el.type === 'radio' || el.type === 'checkbox')) BIND[el.dataset.bind](el);
  });
  document.addEventListener('submit', e => {
    const f = e.target.closest('[data-form]');
    if (!f) return;
    e.preventDefault();
    const fn = FORM[f.dataset.form];
    if (fn) fn(f);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (sheets.length) closeSheet();
      else if (ST) closeStage();
    } else if (ST && (e.key === 'ArrowRight' || e.key === ' ') && !(document.activeElement && /^(BUTTON|A|INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName))) {
      e.preventDefault(); stageNext();
    }
  });
  window.addEventListener('hashchange', route);
  window.addEventListener('pagehide', () => { if (MZ) saveDraft(); });

  // ============ 拡張（ながめ席など）に渡す道具 ============
  const CORE = {
    D, A, $, $$, esc, nl2br, uid, clamp, ymd, today, addDays, fmtMD, sleep, reduceMotion, pick, kanjiNum,
    state: () => S, save, Sfx, Voice, buzz, toast, openSheet, closeSheet, closeAllSheets, sheetBody, confirmSheet,
    addXP, hearts, rankOf, isRisky, openSos, VIEWS, ACT, BIND, FORM,
    render, rerender, go, current: () => current,
    startManzaiWith
  };
  (window.KY_EXT || []).forEach(fn => { try { fn(CORE); } catch (e) { console.error(e); } });

  // ============ 開演 ============
  function boot() {
    load();
    const last = S.profile.lastVisit ? new Date(S.profile.lastVisit) : null;
    welcomeBack = !!(last && Date.now() - last.getTime() > 3 * 864e5);
    S.profile.lastVisit = new Date().toISOString();
    if (!S.profile.name) S.profile.name = 'ココロ亭' + pick(NAMES);
    save();
    applyFont();
    Voice.init();
    route();
    if (!S.profile.seenIntro) setTimeout(openIntro, 350);
  }
  boot();
})();
