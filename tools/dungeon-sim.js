// 별의 던전 자동 플레이 시뮬레이션: node tools/dungeon-sim.js [inf|real] [캐릭터] [방어구]  (최종 세팅 + 피하지 않고 붙어서 때리는 봇)
const { chromium } = require('playwright');
const MODE = process.argv[2] || 'real';   // real: 실제 체력 / inf: 무한 체력으로 시간·피해 측정
const CHAR = process.argv[3] || 'archmage', ARM = process.argv[4] || 'dragon';
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/../index.html'); await p.waitForTimeout(300);
  await p.evaluate(([CHAR, ARM, MODE]) => {
    state.sword = 125; state.best = 125; state.mlv = 200; state.traits = { str: 20, vit: 20, dex: 10, luck: 20 };
    for (const z of [...ZONES, ...ZONES2]) state.bossKills[z.key] = 1;
    for (const c of CHARS) { state.chars[c.key] = true; state.charLv[c.key] = 10; }
    state.char = CHAR; for (const id in TREE) state.tree[id] = true;
    for (const sl of ARMOR_SLOTS) { const id = armorId(sl.key, ARM); state.armor.owned[id] = 20; state.armor.equip[sl.key] = id; }
    state.skills = { frenzy: 5, drain: 5, whirl: 5, crit: 5, bomb: 5, thunder: 5, dash: 5, guard: 5, swift: 5 };
    state.equip = ['frenzy', 'drain', 'whirl', 'crit', 'bomb'].slice(0, slotCount()).concat([null, null, null, null, null]).slice(0, 5);
    commit(); showTab('hunt'); enterZone('dungeon2'); pause();
    window.SIM = { t: 0, stageT: {}, dmg: {}, realMax: run.p.max, deaths: 0, log: [] };
    if (MODE === 'inf') run.p.max = run.p.hp = SIM.realMax * 1e4;
    const o = hurtPlayer; hurtPlayer = (d, e) => { const h = run.p.hp, r = o(d, e); const st = run.dungeon.stage; SIM.dmg[st] = (SIM.dmg[st] || 0) + Math.max(0, h - run.p.hp); return r; };
  }, [CHAR, ARM, MODE]);
  console.log('세팅', await p.evaluate(() => ({ 공격력: run.atk, 체력: SIM.realMax, 스킬칸: slotCount(), 트리: JSON.stringify(Object.fromEntries(Object.entries(run.tree).filter(([k, v]) => v && typeof v === 'number'))) })));
  for (let chunk = 0; chunk < 400; chunk++) {
    const r = await p.evaluate(() => {
      for (let f = 0; f < 600; f++) {
        if (!run || run.over) return 'over';
        const P = run.p, tg = run.mobs.filter(m => !m.dead).sort((a, b) => (b.boss - a.boss) || Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0];
        keys.clear();
        if (tg) { const d = Math.hypot(tg.x - P.x, tg.y - P.y), want = tg.r + 28;
          if (d > want + 4) { if (tg.x > P.x + 4) keys.add('right'); if (tg.x < P.x - 4) keys.add('left'); if (tg.y > P.y + 4) keys.add('down'); if (tg.y < P.y - 4) keys.add('up'); } }
        for (let i = 0; i < 5; i++) useSkill(i);
        castUlt(); if (run.dragon) { dragonSkill(0); dragonSkill(1); }
        const st = run.dungeon.stage; SIM.stageT[st] = (SIM.stageT[st] || 0) + 1 / 60;
        update(1 / 60); SIM.t += 1 / 60;
      }
      return 'run';
    });
    if (r === 'over') break;
  }
  const res = await p.evaluate(() => ({ cleared: !!run?.dungeon?.cleared, stage: run?.dungeon?.stage, over: run?.over, t: Math.round(SIM.t), stageT: SIM.stageT, dmg: SIM.dmg, realMax: SIM.realMax, names: DUNGEON2.bosses.map(b => b.name), hp: Math.round(run.p.hp) }));
  console.log(`결과 [${MODE} · ${CHAR} · ${ARM}] 클리어 ${res.cleared} · 도달 ${res.stage}/10 · 총 ${res.t}초`);
  for (const k of Object.keys(res.stageT)) console.log(`  ${k}. ${res.names[k - 1] ?? '-'}: ${res.stageT[k].toFixed(1)}초, 받은 피해 최대체력의 ${((res.dmg[k] || 0) / res.realMax).toFixed(2)}배`);
  console.log(errs.slice(0, 3)); await b.close(); })();
