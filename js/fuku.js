/* ココロ寄席 ― 福さがし（注意を、よいことに向ける演目）
 *   今日のお題   ：探すものを決めると、目に飛びこんでくる（注意の向け先を自分で選ぶ）
 *   今日の福     ：小さなよいことを一つから三つ（ポジティブ心理学の「三つのよいこと」）
 *   味わう       ：よいことを20秒とどめる（味わい・セイバリング）
 *   福引き       ：過去の福を一つ引いて、思い出し直す
 *   福帳         ：これまでの福
 * 案内役は、見ようとする人にだけ姿を見せる妖怪「座敷わらし」。
 */
(function () {
  'use strict';
  (window.KY_EXT = window.KY_EXT || []).push(function (K) {
    const { D, A, $, esc, uid, ymd, today, fmtMD, pick, toast, openSheet, closeSheet, sheetBody, addXP, hearts, VIEWS, ACT, FORM, Sfx, buzz } = K;
    const F = D.FUKU;

    function fk() {
      const S = K.state();
      if (!S.fuku) S.fuku = {};
      const f = S.fuku;
      f.finds = f.finds || []; f.goods = f.goods || []; f.days = f.days || {}; f.savors = f.savors || 0;
      return f;
    }
    function dayHash(s) { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
    function odaiIndex() {
      const f = fk(); const t = today();
      if (f.days[t] && typeof f.days[t].odai === 'number') return f.days[t].odai % F.odai.length;
      return dayHash(t) % F.odai.length;
    }
    K.fukuOdai = () => F.odai[odaiIndex()];
    const isToday = iso => ymd(new Date(iso)) === today();
    function zashiki() { const S = K.state(); return S.yokai.zashiki || (S.yokai.zashiki = { met: 0, friend: 0 }); }

    VIEWS.fuku = function () {
      const f = fk();
      const oi = odaiIndex();
      const todayFinds = f.finds.filter(x => isToday(x.date) && x.odai === oi);
      const todayGoods = f.goods.filter(x => isToday(x.date));
      const total = f.finds.length + f.goods.length;
      const z = K.state().yokai.zashiki;
      const line = total === 0 ? '見ようとしてくれたら、ここにいるよ。' : F.zashikiLines[total % F.zashikiLines.length];
      const byDay = {};
      f.goods.forEach(g => { const d = ymd(new Date(g.date)); (byDay[d] = byDay[d] || { goods: [], finds: 0 }).goods.push(g); });
      f.finds.forEach(x => { const d = ymd(new Date(x.date)); (byDay[d] = byDay[d] || { goods: [], finds: 0 }).finds += 1; });
      const days = Object.keys(byDay).sort().reverse().slice(0, 14);
      const inputs = todayGoods.length ? 1 : 3;
      return `<header class="page-head"><h1 class="page-title">福さがし</h1><p class="page-sub">注意は、探したものを見つける</p></header>

      <section class="fuku-board" aria-label="座敷わらし">
        <div class="fuku-art">${A.yokai('zashiki', 'happy')}</div>
        <div class="fuku-score">
          <p class="fuku-k">見つけた福</p>
          <p class="fuku-num">${total}<small>こ</small></p>
          ${z && z.met ? hearts(z.friend) : ''}
        </div>
        <p class="fuku-line">${esc(line)}</p>
      </section>

      <section class="odai" aria-labelledby="odai-h">
        <p class="odai-k" id="odai-h">今日のお題</p>
        <p class="odai-t">${esc(F.odai[oi])}</p>
        <p class="odai-note">今日一日、このお題を頭の片すみに置いておきます。探すものを決めておくだけで、不思議と目に飛びこんできます。見つけたら「見つけた！」。</p>
        <form class="odai-form" data-form="fukuFind">
          <label for="findNote" class="sr-only">どこで見つけた？</label>
          <input type="text" id="findNote" maxlength="40" placeholder="どこで？（なくてもOK）" autocomplete="off">
          <button class="btn btn-primary" type="submit">見つけた！</button>
        </form>
        ${todayFinds.length ? `<p class="find-count">今日のお題で <strong>${todayFinds.length}</strong>こ見つけました</p>
          <ul class="find-list">${todayFinds.map(x => `<li>${x.note ? esc(x.note) : '見つけた'}</li>`).join('')}</ul>` : ''}
        <button class="link-btn small" data-act="fukuOdaiNext">お題を変える</button>
      </section>

      <section aria-labelledby="goods-h">
        <h2 id="goods-h" class="sec-title"><span>今日の福</span></h2>
        ${todayGoods.length ? `<ul class="good-list">${todayGoods.map(g => `<li>
            <div><p>${esc(g.text)}</p>${g.why ? `<small>${esc(g.why)}</small>` : ''}</div>
            <button class="btn btn-small" data-act="fukuSavor" data-id="${g.id}">味わう</button>
          </li>`).join('')}</ul>` : ''}
        <form class="form good-form" data-form="fukuGood">
          <p class="muted small">今日あった、小さなよいことを${todayGoods.length ? 'もうひとつ' : '一つから三つ'}。「水がおいしかった」くらいで十分です。</p>
          ${[0, 1, 2].slice(0, inputs).map(i => `<div class="field"><label for="good${i}" class="sr-only">よいこと${i + 1}</label>
            <input type="text" id="good${i}" maxlength="60" placeholder="${i === 0 ? '例：' + esc(F.examples[0]) : 'もうひとつ（なくてもOK）'}" autocomplete="off"></div>`).join('')}
          <div class="examples"><span class="examples-k">タップで入れる</span>${F.examples.map((e, i) =>
            `<button type="button" class="chip chip-sm" data-act="fukuEx" data-i="${i}">${esc(e)}</button>`).join('')}</div>
          <details class="why"><summary>それは、なぜ起きた？（任意）</summary>
            <label for="goodWhy" class="sr-only">なぜ起きた？</label>
            <input type="text" id="goodWhy" maxlength="60" placeholder="例：早めに寝たから" autocomplete="off"></details>
          <div class="btn-row">
            ${todayGoods.length ? '' : '<button type="button" class="btn btn-ghost" data-act="fukuNone">今日は見つからなかった</button>'}
            <button class="btn btn-primary" type="submit">福帳にしまう</button>
          </div>
        </form>
      </section>

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
          : '<p class="empty">福帳はまだ白紙です。今日のお題か、今日の福から、ひとつどうぞ。</p>'}
      </section>

      <aside class="howto"><p class="howto-k">この演目の考え方</p>
        <p>注意は、自分で向け先を選べます。不安から目をそらすのではなく、よいことにも注意を向けられると体験する演目です。ポジティブ心理学の「三つのよいこと」と「味わい（セイバリング）」の考え方を参考にしています。</p>
        <p class="muted small" style="margin-top:6px">見つからない日があっても大丈夫。見つけようとしたこと自体が、注意の練習です。福の数に目標や連続記録はありません。</p>
      </aside>`;
    };

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
      toast((first ? '座敷わらしが、顔を出しました。' : '福、みっけ。') + (up ? '　' + up + 'に昇進しました' : ''));
    };
    ACT.fukuOdaiNext = () => {
      const f = fk(); const t = today();
      f.days[t] = Object.assign({}, f.days[t], { odai: (odaiIndex() + 1) % F.odai.length });
      K.save(); K.rerender();
    };
    ACT.fukuEx = el => {
      const t = F.examples[+el.dataset.i];
      for (let i = 0; i < 3; i++) {
        const inp = $('#good' + i);
        if (inp && !inp.value.trim()) { inp.value = t; inp.focus(); return; }
      }
      const inp = $('#good0'); if (inp) inp.value = t;
    };
    FORM.fukuGood = form => {
      const f = fk();
      const texts = [0, 1, 2].map(i => { const el = $('#good' + i, form); return el ? el.value.trim() : ''; }).filter(Boolean);
      if (!texts.length) { const g0 = $('#good0', form); if (g0) g0.focus(); toast('小さなことで大丈夫。ひとつだけ書いてみましょう'); return; }
      const why = ($('#goodWhy', form) || {}).value ? $('#goodWhy', form).value.trim() : '';
      const firstToday = !f.goods.some(g => isToday(g.date));
      texts.forEach((text, i) => f.goods.push({ id: uid(), date: new Date().toISOString(), text: text.slice(0, 60), why: i === 0 ? why : '' }));
      const z = zashiki();
      const before = z.friend;
      if (firstToday) { z.met += 1; z.friend = Math.min(5, z.friend + 1); }
      const unlocked = before < 3 && z.friend >= 3;
      const up = addXP(firstToday ? D.XP.fukuGood : 3);
      K.save();
      Sfx.chime();
      K.rerender();
      if (unlocked) {
        const y = D.yokaiById.zashiki;
        openSheet(`<div class="yg-result">
          <div class="yg-result-art">${A.yokai('zashiki', 'happy')}</div>
          <p class="yg-result-say">座敷わらしの本音が聞けるようになりました</p>
          <div class="honne"><blockquote>${esc(y.honne)}</blockquote></div>
          <button class="btn btn-primary btn-block" data-act="closeSheet">閉じる</button>
        </div>`, { label: '本音' });
      } else {
        toast('福帳にしまいました。「味わう」で、20秒だけ味わえます。' + (up ? '　' + up + 'に昇進しました' : ''));
      }
    };
    ACT.fukuNone = () => {
      openSheet(`<div class="yg-result">
        <div class="yg-result-art">${A.yokai('zashiki', 'meek')}</div>
        <p class="yg-result-say">見つからない日も、あります</p>
        <p>見つけようとしたこと自体が、注意の練習です。今日は、ここまでで十分。明日の座敷わらしは、また別のところに隠れています。</p>
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
