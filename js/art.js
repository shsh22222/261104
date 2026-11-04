/* ココロ寄席 ― 絵（SVG）
 * 妖怪12体、ツッコミ担当、センターマイク、おみくじ箱。
 * mood: norm（ふつう）/ smug（ドヤ顔）/ shock（ツッコまれた）/ meek（しゅん）/ happy（なかよし）
 */
(function () {
  'use strict';
  const INK = '#1b1712';
  const W = '#fbf7ee';

  function eye(x, y, r, mood, i, n, opt) {
    const lid = opt.lid || '#000';
    const pupil = opt.pupil || INK;
    const sw = Math.max(2.4, r * 0.45);
    if (mood === 'happy') {
      return `<path d="M${x - r} ${y + r * 0.3} Q${x} ${y - r * 1.2} ${x + r} ${y + r * 0.3}" fill="none" stroke="${opt.stroke || INK}" stroke-width="${sw}" stroke-linecap="round"/>`;
    }
    if (mood === 'shock') {
      if (n === 2) {
        const d = i === 0 ? 1 : -1;
        return `<path d="M${x - r * d} ${y - r} L${x + r * 0.7 * d} ${y} L${x - r * d} ${y + r}" fill="none" stroke="${opt.stroke || INK}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
      }
      return `<circle cx="${x}" cy="${y}" r="${r * 1.15}" fill="${W}" stroke="${INK}" stroke-width="2.5"/><circle cx="${x}" cy="${y}" r="${r * 0.28}" fill="${pupil}"/>`;
    }
    let s = `<circle cx="${x}" cy="${y}" r="${r}" fill="${W}" stroke="${INK}" stroke-width="2.5"/>`;
    if (mood === 'meek') {
      s += `<circle cx="${x - r * 0.25}" cy="${y + r * 0.35}" r="${r * 0.48}" fill="${pupil}"/>`;
    } else {
      s += `<circle cx="${x + r * 0.15}" cy="${y + r * 0.05}" r="${r * 0.5}" fill="${pupil}"/>`;
      s += `<circle cx="${x + r * 0.32}" cy="${y - r * 0.18}" r="${r * 0.16}" fill="${W}"/>`;
    }
    if (mood === 'smug') {
      s += `<path d="M${x - r - 1} ${y} A${r + 1} ${r + 1} 0 0 1 ${x + r + 1} ${y} Z" fill="${lid}" stroke="${INK}" stroke-width="2.5"/>`;
    }
    return s;
  }

  function eyes(pts, r, mood, opt) {
    opt = opt || {};
    return pts.map(([x, y], i) => eye(x, y, r, mood, i, pts.length, opt)).join('');
  }

  function mouth(x, y, w, mood, opt) {
    opt = opt || {};
    const c = opt.stroke || INK;
    switch (mood) {
      case 'smug':
        return `<path d="M${x - w} ${y + 1} Q${x + w * 0.2} ${y + w * 0.5} ${x + w} ${y - w * 0.35}" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`;
      case 'shock':
        return `<ellipse cx="${x}" cy="${y + 2}" rx="${w * 0.45}" ry="${w * 0.6}" fill="#5a1d1d" stroke="${c}" stroke-width="2.5"/>`;
      case 'meek':
        return `<path d="M${x - w} ${y} Q${x - w / 2} ${y - 4} ${x} ${y} Q${x + w / 2} ${y + 4} ${x + w} ${y}" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`;
      case 'happy':
        return `<path d="M${x - w} ${y - 2} Q${x} ${y + w * 1.25} ${x + w} ${y - 2} Z" fill="#7a2626" stroke="${c}" stroke-width="2.5" stroke-linejoin="round"/>`;
      default:
        return `<path d="M${x - w} ${y} Q${x} ${y + w * 0.7} ${x + w} ${y}" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`;
    }
  }

  function sweat(x, y) {
    return `<path d="M${x} ${y} q-5 8 0 11 q5 -3 0 -11 Z" fill="#9fd3ea" stroke="${INK}" stroke-width="1.8"/>`;
  }
  function blush(x1, x2, y) {
    return `<ellipse cx="${x1}" cy="${y}" rx="6" ry="3.5" fill="#f08a8a" opacity=".7"/><ellipse cx="${x2}" cy="${y}" rx="6" ry="3.5" fill="#f08a8a" opacity=".7"/>`;
  }
  function extras(mood, s) {
    let out = '';
    if (mood === 'meek' && s.sweat) out += sweat(s.sweat[0], s.sweat[1]);
    if (mood === 'happy' && s.blush) out += blush(s.blush[0], s.blush[1], s.blush[2]);
    return out;
  }

  function spiky(cx, cy, r1, r2, n) {
    const pts = [];
    for (let i = 0; i < n * 2; i++) {
      const a = (Math.PI * i) / n - Math.PI / 2;
      const r = i % 2 ? r2 : r1;
      pts.push((cx + Math.cos(a) * r).toFixed(1) + ',' + (cy + Math.sin(a) * r).toFixed(1));
    }
    return pts.join(' ');
  }

  const DRAW = {
    nurikabe(m) {
      return `
        <rect x="30" y="102" width="16" height="10" rx="4" fill="${INK}"/>
        <rect x="74" y="102" width="16" height="10" rx="4" fill="${INK}"/>
        <rect x="18" y="20" width="84" height="86" rx="14" fill="#ece6d8" stroke="${INK}" stroke-width="3"/>
        <path d="M60 21.5 H88 a12.5 12.5 0 0 1 12.5 12.5 V92 a12.5 12.5 0 0 1 -12.5 12.5 H60 Z" fill="#2b2723"/>
        <path d="M20 48 H100 M20 78 H100 M40 22 V48 M80 48 V78 M40 78 V104" stroke="#8f887b" stroke-width="2" opacity=".45"/>
        ${eyes([[42, 58], [78, 58]], 8, m, { lid: '#8f887b' })}
        ${mouth(60, 82, 11, m, { stroke: '#8f887b' })}
        ${extras(m, { sweat: [96, 34], blush: [36, 84, 70] })}`;
    },
    itsumo(m) {
      return `
        <path d="M26 114 V54 a34 42 0 0 1 68 0 V114 Z" fill="#5d6196" stroke="${INK}" stroke-width="3"/>
        <ellipse cx="46" cy="24" rx="9" ry="4" fill="#fff" opacity=".28"/>
        <circle cx="55" cy="38" r="4.5" fill="none" stroke="#e3b04b" stroke-width="2.8"/>
        <circle cx="65" cy="38" r="4.5" fill="none" stroke="#e3b04b" stroke-width="2.8"/>
        <path d="M38 50 L53 55 M82 50 L67 55" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>
        ${eyes([[47, 64], [73, 64]], 7, m, { lid: '#5d6196' })}
        ${mouth(60, 86, 11, m)}
        ${extras(m, { sweat: [90, 40], blush: [40, 80, 76] })}`;
    },
    hitotsume(m) {
      return `
        <path d="M34 114 L42 82 H78 L86 114 Z" fill="#3e6f8e" stroke="${INK}" stroke-width="3"/>
        <path d="M52 82 L60 96 L68 82" fill="none" stroke="${W}" stroke-width="3.5"/>
        <circle cx="58" cy="54" r="32" fill="#f0c9a4" stroke="${INK}" stroke-width="3"/>
        ${eyes([[58, 52]], 13, m, { lid: '#f0c9a4' })}
        ${mouth(58, 74, 7, m)}
        <circle cx="98" cy="86" r="11" fill="#cfe6ee" fill-opacity=".55" stroke="${INK}" stroke-width="3"/>
        <path d="M90 94 L80 104" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
        ${extras(m, { sweat: [86, 30], blush: [38, 78, 66] })}`;
    },
    magure(m) {
      return `
        <path d="M28 52 L34 12 L56 36 Z" fill="#e3893a" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M92 52 L86 12 L64 36 Z" fill="#e3893a" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M34 42 L37 22 L48 36 Z M86 42 L83 22 L72 36 Z" fill="#f2b6a0"/>
        <path d="M22 58 Q22 34 60 34 Q98 34 98 58 Q98 86 60 106 Q22 86 22 58 Z" fill="#e3893a" stroke="${INK}" stroke-width="3"/>
        <path d="M36 66 Q60 56 84 66 Q80 90 60 102 Q40 90 36 66 Z" fill="${W}"/>
        <path d="M42 48 Q48 42 54 50 M78 48 Q72 42 66 50" fill="none" stroke="#c8352b" stroke-width="3" stroke-linecap="round"/>
        ${eyes([[46, 62], [74, 62]], 6, m, { lid: '#e3893a' })}
        <ellipse cx="60" cy="86" rx="4" ry="3" fill="${INK}"/>
        ${mouth(60, 93, 6, m)}
        ${extras(m, { sweat: [92, 62], blush: [40, 80, 76] })}`;
    },
    satori(m) {
      return `
        <polygon points="${spiky(60, 64, 48, 38, 16)}" fill="#8a6a4e" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
        <ellipse cx="60" cy="68" rx="27" ry="25" fill="#ecc9a6" stroke="${INK}" stroke-width="2.5"/>
        <ellipse cx="60" cy="34" rx="8" ry="5.5" fill="${W}" stroke="${INK}" stroke-width="2.5"/>
        <circle cx="60" cy="34" r="3" fill="#7b3fc4"/>
        ${eyes([[50, 66], [70, 66]], 5.5, m, { lid: '#ecc9a6' })}
        ${mouth(60, 82, 8, m)}
        ${extras(m, { sweat: [86, 50], blush: [44, 76, 76] })}`;
    },
    kudan(m) {
      return `
        <path d="M32 42 Q18 26 28 14 Q32 30 42 36 Z" fill="#e9dcc0" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M88 42 Q102 26 92 14 Q88 30 78 36 Z" fill="#e9dcc0" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
        <ellipse cx="20" cy="56" rx="10" ry="6" fill="#f4efe6" stroke="${INK}" stroke-width="2.5" transform="rotate(-20 20 56)"/>
        <ellipse cx="100" cy="56" rx="10" ry="6" fill="#f4efe6" stroke="${INK}" stroke-width="2.5" transform="rotate(20 100 56)"/>
        <ellipse cx="60" cy="68" rx="40" ry="40" fill="#f4efe6" stroke="${INK}" stroke-width="3"/>
        <path d="M24 74 q8 -14 20 -3 q-2 14 -15 13 q-7 -2 -5 -10 Z" fill="#2b2723"/>
        <circle cx="86" cy="48" r="8" fill="#2b2723"/>
        ${eyes([[47, 62], [73, 62]], 6, m, { lid: '#f4efe6' })}
        <ellipse cx="60" cy="88" rx="17" ry="11" fill="#f2c4bd" stroke="${INK}" stroke-width="2.5"/>
        <ellipse cx="53" cy="85" rx="2.4" ry="3" fill="${INK}"/><ellipse cx="67" cy="85" rx="2.4" ry="3" fill="${INK}"/>
        ${mouth(60, 93, 6, m)}
        ${extras(m, { sweat: [92, 70], blush: [40, 80, 74] })}`;
    },
    namazu(m) {
      const quake = m === 'smug' ? `<path d="M30 26 l5 -6 l5 6 l5 -6 l5 6 M70 22 l5 -6 l5 6 l5 -6 l5 6" fill="none" stroke="#e3b04b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` : '';
      return `
        ${quake}
        <path d="M12 72 Q12 40 58 40 Q98 40 102 66 L116 54 L114 88 L100 78 Q92 100 58 100 Q12 100 12 72 Z" fill="#6f8b99" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M22 82 Q58 100 94 84 Q78 96 58 96 Q34 96 22 82 Z" fill="#c9d6dc"/>
        <path d="M30 76 Q12 82 6 98 M34 79 Q22 92 22 110" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
        ${eyes([[38, 58], [58, 55]], 6, m, { lid: '#6f8b99' })}
        ${mouth(40, 76, 10, m)}
        ${extras(m, { sweat: [76, 40], blush: [30, 66, 68] })}`;
    },
    kagami(m) {
      return `
        <path d="M50 98 L45 114 H75 L70 98 Z" fill="#8a5a2b" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
        <circle cx="60" cy="56" r="43" fill="#c9a24a" stroke="${INK}" stroke-width="3"/>
        <circle cx="60" cy="56" r="34" fill="#bcd7df" stroke="${INK}" stroke-width="2"/>
        <path d="M36 42 Q42 30 54 27" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".8"/>
        <circle cx="60" cy="14" r="4" fill="#e3c06a" stroke="${INK}" stroke-width="2"/>
        <circle cx="19" cy="56" r="4" fill="#e3c06a" stroke="${INK}" stroke-width="2"/>
        <circle cx="101" cy="56" r="4" fill="#e3c06a" stroke="${INK}" stroke-width="2"/>
        ${eyes([[48, 56], [72, 56]], 6, m, { lid: '#bcd7df' })}
        ${mouth(60, 72, 8, m)}
        ${extras(m, { sweat: [84, 36], blush: [42, 78, 68] })}`;
    },
    bekibouzu(m) {
      const brow = m === 'happy' ? '' : `<path d="M36 56 L53 63 M84 56 L67 63" stroke="#dfe9e6" stroke-width="5" stroke-linecap="round"/>`;
      return `
        <path d="M20 104 V62 a40 46 0 0 1 80 0 V104 Z" fill="#2f5257" stroke="${INK}" stroke-width="3"/>
        <ellipse cx="44" cy="30" rx="10" ry="5" fill="#fff" opacity=".22"/>
        ${brow}
        ${eyes([[46, 72], [74, 72]], 7, m, { lid: '#2f5257' })}
        ${m === 'norm' || m === 'smug' ? `<path d="M50 92 L60 86 L70 92" fill="none" stroke="#dfe9e6" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>` : mouth(60, 90, 9, m, { stroke: '#dfe9e6' })}
        <path d="M0 102 Q15 92 30 102 T60 102 T90 102 T120 102 V120 H0 Z" fill="#2c6e8a" stroke="${INK}" stroke-width="2.5"/>
        <path d="M8 110 q6 -4 12 0 M48 112 q6 -4 12 0 M88 110 q6 -4 12 0" fill="none" stroke="#bfe2ee" stroke-width="2" stroke-linecap="round"/>
        ${extras(m, { sweat: [92, 42], blush: [36, 84, 84] })}`;
    },
    karakasa(m) {
      return `
        <path d="M60 78 V104" stroke="#8a5a2b" stroke-width="6" stroke-linecap="round"/>
        <path d="M50 106 H70 Q75 110 70 114 H50 Q45 110 50 106 Z" fill="#8a5a2b" stroke="${INK}" stroke-width="2.5"/>
        <path d="M60 8 L106 76 Q60 66 14 76 Z" fill="#c8552b" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M60 8 L37 71 M60 8 L83 71 M60 8 L60 68" stroke="#7e2a10" stroke-width="2"/>
        ${eyes([[60, 44]], 10, m, { lid: '#c8552b' })}
        <path d="M54 58 Q60 78 66 58 Z" fill="#e0607a" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
        <g transform="rotate(16 82 52)">
          <rect x="75" y="38" width="15" height="28" rx="1" fill="#f4eedf" stroke="${INK}" stroke-width="2"/>
          <path d="M82.5 43 V61 M79 47 H86" stroke="#c8352b" stroke-width="2"/>
        </g>
        ${extras(m, { sweat: [36, 40], blush: [44, 76, 56] })}`;
    },
    obariyon(m) {
      return `
        <path d="M32 64 Q14 44 22 24" fill="none" stroke="#7f8f47" stroke-width="10" stroke-linecap="round"/>
        <path d="M88 64 Q106 44 98 24" fill="none" stroke="#7f8f47" stroke-width="10" stroke-linecap="round"/>
        <ellipse cx="44" cy="110" rx="10" ry="5" fill="#7f8f47" stroke="${INK}" stroke-width="2.5"/>
        <ellipse cx="76" cy="110" rx="10" ry="5" fill="#7f8f47" stroke="${INK}" stroke-width="2.5"/>
        <ellipse cx="60" cy="74" rx="35" ry="34" fill="#a3b265" stroke="${INK}" stroke-width="3"/>
        <ellipse cx="60" cy="90" rx="18" ry="13" fill="#e2e8c4"/>
        <path d="M52 42 Q60 26 68 42" fill="#7f8f47" stroke="${INK}" stroke-width="2.5"/>
        ${eyes([[47, 66], [73, 66]], 9, m, { lid: '#a3b265' })}
        ${mouth(60, 86, 6, m)}
        ${extras(m, { sweat: [92, 54], blush: [36, 84, 80] })}`;
    },
    noppera(m) {
      const face = m === 'happy'
        ? blush(46, 74, 60)
        : m === 'meek' ? sweat(82, 32) : m === 'shock' ? `<path d="M50 52 l6 -4 M70 52 l-6 -4" stroke="${INK}" stroke-width="2.5" stroke-linecap="round" opacity=".5"/>` : '';
      return `
        <path d="M24 116 Q28 80 60 78 Q92 80 96 116 Z" fill="#2f3b5e" stroke="${INK}" stroke-width="3"/>
        <path d="M50 80 L60 98 L70 80" fill="none" stroke="#f1e9d6" stroke-width="4"/>
        <ellipse cx="60" cy="48" rx="26" ry="32" fill="#f2ebdf" stroke="${INK}" stroke-width="3"/>
        ${face}
        <g transform="translate(94 72) rotate(14)">
          <path d="M-6 14 L-12 30" stroke="#8a5a2b" stroke-width="4" stroke-linecap="round"/>
          <ellipse rx="14" ry="17" fill="#f7d9a8" stroke="${INK}" stroke-width="2.5"/>
          <circle cx="-5" cy="-4" r="2.4" fill="${INK}"/><circle cx="5" cy="-4" r="2.4" fill="${INK}"/>
          <path d="M-6 6 Q0 11 6 6" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>
        </g>`;
    }
  };

  function yokai(id, mood, opt) {
    opt = opt || {};
    const fn = DRAW[id];
    if (!fn) return '';
    const cls = 'yk yk-' + id + (opt.silhouette ? ' is-silhouette' : '') + (opt.cls ? ' ' + opt.cls : '');
    const label = opt.label ? ` role="img" aria-label="${opt.label}"` : ' aria-hidden="true"';
    return `<svg class="${cls}" viewBox="0 0 120 120"${label}>${fn(mood || 'norm')}</svg>`;
  }

  // ツッコミ担当（あなた）
  function you(mood, opt) {
    opt = opt || {};
    const m = mood || 'norm';
    return `<svg class="you-svg${opt.cls ? ' ' + opt.cls : ''}" viewBox="0 0 120 120" aria-hidden="true">
      <path d="M32 116 L40 80 H80 L88 116 Z" fill="#1d6a50" stroke="${INK}" stroke-width="3"/>
      <path d="M52 80 L60 100 L68 80" fill="none" stroke="#f1e9d6" stroke-width="5"/>
      <path d="M36 98 H48 M72 98 H84" stroke="#f1e9d6" stroke-width="2.5" opacity=".7"/>
      <circle cx="58" cy="54" r="26" fill="#f3d2b3" stroke="${INK}" stroke-width="3"/>
      <path d="M32 50 Q34 26 58 26 Q84 26 84 52 Q74 38 58 40 Q42 40 32 50 Z" fill="#2b2420"/>
      <path d="M32 44 Q58 34 84 44 L84 51 Q58 41 32 51 Z" fill="#c8552b" stroke="${INK}" stroke-width="2"/>
      <path d="M32 46 L22 40 M32 48 L24 54" stroke="#c8552b" stroke-width="4" stroke-linecap="round"/>
      ${eyes([[49, 58], [67, 58]], 4.5, m === 'smug' ? 'norm' : m, { lid: '#f3d2b3' })}
      ${mouth(58, 68, 6, m === 'shock' ? 'happy' : m)}
      <g class="harisen">
        <path d="M80 92 Q94 86 98 72" fill="none" stroke="#f3d2b3" stroke-width="7" stroke-linecap="round"/>
        <g transform="translate(98 70) rotate(-28)">
          <path d="M-3 0 L-12 -40 L12 -40 L3 0 Z" fill="#f6f1e4" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
          <path d="M-6 -40 L-1.5 0 M0 -40 L0 0 M6 -40 L1.5 0" stroke="${INK}" stroke-width="1.3" opacity=".55"/>
          <rect x="-4" y="-4" width="8" height="8" rx="2" fill="#c8552b" stroke="${INK}" stroke-width="1.8"/>
        </g>
      </g>
    </svg>`;
  }

  function mic() {
    return `<svg class="mic-svg" viewBox="0 0 40 120" aria-hidden="true">
      <path d="M20 40 V114" stroke="#a3a9ad" stroke-width="3.5"/>
      <path d="M8 115 H32" stroke="#a3a9ad" stroke-width="5" stroke-linecap="round"/>
      <rect x="12" y="16" width="16" height="26" rx="8" fill="#3a3f45" stroke="#a3a9ad" stroke-width="2"/>
      <path d="M14 24 H26 M14 30 H26 M14 36 H26" stroke="#7d858b" stroke-width="1.5"/>
    </svg>`;
  }

  function omikujiBox() {
    return `<svg class="mikuji-svg" viewBox="0 0 120 170" aria-hidden="true">
      <rect class="mikuji-stick" x="56" y="6" width="8" height="40" rx="2" fill="#efe1bf" stroke="${INK}" stroke-width="2"/>
      <path d="M30 34 L40 24 H80 L90 34 Z" fill="#cf9259" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <ellipse cx="60" cy="29" rx="6" ry="2.6" fill="${INK}"/>
      <path d="M30 34 H90 L100 44 V150 L90 160 H30 L20 150 V44 Z" fill="#b5713a" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M44 34 V160 M76 34 V160" stroke="#8a5226" stroke-width="2.2"/>
      <rect x="47" y="56" width="26" height="84" fill="#f4eedf" stroke="${INK}" stroke-width="2"/>
      <path d="M47 62 H73 M47 134 H73" stroke="#c8352b" stroke-width="2"/>
      <text x="60" y="81" text-anchor="middle" class="mikuji-label">お</text>
      <text x="60" y="97" text-anchor="middle" class="mikuji-label">み</text>
      <text x="60" y="113" text-anchor="middle" class="mikuji-label">く</text>
      <text x="60" y="129" text-anchor="middle" class="mikuji-label">じ</text>
    </svg>`;
  }

  window.KY_ART = { yokai, you, mic, omikujiBox };
})();
