/* ココロ寄席 ― 福さがし（注意を、よいことに向ける演目）
 * 主役は「夜の福日記」：一日を思い出して、よかったことを3行（樺沢紫苑の3行ポジティブ日記、
 * ポジティブ心理学の「三つのよいこと」「感謝」を参考に）。
 * 第八回：各行の手がかりを、9つの「切り口」（よかったこと・ありがとう・ラッキー・おいしい・ほっとした・
 *   笑った・できた・やさしさ・明日の楽しみ）から選べるように。朝のお題は「今日の切り口」。
 * 味わう（20秒）、福引き、福帳。案内役は座敷わらし。
 */
(function () {
  'use strict';
  (window.KY_EXT = window.KY_EXT || []).push(function (K) {
    const { D, A, $, $$, esc, uid, ymd, today, fmtMD, pick, toast, openSheet, closeSheet, sheetBody, addXP, hearts, VIEWS, ACT, FORM, Sfx, buzz } = K;
    const F = D.FUKU;
    const KIRI = F.kiri;
    const KIRI_BY = Object.fromEntries(KIRI.map(k => [k.id, k]));

    function fk() {
      const S = K.state();
      if (!S.fuku) S.fuku = {};
      const f = S.fuku;
      f.finds = f.finds || []; f.goods = f.goods || []; f.days = f.days || {}; f.savors = f.savors || 0;
      return f;
    }
    function dayHash(s) { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
    function odaiIndex() {
      const f = fk(); const t = today(); const d = f.days[t] || {};
      if (typeof d.odai === 'number') return d.odai % KIRI.length;
      return dayHash(t + 'kiri') % KIRI.length;
    }
    const odaiKiri = () => KIRI[odaiIndex()];
    K.fukuOdai = () => odaiKiri().label;
    // 今日の各行の切り口：1行目は朝のお題、のこりはちがう切り口から
    let LINE_KIRI = null;
    function lineKiri() {
      const t = today();
      if (!LINE_KIRI || LINE_KIRI.date !== t || LINE_KIRI.odai !== odaiIndex()) {
        const first = odaiKiri().id;
        LINE_KIRI = { date: t, odai: odaiIndex(), ids: [first].concat(F.diaryDefault.filter(id => id !== first)) };
      }
      return LINE_KIRI.ids;
    }
    const isToday = iso => ymd(new Date(iso)) === today();
    const isNight = () => { const h = new Date().getHours(); return h >= 17 || h < 4; };
    function zashiki() { const S = K.state(); return S.yokai.zashiki || (S.yokai.zashiki = { met: 0, friend: 0 }); }

    const findLabel = x => x.note || (KIRI[(x.odai || 0) % KIRI.length].label + 'を見つけた');
    function kiriLine(i, kid, todayGoods) {
      const k = KIRI_BY[kid] || KIRI[0];
      return `<div class="nikki-line">
          <div class="kiri-row" role="radiogroup" aria-label="${i + 1}行目の切り口">${KIRI.map(x => `<button type="button" class="kiri${x.id === k.id ? ' on' : ''}" role="radio" aria-checked="${x.id === k.id}" data-act="fukuKiri" data-line="${i}" data-id="${x.id}">${esc(x.label)}</button>`).join('')}</div>
          <label for="good${i}" class="kiri-q" id="kiriQ${i}">${esc(k.q)}</label>
          <input type="text" id="good${i}" data-kiri="${k.id}" maxlength="60" placeholder="例：${esc(k.ex[todayGoods.length % k.ex.length])}" autocomplete="off">
        </div>`;
    }
    function diaryForm(todayGoods) {
      const remaining = Math.max(1, 3 - todayGoods.length);
      const ids = lineKiri();
      const lines = todayGoods.length >= 3 ? [ids[0]] : ids.slice(0, 3).slice(3 - remaining);
      const finds = fk().finds.filter(x => isToday(x.date));
      return `<form class="form nikki-form" data-form="fukuGood">
        <p class="kiri-hint">切り口は、行ごとに選べます。書きやすいものでどうぞ。</p>
        ${lines.map((kid, i) => kiriLine(i, kid, todayGoods)).join('')}
        ${finds.length ? `<div class="examples"><span class="examples-k">昼に見つけた福を入れる</span>${finds.map(x =>
          `<button type="button" class="chip chip-sm chip-find" data-act="fukuFindUse" data-t="${esc(findLabel(x))}">${esc(findLabel(x))}</button>`).join('')}</div>` : ''}
        <details class="rewind"><summary>思い出せないときは、一日を巻き戻す</summary>
          <div class="chips" role="group" aria-label="時間帯">${Object.keys(F.rewind).map(k =>
            `<button type="button" class="chip chip-sm" data-act="fukuRewind" data-k="${k}">${esc(F.rewind[k].label)}</button>`).join('')}</div>
          <ul class="rewind-q" id="rewindQ"></ul>
        </details>
        <div class="examples"><span class="examples-k">タップで入れる</span>${F.examples.map((e, i) =>
          `<button type="button" class="chip chip-sm" data-act="fukuEx" data-i="${i}">${esc(e)}</button>`).join('')}</div>
        <div class="btn-row">
          ${todayGoods.length ? '' : '<button type="button" class="btn btn-ghost" data-act="fukuNone">今日は見つからなかった</button>'}
          <button class="btn btn-primary" type="submit">福帳にしまう</button>
        </div>
      </form>`;
    }

    VIEWS.fuku = function () {
      const f = fk();
      const oi = odaiIndex();
      const todayFinds = f.finds.filter(x => isToday(x.date));
      const todayGoods = f.goods.filter(x => isToday(x.date));
      const total = f.finds.length + f.goods.length;
      const z = K.state().yokai.zashiki;
      const night = isNight();
      const line = total === 0 ? '見ようとしてくれたら、ここにいるよ。' : F.zashikiLines[total % F.zashikiLines.length];
      const byDay = {};
      f.goods.forEach(g => { const d = ymd(new Date(g.date)); (byDay[d] = byDay[d] || { goods: [], finds: 0 }).goods.push(g); });
      f.finds.forEach(x => { const d = ymd(new Date(x.date)); (byDay[d] = byDay[d] || { goods: [], finds: 0 }).finds += 1; });
      const days = Object.keys(byDay).sort().reverse().slice(0, 14);
      const diaryDays = Object.keys(byDay).filter(d => byDay[d].goods.length).length;

      const nikki = `<section class="nikki" aria-labelledby="nikki-h">
        <p class="nikki-k" id="nikki-h">${night ? '今夜の福日記' : '今日の福日記'}</p>
        <p class="nikki-lead">一日を思い出して、よかったことを3行。小さくても、<strong>こじつけでも大歓迎</strong>です。「ありがとう」「ラッキー」「笑った」……切り口を変えると、思い出せることが変わります。${night ? '' : '寝る前に書くのがおすすめです。'}</p>
        ${todayGoods.length ? `<ul class="good-list">${todayGoods.map(g => `<li>
            <div>${g.lens ? `<small class="good-lens">${esc(g.lens)}</small>` : ''}<p>${esc(g.text)}</p></div>
            <button class="btn btn-small" data-act="fukuSavor" data-id="${g.id}">味わう</button>
          </li>`).join('')}</ul>` : ''}
        ${todayGoods.length >= 3 ? '<p class="muted small">今日の3行は書けました。足したくなったら、もう1行どうぞ。</p>' : ''}
        ${diaryForm(todayGoods)}
      </section>`;

      const odai = `<section class="odai" aria-labelledby="odai-h">
        <p class="odai-k" id="odai-h">朝のお題 ― 今日の切り口</p>
        <p class="odai-t">${esc(KIRI[oi].label)}<small>をさがす日</small></p>
        <p class="odai-note">${esc(KIRI[oi].q)}<br>朝に切り口を決めておくと、一日のうちに目に入りやすくなり、夜の1行目が書きやすくなります。見つけたら、ひとことメモを。</p>
        <form class="odai-form" data-form="fukuFind">
          <label for="findNote" class="sr-only">どこで見つけた？</label>
          <input type="text" id="findNote" maxlength="40" placeholder="どこで？（任意）" autocomplete="off">
          <button class="btn btn-primary" type="submit">見つけた！</button>
        </form>
        ${todayFinds.length ? `<p class="find-count">今日 <strong>${todayFinds.length}</strong>こ見つけました。夜の日記に入れられます。</p>` : ''}
        <button class="link-btn small" data-act="fukuOdaiNext">お題を変える</button>
      </section>`;

      return `<header class="page-head"><h1 class="page-title">福さがし</h1><p class="page-sub">今日の記憶から、福をさがす</p></header>

      <section class="fuku-board" aria-label="座敷わらし">
        <div class="fuku-art">${A.yokai('zashiki', 'happy')}</div>
        <div class="fuku-score">
          <p class="fuku-k">見つけた福</p>
          <p class="fuku-num">${total}<small>こ</small></p>
          <p class="fuku-days">福日記 ${diaryDays}日</p>
          ${z && z.met ? hearts(z.friend) : ''}
        </div>
        <p class="fuku-line">${esc(line)}</p>
      </section>

      ${new Date().getHours() < 12 ? odai + nikki : nikki + odai}

      ${f.goods.length >= 3 ? `<section aria-labelledby="biki-h">
        <h2 id="biki-h" class="sec-title"><span>福引き</span></h2>
        <p class="muted small">これまでの福を、ひとつ引いて思い出します。思い出し直すと、よい記憶はもう一度ふくらみます。</p>
        <button class="btn btn-ghost btn-block" data-act="fukuBiki">あの日の福を引く</button>
      </section>` : ''}

      <section aria-labelledby="cho-h">
        <h2 id="cho-h" class="sec-title"><span>福帳</span></h2>
        ${days.length ? `<ul class="cho-list">${days.map(d => `<li>
            <p class="cho-date">${fmtMD(d)}${byDay[d].finds ? `<span>お題で ${byDay[d].finds}こ</span>` : ''}</p>
            ${byDay[d].goods.map(g => `<p class="cho-good">${esc(g.text)}</p>`).join('')}
          </li>`).join('')}</ul>`
          : '<p class="empty">福帳はまだ白紙です。今夜の福日記から、一行どうぞ。</p>'}
      </section>

      <aside class="howto"><p class="howto-k">この演目の考え方</p>
        <p>注意は、自分で向け先を選べます。寝る前に一日をふりかえり、よかったことを書くと、一日が「よかったこともあった日」として整理し直されます。樺沢紫苑が紹介している「3行ポジティブ日記」と、ポジティブ心理学の「三つのよいこと」「感謝」「味わい（セイバリング）」を参考にしています。</p>
        <p class="muted small" style="margin-top:6px">思い出せないのは、切り口が合っていないだけ。「ラッキー」「ありがとう」「笑った」など、切り口を変えたり、一日を巻き戻したりしてみてください。見つからない日があっても大丈夫。福の数に目標や連続記録はありません。</p>
      </aside>`;
    };

    // ---- 朝のお題（昼のメモ） ----
    FORM.fukuFind = form => {
      const f = fk();
      const note = $('#findNote', form).value.trim().slice(0, 40);
      const first = !zashiki().met;
      f.finds.push({ id: uid(), date: new Date().toISOString(), odai: odaiIndex(), note });
      if (first) zashiki().met = 1;
      const up = addXP(D.XP.fukuFind);
      K.save();
      Sfx.chime(); buzz(15);
      K.rerender();
      toast((first ? '座敷わらしが、顔を出しました。' : '福、みっけ。夜の日記に入れられます。') + (up ? '　' + up + 'に昇進しました' : ''));
    };
    ACT.fukuOdaiNext = () => {
      const f = fk(); const t = today();
      f.days[t] = Object.assign({}, f.days[t], { odai: (odaiIndex() + 1) % KIRI.length });
      K.save(); K.rerender();
    };

    // ---- 夜の福日記 ----
    ACT.fukuKiri = el => { // 入力中の文字を消さないよう、再描画せずに切り口だけ変える
      const i = +el.dataset.line; const k = KIRI_BY[el.dataset.id]; if (!k) return;
      const row = el.closest('.kiri-row');
      $$('.kiri', row).forEach(b => { const on = b === el; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
      const q = $('#kiriQ' + i); if (q) { q.textContent = k.q; q.classList.remove('flip'); void q.offsetWidth; q.classList.add('flip'); }
      const inp = $('#good' + i); if (inp) { inp.dataset.kiri = k.id; inp.placeholder = '例：' + k.ex[0]; }
      buzz(8);
    };
    function fillEmpty(text) {
      const inputs = $$('.nikki-form input[data-kiri]');
      const empty = inputs.find(i => !i.value.trim());
      const target = empty || inputs[0];
      if (target) { target.value = text; target.focus(); }
    }
    ACT.fukuEx = el => fillEmpty(F.examples[+el.dataset.i]);
    ACT.fukuFindUse = el => fillEmpty(el.dataset.t);
    ACT.fukuRewind = el => {
      const r = F.rewind[el.dataset.k]; const ul = $('#rewindQ'); if (!r || !ul) return;
      $$('[data-act="fukuRewind"]').forEach(b => b.classList.toggle('on', b === el));
      ul.innerHTML = r.q.map(q => `<li>${esc(q)}</li>`).join('');
    };
    FORM.fukuGood = form => {
      const f = fk();
      const lines = $$('input[data-kiri]', form).map(i => ({ kind: i.dataset.kiri, text: i.value.trim() })).filter(x => x.text);
      if (!lines.length) { const g0 = $('#good0', form); if (g0) g0.focus(); toast('小さなこと、こじつけで大丈夫。ひとつだけ書いてみましょう'); return; }
      const firstToday = !f.goods.some(g => isToday(g.date));
      lines.forEach(x => f.goods.push({ id: uid(), date: new Date().toISOString(), text: x.text.slice(0, 60), lens: (KIRI_BY[x.kind] || KIRI[0]).label, kind: x.kind }));
      const z = zashiki();
      const before = z.friend;
      if (firstToday) { z.met += 1; z.friend = Math.min(5, z.friend + 1); }
      const unlocked = before < 3 && z.friend >= 3;
      const up = addXP(firstToday ? D.XP.fukuGood : 3);
      K.save();
      Sfx.chime();
      K.rerender();
      if (unlocked) {
        openSheet(`<div class="yg-result">
          <div class="yg-result-art">${A.yokai('zashiki', 'happy')}</div>
          <p class="yg-result-say">座敷わらしの本音が聞けるようになりました</p>
          <div class="honne"><blockquote>${esc(D.yokaiById.zashiki.honne)}</blockquote></div>
          <button class="btn btn-primary btn-block" data-act="closeSheet">閉じる</button>
        </div>`, { label: '本音' });
      } else if (isNight() && firstToday) {
        openSheet(`<div class="yg-result">
          <div class="yg-result-art">${A.yokai('zashiki', 'happy')}</div>
          <p class="yg-result-say">今夜の福日記、書けました</p>
          <p>一日が、「よかったこともあった日」として閉じられました。このまま、体をゆるめて眠りにつきませんか。</p>
          ${up ? `<p class="xp-gain"><strong>${esc(up)}に昇進しました</strong></p>` : ''}
          <div class="btn-col">
            <button class="btn btn-primary" data-act="fukuToBed">おやすみ席へ（約4分）</button>
            <button class="btn btn-ghost" data-act="closeSheet">ここで閉じる</button>
          </div>
        </div>`, { label: '福日記' });
      } else {
        toast('福帳にしまいました。「味わう」で、20秒だけ味わえます。' + (up ? '　' + up + 'に昇進しました' : ''));
      }
    };
    ACT.fukuToBed = () => { closeSheet(); if (K.openOmakase) setTimeout(() => K.openOmakase('nemuri'), 260); else K.go('nagame'); };
    ACT.fukuNone = () => {
      openSheet(`<div class="yg-result">
        <div class="yg-result-art">${A.yokai('zashiki', 'meek')}</div>
        <p class="yg-result-say">見つからない日も、あります</p>
        <p>思い出そうとしたこと自体が、注意の練習です。今日は、ここまでで十分。明日の座敷わらしは、また別のところに隠れています。</p>
        <button class="btn btn-primary btn-block" data-act="closeSheet">閉じる</button>
      </div>`, { label: '見つからない日' });
    };

    // ---- 味わう（20秒） ----
    let savorTimer = null;
    let savorTarget = null;
    function savorSheet(g, label) {
      savorTarget = g;
      openSheet(`<div class="savor">
        <p class="eyebrow">${esc(label)}</p>
        <div class="savor-art">${A.yokai('zashiki', 'happy')}</div>
        <p class="savor-text">「${esc(g.text)}」</p>
        <p class="muted">そのときの景色、音、体の感じを思い出して、20秒だけ味わいます。よい体験は、さっと流すと残りにくいので、少しだけ長くとどめます。</p>
        <div class="savor-ring" id="savorRing" style="--p:0"><span id="savorSec">20</span></div>
        <button class="btn btn-primary btn-block" id="savorBtn" data-act="fukuSavorGo">味わいはじめる</button>
      </div>`, { label: '味わう', onClose: () => { clearInterval(savorTimer); savorTimer = null; } });
    }
    ACT.fukuSavor = el => { const g = fk().goods.find(x => x.id === el.dataset.id); if (g) savorSheet(g, '今日の福を味わう'); };
    ACT.fukuBiki = () => {
      const f = fk();
      const past = f.goods.filter(g => !isToday(g.date));
      const g = pick(past.length ? past : f.goods);
      if (!g) return;
      Sfx.pop();
      savorSheet(g, fmtMD(g.date) + 'の福');
    };
    ACT.fukuSavorGo = el => {
      if (savorTimer) return;
      el.disabled = true; el.textContent = '味わっています……';
      let left = 20;
      const ring = $('#savorRing'), sec = $('#savorSec');
      savorTimer = setInterval(() => {
        left -= 1;
        if (sec) sec.textContent = String(Math.max(left, 0));
        if (ring) ring.style.setProperty('--p', String((20 - left) / 20));
        if (left <= 0) {
          clearInterval(savorTimer); savorTimer = null;
          const f = fk(); f.savors += 1;
          if (K.mark) K.mark('savor');
          const up = addXP(D.XP.savor);
          K.save();
          Sfx.bell(); buzz(20);
          const b = sheetBody();
          if (b) b.innerHTML = `<div class="yg-result">
            <div class="yg-result-art">${A.yokai('zashiki', 'happy')}</div>
            <p class="yg-result-say">味わいました</p>
            <p>「${esc(savorTarget ? savorTarget.text : '')}」。この感じは、また思い出せます。</p>
            <p class="xp-gain">経験 +${D.XP.savor}${up ? `　<strong>${esc(up)}に昇進しました</strong>` : ''}</p>
            <button class="btn btn-primary btn-block" data-act="closeAndRender">閉じる</button>
          </div>`;
        }
      }, 1000);
    };
  });
})();
