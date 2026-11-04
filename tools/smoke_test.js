// 勝ち筋ラボの動作確認（Playwright）。
//   1) この端末だけに保存するモード（window.claude なし）
//   2) Claudeの中で開いたときのモード（共有DB・AIを模擬）
// 使い方:  python3 tools/build_standalone.py && node tools/smoke_test.js [screenshot_dir]
const path = require("path");
const { chromium } = require("playwright");

const FILE = "file://" + path.resolve(__dirname, "..", "dist", "kachisuji-lab.html");
const SHOTS = process.argv[2] || null;

// ---- Claude の実行環境を模擬（db / user / sample） ----
function installMock() {
  const store = {};
  const listeners = {};
  const emit = (c) => {
    const docs = Object.entries(store[c] || {}).map(([id, body]) => ({ id, exists: true, data: () => JSON.parse(JSON.stringify(body)), metadata: { fromCache: false, hasPendingWrites: false } }));
    (listeners[c] || []).forEach((fn) => fn({ docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: { fromCache: false, hasPendingWrites: false } }));
  };
  const db = {
    collection(c) {
      return {
        onSnapshot(next) { (listeners[c] = listeners[c] || []).push(next); setTimeout(() => emit(c), 5); return () => {}; },
        doc(id) {
          return {
            async set(body) { (store[c] = store[c] || {})[id] = body; setTimeout(() => emit(c), 1); },
            async delete() { if (store[c]) delete store[c][id]; setTimeout(() => emit(c), 1); }
          };
        }
      };
    }
  };
  const user = {
    async id() { return "u_test"; },
    async can() { return true; },
    async profiles(ids) { const o = {}; [].concat(ids).forEach((i) => { o[i] = { id: i, name: i === "u_test" ? "テスト利用者" : "" }; }); return o; }
  };
  const reply = (prompt) => {
    const p = typeof prompt === "string" ? prompt : prompt.map((t) => t.content).join("\n");
    if (p.includes("商談前ブリーフ")) return { summary: "テスト会社は管理職の世代交代期にある。", hypotheses: [{ issue: "新任管理職の立ち上がり", evidence: "「管理職の若返りを進める」", confidence: "中", question: "新任課長の最初の1年で、何に一番困っていますか？" }, { issue: "現場リーダーの育成", evidence: "公開情報からは不明", confidence: "低", question: "現場リーダーの育成は誰が担っていますか？" }], series: { id: "s1", name: "フリーレン×サーバント・リーダーシップ", why: "支える型のリーダー像が合う", angle: "引っ張るより支える管理職" }, opener: "案内役の〇〇です。", avoid: ["他社批判"], factcheck: ["従業員数"], goal: "個別相談の約束" };
    if (p.includes("勝ち筋の仮説")) return { stuck: "初回商談から2回目で止まっている。", hypotheses: [{ who: "300〜999名の製造業", what: "管理職・リーダーシップ", entry: "ウェビナー", evidence: "1件中1件", confidence: "低" }], bets: [{ company: "テスト製作所", why: "課題が明確", who_joins: "パートナー講師" }], missing: ["2回目に進まなかった理由"] };
    if (p.includes("講評してください")) return { scores: { mitate: 3, taito: 2, teian: 3, shinrai: 4 }, summary: "質問は良い。", good: ["相手の言葉を繰り返した"], improve: ["次の約束が曖昧"], try: "来週の個別相談、30分いただけますか。" };
    if (p.includes("同じ話")) return { consistent: false, summary: "架電と初回商談で言い方が違う。", drifts: [{ phase: "初回商談", issue: "課題の言い方が変わる", fix: "架電と同じ言葉を使う" }] };
    return "（テスト応答）お忙しいところすみません、人事の者です。";
  };
  const sample = async (input, opts) => {
    const r = reply(input); const text = typeof r === "string" ? r : JSON.stringify(r);
    await new Promise((res) => setTimeout(res, 20));
    if (opts && opts.onText) opts.onText({ text, delta: text });
    return { text, truncated: false, modelTierApplied: "quick" };
  };
  sample.json = async (input) => { await new Promise((res) => setTimeout(res, 20)); const r = reply(input); return typeof r === "string" ? { text: r } : r; };
  window.claude = { use: async (name) => ({ db, user, sample })[name] || null };
}

