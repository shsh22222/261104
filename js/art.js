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

  // 心の状態の妖怪
  DRAW.nurarihyon = function (m) {
    return `
      <path d="M26 116 Q28 86 60 84 Q92 86 94 116 Z" fill="#4b4766" stroke="${INK}" stroke-width="3"/>
      <path d="M48 86 L60 104 L72 86" fill="none" stroke="#e9e2cf" stroke-width="4"/>
      <path d="M34 72 Q26 44 40 22 Q58 0 82 12 Q98 26 90 56 Q88 82 62 86 Q40 86 34 72 Z" fill="#f0d6b8" stroke="${INK}" stroke-width="3"/>
      <ellipse cx="56" cy="20" rx="9" ry="4" fill="#fff" opacity=".45" transform="rotate(-24 56 20)"/>
      <path d="M44 56 Q50 52 56 56 M66 56 Q72 52 78 56" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" opacity=".6"/>
      ${eyes([[50, 64], [72, 64]], 5, m, { lid: '#f0d6b8' })}
      ${mouth(61, 76, 7, m)}
      <g transform="translate(96 98)">
        <path d="M-10 -8 H10 L8 8 H-8 Z" fill="#7a9a6a" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M-5 -13 q3 -4 0 -8 M3 -13 q3 -4 0 -8" stroke="#cfc6b0" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      </g>
      ${extras(m, { sweat: [92, 40], blush: [42, 80, 72] })}`;
  };
  DRAW.enenra = function (m) {
    return `
      <path d="M58 104 q-10 8 -2 16" fill="none" stroke="#9c96ae" stroke-width="6" stroke-linecap="round"/>
      <path d="M30 96 Q12 96 13 80 Q14 64 28 63 Q24 44 44 40 Q50 22 70 26 Q90 20 96 42 Q114 46 108 64 Q118 80 102 88 Q96 102 80 96 Q72 110 58 104 Q48 114 36 106 Q22 106 30 96 Z" fill="#b4aec4" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M30 80 q8 -8 16 0 M84 46 q8 -6 14 2 M70 92 q8 6 16 -2" fill="none" stroke="#e4e0ec" stroke-width="3" stroke-linecap="round" opacity=".85"/>
      ${eyes([[50, 64], [74, 64]], 6.5, m, { lid: '#b4aec4' })}
      ${mouth(62, 80, 7, m)}
      ${extras(m, { sweat: [96, 52], blush: [42, 82, 74] })}`;
  };

  // 福をよぶ妖怪
  DRAW.zashiki = function (m) {
    return `
      <path d="M30 116 Q32 84 60 82 Q88 84 90 116 Z" fill="#c8352b" stroke="${INK}" stroke-width="3"/>
      <path d="M40 92 Q48 98 44 108 M80 92 Q72 98 76 108" fill="none" stroke="#f3c2b3" stroke-width="2.5" stroke-linecap="round" opacity=".8"/>
      <rect x="40" y="98" width="40" height="8" rx="1" fill="#e3b04b" stroke="${INK}" stroke-width="2"/>
      <path d="M50 84 L60 98 L70 84" fill="none" stroke="#f6f0e1" stroke-width="4"/>
      <circle cx="60" cy="58" r="26" fill="#f6e2cc" stroke="${INK}" stroke-width="3"/>
      <path d="M32 66 Q29 30 60 29 Q91 30 88 66 L80 66 L80 49 Q60 44 40 49 L40 66 Z" fill="#1f1a17"/>
      ${eyes([[51, 62], [69, 62]], 4.2, m === 'smug' ? 'happy' : m, { lid: '#f6e2cc' })}
      ${mouth(60, 72, 5, m === 'smug' ? 'happy' : m)}
      ${blush(45, 75, 69)}
      <g transform="translate(96 98)">
        <circle r="10" fill="#f6f0e1" stroke="${INK}" stroke-width="2"/>
        <path d="M-10 0 H10 M0 -10 V10 M-7 -7 L7 7 M7 -7 L-7 7" stroke="#c8352b" stroke-width="2"/>
      </g>
      ${extras(m, { sweat: [86, 42] })}`;
  };

  // 茶碗（一服）
  function chawan() {
    return `<svg class="chawan-svg" viewBox="0 0 200 170" aria-hidden="true">
      <g class="steam" fill="none" stroke="#e9e7f3" stroke-width="4" stroke-linecap="round">
        <path class="s1" d="M80 56 q-10 -14 0 -26 q10 -12 0 -24"/>
        <path class="s2" d="M100 50 q-10 -14 0 -26 q10 -12 0 -24"/>
        <path class="s3" d="M120 56 q-10 -14 0 -26 q10 -12 0 -24"/>
      </g>
      <circle class="cup-aura" cx="100" cy="110" r="84"/>
      <path d="M28 82 Q30 146 100 148 Q170 146 172 82 Z" fill="#3f5d4f" stroke="#8d97c4" stroke-width="3"/>
      <path d="M40 118 Q100 132 160 118" fill="none" stroke="#5f8a6e" stroke-width="3" opacity=".7"/>
      <rect x="78" y="146" width="44" height="10" rx="3" fill="#2f463b" stroke="#8d97c4" stroke-width="2"/>
      <ellipse cx="100" cy="82" rx="72" ry="15" fill="#2f463b" stroke="#8d97c4" stroke-width="3"/>
      <ellipse class="tea" cx="100" cy="84" rx="62" ry="10" fill="#8db255"/>
      <ellipse class="ripple" cx="100" cy="84" rx="20" ry="3.5" fill="none" stroke="#d8eab4" stroke-width="2"/>
      <path class="down" d="M100 96 V138" stroke="var(--night-accent)" stroke-width="4" stroke-linecap="round" stroke-dasharray="4 8"/>
    </svg>`;
  }

  // お囃子の楽器
  function instrument(id) {
    const L = '#e9e7f3';
    const parts = {
      taiko: `<ellipse cx="30" cy="16" rx="20" ry="7" fill="#f3e3c3" stroke="${L}" stroke-width="2"/><path d="M10 16 V40 Q30 50 50 40 V16" fill="#8a3a22" stroke="${L}" stroke-width="2"/><path d="M14 22 V40 M46 22 V40" stroke="#e3b04b" stroke-width="2" stroke-dasharray="2 4"/>`,
      kane: `<path d="M30 6 V12" stroke="${L}" stroke-width="2.5"/><path d="M14 40 Q14 14 30 12 Q46 14 46 40 Z" fill="#c9a24a" stroke="${L}" stroke-width="2"/><path d="M10 40 H50" stroke="${L}" stroke-width="3" stroke-linecap="round"/><circle cx="30" cy="46" r="4" fill="#c9a24a" stroke="${L}" stroke-width="2"/>`,
      shami: `<rect x="17" y="30" width="26" height="22" rx="4" fill="#f3e3c3" stroke="${L}" stroke-width="2"/><path d="M30 30 V2" stroke="#6b4524" stroke-width="5" stroke-linecap="round"/><path d="M27 4 H33" stroke="${L}" stroke-width="2"/><path d="M27 6 V48 M30 6 V48 M33 6 V48" stroke="#2b2420" stroke-width=".8"/>`,
      fue: `<rect x="4" y="24" width="52" height="8" rx="4" fill="#8a5a2b" stroke="${L}" stroke-width="2"/><circle cx="18" cy="28" r="1.8" fill="#1b1712"/><circle cx="26" cy="28" r="1.8" fill="#1b1712"/><circle cx="34" cy="28" r="1.8" fill="#1b1712"/><circle cx="42" cy="28" r="1.8" fill="#1b1712"/><path d="M8 24 V32 M50 24 V32" stroke="#c8352b" stroke-width="2"/>`
    };
    return `<svg class="inst-svg" viewBox="0 0 60 56" aria-hidden="true">${parts[id] || ''}</svg>`;
  }

  // ねこ（後ろ姿・月あかりの縁どり）
  function cat() {
    const C = '#191b26', R = '#cdbd92';
    return `<svg class="cat-svg" viewBox="0 0 120 120" aria-hidden="true">
      <path class="cat-tail" d="M84 110 Q110 108 106 84 Q104 74 95 76" fill="none" stroke="${R}" stroke-width="10" stroke-linecap="round"/>
      <path class="cat-tail" d="M84 110 Q110 108 106 84 Q104 74 95 76" fill="none" stroke="${C}" stroke-width="6" stroke-linecap="round"/>
      <path d="M32 118 Q26 84 46 70 Q60 62 74 70 Q94 84 88 118 Z" fill="${C}" stroke="${R}" stroke-width="2"/>
      <g class="cat-ears">
        <path d="M44 50 L45 28 L59 42 Z" fill="${C}" stroke="${R}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M76 50 L75 28 L61 42 Z" fill="${C}" stroke="${R}" stroke-width="2" stroke-linejoin="round"/>
      </g>
      <circle cx="60" cy="56" r="19" fill="${C}" stroke="${R}" stroke-width="2"/>
    </svg>`;
  }

  // 考え（ネズミ）
  function mouse() {
    return `<svg class="mouse-svg" viewBox="0 0 60 40" aria-hidden="true">
      <path d="M8 30 Q0 30 2 22" fill="none" stroke="#9a96a6" stroke-width="2" stroke-linecap="round"/>
      <ellipse cx="26" cy="27" rx="17" ry="11" fill="#b9b4c6" stroke="${INK}" stroke-width="2"/>
      <circle cx="40" cy="16" r="6" fill="#d8d3e2" stroke="${INK}" stroke-width="2"/>
      <circle cx="45" cy="24" r="2" fill="${INK}"/>
      <circle cx="52" cy="28" r="2.4" fill="#e7a1ad"/>
    </svg>`;
  }

  // 灯籠（川に流す）
  function toro() {
    return `<svg class="toro-svg" viewBox="0 0 48 60" aria-hidden="true">
      <path d="M4 14 L24 4 L44 14 Z" fill="#3a2a1c" stroke="#1b1712" stroke-width="1.5" stroke-linejoin="round"/>
      <rect x="9" y="14" width="30" height="30" fill="#ffd38a" stroke="#3a2a1c" stroke-width="2"/>
      <path d="M24 14 V44" stroke="#e7b05c" stroke-width="1.2"/>
      <rect x="5" y="44" width="38" height="6" rx="1" fill="#3a2a1c"/>
    </svg>`;
  }

  // すわる人（ハラに灯す）
  function seated(opt) {
    opt = opt || {};
    const mini = !!opt.mini;
    const spots = mini ? '' : `
      <g class="spots">
        <circle class="spot" data-part="face" cx="100" cy="70" r="30"/>
        <ellipse class="spot" data-part="eyes" cx="100" cy="64" rx="44" ry="13"/>
        <g class="spot" data-part="ears"><circle cx="66" cy="72" r="11"/><circle cx="134" cy="72" r="11"/></g>
        <g class="spot" data-part="hands"><circle cx="76" cy="194" r="16"/><circle cx="124" cy="194" r="16"/></g>
        <ellipse class="spot" data-part="shoulders" cx="100" cy="122" rx="46" ry="14"/>
        <ellipse class="spot" data-part="feet" cx="100" cy="226" rx="70" ry="12"/>
        <rect class="spot" data-part="room" x="6" y="6" width="188" height="228" rx="20"/>
      </g>
      <circle class="hara-light" cx="100" cy="174" r="12"/>
      <g class="fog" aria-hidden="true">
        <circle cx="66" cy="40" r="20"/><circle cx="92" cy="22" r="22"/><circle cx="124" cy="28" r="20"/>
        <circle cx="140" cy="56" r="16"/><circle cx="58" cy="70" r="14"/><circle cx="112" cy="10" r="14"/>
      </g>`;
    const line = '#8d97c4';
    return `<svg class="seated-svg${mini ? ' mini' : ''}" viewBox="0 0 200 240" aria-hidden="true">
      <path d="M58 212 Q54 150 74 124 Q86 108 100 106 Q114 108 126 124 Q146 150 142 212 Z" fill="#2c3350" stroke="${line}" stroke-width="2.5"/>
      <path d="M26 222 Q40 194 100 198 Q160 194 174 222 Q160 236 100 234 Q40 236 26 222 Z" fill="#262c45" stroke="${line}" stroke-width="2.5"/>
      <path d="M74 140 Q66 176 76 194 M126 140 Q134 176 124 194" fill="none" stroke="${line}" stroke-width="2.5" stroke-linecap="round"/>
      <ellipse cx="76" cy="196" rx="13" ry="7" fill="#2c3350" stroke="${line}" stroke-width="2.5"/>
      <ellipse cx="124" cy="196" rx="13" ry="7" fill="#2c3350" stroke="${line}" stroke-width="2.5"/>
      <circle cx="100" cy="70" r="30" fill="#2c3350" stroke="${line}" stroke-width="2.5"/>
      ${mini ? '<circle cx="100" cy="174" r="11" fill="#ffd38a"/>' : ''}
      ${spots}
    </svg>`;
  }

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

  window.KY_ART = { yokai, you, mic, omikujiBox, cat, mouse, toro, seated, chawan, instrument };
})();
