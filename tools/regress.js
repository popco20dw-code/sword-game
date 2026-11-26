// 전체 회귀 테스트: 사냥터·보스·던전·뽑기·캐릭터·궁극기를 빠르게 돌려 보고 에러가 없는지 확인
// 사용: node tools/regress.js   (끝에 'errors []'가 나오면 통과)
const { chromium, devices } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ ...devices['Pixel 7'] })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]));
  await p.goto('file://' + path.join(__dirname, '..', 'index.html')); await p.waitForTimeout(400);
  console.log('버전', await p.evaluate(() => GAME_VERSION));
  await p.evaluate(() => { dev.god = true; state.sword = 125; for (const z of [...ZONES, ...ZONES2]) state.bossKills[z.key] = 1; for (const c of CHARS) state.chars[c.key] = true; commit(); showTab('hunt'); });
  // 모든 사냥터: 몹과 보스가 나오고 보스를 잡을 수 있는지
  for (const zk of await p.evaluate(() => [...ZONES, ...ZONES2].map(z => z.key))) {
    const z = { key: zk };
    const r = await p.evaluate(async key => {
      enterZone(key); run.kills = 999;
      for (let i = 0; i < 60 && !run.mobs.some(m => m.boss); i++) await new Promise(r => setTimeout(r, 100));
      await new Promise(r => setTimeout(r, 1500));
      const bs = run.mobs.filter(m => m.boss);
      for (const m of bs) { m.ghost = 0; m.mode = m.mode === 'under' ? 'chase' : m.mode; m.hp = 1; hit(m, 1, null); }
      await new Promise(r => setTimeout(r, 300));
      const out = [bs.map(m => m.kind).join('+') || '보스 없음', run.mobs.length];
      endRun(false); run = null; return out;
    }, z.key);
    console.log(z.key.padEnd(9), r.join(' · '));
  }
  // 던전 두 곳: 잠깐 진행
  for (const k of ['dungeon', 'dungeon2']) {
    const r = await p.evaluate(async k => {
      const z = k === 'dungeon' ? DUNGEON : DUNGEON2; enterZone(z.key);
      for (let i = 0; i < 30; i++) { await new Promise(r => setTimeout(r, 100)); for (const m of run.mobs) if (m.boss && !m.dead) { m.ghost = 0; m.hp = 1; hit(m, 1, null); } }
      const st = run.dungeon?.stage; endRun(false); run = null; return st;
    }, k);
    console.log(k, '진행 단계', r);
  }
  // 월드 3 스테이지 10개: 잠깐씩 돌려 보기
  for (let st = 1; st <= 50; st++) {
    const r = await p.evaluate(async st => { state.dungeon2Clears = 1; for (let c = 1; c <= 4; c++) state.w3.best[c + '-10'] = 1; enterZone(`w3:${Math.ceil(st / 10)}:${(st - 1) % 10 + 1}`); pause(); castAwake();
      for (let i = 0; i < 60 * 6; i++) { if (run.over) break; update(1 / 60); } draw();
      const out = run.zone.name + ' ' + stageHud(run); if (!run.over) endRun(false); run = null; return out; }, st);
    if (st % 10 === 0) console.log('월드 3', r);
  }
  // 캐릭터마다 사냥 + 궁극기
  for (const c of await p.evaluate(() => CHARS.map(c => c.key))) {
    await p.evaluate(async k => { useChar(k); enterZone('desert'); await new Promise(r => setTimeout(r, 900)); castUlt(); if (run.dragon) { dragonSkill(0); dragonSkill(1); }
      await new Promise(r => setTimeout(r, 1200)); endRun(false); run = null; }, c);
  }
  console.log('캐릭터', (await p.evaluate(() => CHARS.length)) + '명 궁극기·패시브 실행');
  // 뽑기
  console.log('방어구 뽑기', await p.evaluate(() => { gachaSkip = true; state.mats.star = 1e5; doGacha(10); $('gacha').hidden = true; return Object.keys(state.armor.owned).length; }));
  console.log('캐릭터 뽑기', await p.evaluate(() => { state.ctickets = 20; for (let i = 0; i < 20; i++) { $('cgacha').hidden = true; pullChar(); } $('cgacha').hidden = true; return [state.cpulls, state.souls]; }));
  // 저장·불러오기
  console.log('저장 왕복', await p.evaluate(() => { const a = JSON.stringify(state); const n = normalize(JSON.parse(a)); return n.sword === state.sword && Object.keys(n.armor.owned).length === Object.keys(state.armor.owned).length; }));
  for (const t of ['forge', 'mine', 'hunt', 'shop', 'friends']) await p.evaluate(t => showTab(t), t);
  console.log('errors', errs.slice(0, 8));
  await b.close();
  process.exit(errs.length ? 1 : 0);
})();