async function run() {
  const browser = await chromium.launch();
  const failures = [];
  const check = (cond, msg) => { if (!cond) failures.push(msg); console.log((cond ? "ok   " : "FAIL ") + msg); };

  for (const mode of ["local", "claude"]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error" && !/fonts\.g/.test(m.text())) errors.push(m.text()); });
    if (mode === "claude") await page.addInitScript(installMock);
    await page.goto(FILE);
    await page.waitForTimeout(400);
    console.log(`\n== ${mode} ==`);
    check((await page.textContent("#mode")).includes(mode === "claude" ? "チームで共有中" : "この端末"), `${mode}: 保存先の表示`);
    check((await page.textContent("#h-base")).includes("12,504"), `${mode}: これまで（11/1資料）の数字`);

    // 振り返りを1件記録
    await page.click("text=＋ 振り返りを記録");
    await page.fill("#f-company", "テスト製作所");
    await page.selectOption("#f-stage", "4");
    await page.fill("#f-next", "講師同席の個別相談に誘う");
    await page.fill("#f-due", "2026-11-27");
    await page.selectOption("#f-size", "300〜999名");
    await page.selectOption("#f-entry", "ウェビナー・登壇");
    await page.check("#f-venue");
    await page.fill("#f-pain", "課長になるとプレイヤーに戻ってしまう");
    await page.fill("#f-questions", "他社の実績は？");
    await page.click("#deal-form button[type=submit]");
    await page.waitForTimeout(150);
    // 止まった記録を1件（記録の画面から）
    await page.goto(FILE + "#records"); await page.waitForTimeout(200);
    await page.click("[data-act=new-deal] >> nth=0");
    await page.fill("#f-company", "サンプル商事");
    await page.selectOption("#f-stage", "3");
    await page.selectOption("#f-status", "stopped");
    await page.selectOption("#f-reason", "予算・時期が合わない");
    await page.click("#deal-form button[type=submit]");
    await page.waitForTimeout(150);
    await page.goto(FILE + "#home"); await page.waitForTimeout(200);
    check((await page.textContent("#h-funnel")).includes("2回目"), `${mode}: ファネルが出る`);
    check((await page.textContent("#h-next")).includes("テスト製作所"), `${mode}: 次の一手に出る`);
    check((await page.textContent("#h-reasons")).includes("予算・時期が合わない"), `${mode}: 止まった理由`);
    await page.click("[data-cmp=venue]");
    check((await page.textContent("#h-cmp")).includes("信頼の場を経由"), `${mode}: 信頼の場で比べる`);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${mode}-home.png`, fullPage: true });

    await page.goto(FILE + "#records"); await page.waitForTimeout(300);
    check((await page.textContent("#r-retro")).includes("1／46"), `${mode}: 振り返り 1／46`);
    check((await page.textContent("#r-list")).includes("サンプル商事"), `${mode}: 記録の一覧`);
    await page.fill("#r-q", "テスト"); await page.waitForTimeout(250);
    check(!(await page.textContent("#r-list")).includes("サンプル商事"), `${mode}: 検索で絞り込める`);

    for (const r of ["brief", "story", "practice", "about"]) {
      await page.goto(FILE + "#" + r); await page.waitForTimeout(250);
      check((await page.locator("#view h1").count()) === 1, `${mode}: ${r} 画面が開く`);
    }

    if (mode === "claude") {
      // ブリーフ
      await page.goto(FILE + "#brief"); await page.waitForTimeout(300);
      await page.fill("#b-company", "テスト製作所");
      await page.fill("#b-info", "中期経営計画：管理職の若返りを進める。".repeat(6));
      await page.click("[data-act=run-brief]"); await page.waitForTimeout(300);
      check((await page.textContent("#brief-out")).includes("新任課長の最初の1年"), "claude: ブリーフの質問が出る");
      check(await page.isDisabled("[data-act=check-brief]"), "claude: 確かめる前は確認済みにできない");
      for (const cb of await page.$$("[data-bcheck]")) await cb.check();
      check(!(await page.isDisabled("[data-act=check-brief]")), "claude: すべて確かめると確認済みにできる");
      await page.click("[data-act=check-brief]"); await page.waitForTimeout(200);
      check((await page.textContent("#b-list")).includes("確認済み"), "claude: 保存したブリーフに確認済み");
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/claude-brief.png`, fullPage: true });
      // 社内説明の1枚
      await page.click("[data-bmode=onepager]"); await page.waitForTimeout(150);
      const opt = await page.$$eval("#op-deal option", (os) => os.map((o) => o.value).filter(Boolean)[0]);
      await page.selectOption("#op-deal", opt);
      await page.click("[data-act=run-onepager]"); await page.waitForTimeout(200);
      check((await page.inputValue("#op-text")).length > 0, "claude: 社内説明の1枚の下書き");
      // 勝ち筋
      await page.goto(FILE + "#home"); await page.waitForTimeout(300);
      await page.click("[data-act=run-insight]"); await page.waitForTimeout(400);
      check((await page.textContent("#h-insight")).includes("勝負案件"), "claude: 勝ち筋の仮説");
      // ストーリー
      await page.goto(FILE + "#story"); await page.waitForTimeout(300);
      await page.click("[data-act=edit-series][data-id=s1]");
      await page.fill("#s-core", "引っ張るより支える。部下の成長を待つ時間が組織を強くする。");
      await page.click("#series-form button[type=submit]"); await page.waitForTimeout(150);
      await page.click("[data-act=open-cell][data-s=s1][data-p=call]");
      await page.click("[data-act=run-cell]"); await page.waitForTimeout(200);
      check((await page.inputValue("#c-text")).length > 0, "claude: トークの下書き");
      await page.click("[data-act=save-cell]"); await page.waitForTimeout(150);
      check((await page.textContent("#mx")).includes("下書き"), "claude: マトリクスに下書き");
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/claude-story.png`, fullPage: true });
      // 練習
      await page.goto(FILE + "#practice"); await page.waitForTimeout(300);
      await page.click("[data-act=start-practice]"); await page.waitForTimeout(250);
      for (const msg of ["案内役の者です。先日お送りした記事はお読みいただけましたか。", "新任の課長さんで、困っていることはありますか。"]) {
        await page.fill("#p-input", msg); await page.click("[data-act=send-practice]"); await page.waitForTimeout(200);
      }
      await page.click("[data-act=feedback-practice]"); await page.waitForTimeout(400);
      check((await page.textContent("#p-chat")).includes("次に試す一言"), "claude: 講評が出る");
      check((await page.textContent("#p-log")).includes("テスト利用者"), "claude: 練習の記録に名前");
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/claude-practice.png`, fullPage: true });
    }

    // 狭い画面で横にはみ出さないか
    await page.setViewportSize({ width: 390, height: 844 });
    for (const r of ["home", "records", "brief", "story", "practice", "about"]) {
      await page.goto(FILE + "#" + r); await page.waitForTimeout(250);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(over <= 0, `${mode}: ${r} 390px幅で横にはみ出さない（${over}px）`);
      if (SHOTS && mode === "claude" && (r === "home" || r === "records")) await page.screenshot({ path: `${SHOTS}/${mode}-${r}-mobile.png`, fullPage: true });
    }
    check(errors.length === 0, `${mode}: コンソールエラーなし ${errors.join(" | ")}`);
    await page.close();
  }
  await browser.close();
  console.log(failures.length ? `\n${failures.length} failed` : "\nall passed");
  process.exit(failures.length ? 1 : 0);
}
run().catch((e) => { console.error(e); process.exit(1); });
