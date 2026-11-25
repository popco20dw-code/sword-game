// 사냥터 자동 플레이 시뮬레이션: node tools/zone-sim.js <세팅> [inf|real] [사냥터키...]
// 세팅: strong = 검=권장 단계, 스킬 트리 전부, 용린 +15, 전설 Lv5, 특성 최대
//       mid    = 검=권장 단계, 스킬 트리 절반(가까운 노드부터), 영웅 방어구 +10, 에픽 Lv5, 특성 절반
//       base   = 검=권장 단계, 트리·방어구 없음, 모험가
// 봇은 가장 가까운 적(보스 우선)에게 붙어서 때리고 스킬을 쿨마다 쓴다. 피하지 않는다.
const { chromium } = require('playwright');
const BUILD = process.argv[2] || 'strong', MODE = process.argv[3] || 'inf';
const KEYS = process.argv.slice(4);
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/../index.html'); await p.waitForTimeout(300);
  const keys = KEYS.length ? KEYS : await p.evaluate(() => ZONES2.map(z => z.key));
  const rows = [];
  for (const key of keys) {
    const r = await p.evaluate(async ([key, BUILD, MODE]) => {
      const z = ZONES2.find(x => x.key === key);
      for (const zz of [...ZONES, ...ZONES2]) state.bossKills[zz.key] = 1;
      state.sword = z.rec; state.mlv = 200;
      state.traits = BUILD === 'strong' ? { str: 20, vit: 20, dex: 10, luck: 20 } : BUILD === 'mid' ? { str: 10, vit: 10, dex: 0, luck: 0 } : { str: 0, vit: 0, dex: 0, luck: 0 };
      state.tree = {};
      const nodes = Object.values(TREE).sort((a, b) => a.d - b.d);
      const n = BUILD === 'strong' ? nodes.length : BUILD === 'mid' ? 50 : 0;
      for (const nd of nodes.slice(0, n)) state.tree[nd.id] = true;
      state.armor.owned = {}; state.armor.equip = { head: null, body: null, feet: null };
      if (BUILD !== 'base') for (const sl of ARMOR_SLOTS) { const id = armorId(sl.key, BUILD === 'strong' ? 'dragon' : 'fire'); state.armor.owned[id] = BUILD === 'strong' ? 15 : 10; state.armor.equip[sl.key] = id; }
      state.char = BUILD === 'strong' ? 'archmage' : BUILD === 'mid' ? 'demon' : 'adventurer';
      state.chars[state.char] = true; state.charLv[state.char] = 5;
      state.skills = { frenzy: 5, drain: 5, whirl: 5, crit: 5, bomb: 5 };
      state.equip = ['frenzy', 'drain', 'whirl', 'crit', 'bomb'].slice(0, slotCount()).concat([null, null, null, null, null]).slice(0, 5);
      showTab('hunt'); enterZone(key); pause(); dev.god = false;
      const realMax = run.p.max; let dmgM = 0, dmgB = 0, tM = 0, tB = 0, deaths = 0, bossSeen = false, bossDead = false;
      if (MODE === 'inf') run.p.max = run.p.hp = realMax * 1e5;
      const o = hurtPlayer; hurtPlayer = (d, e) => { const h = run.p.hp, rr = o(d, e); const lost = Math.max(0, h - run.p.hp); if (bossSeen) dmgB += lost; else dmgM += lost; return rr; };
      for (let f = 0; f < 60 * 240 && !bossDead; f++) {
        if (run.over) { deaths++; break; }
        const P = run.p, tg = run.mobs.filter(m => !m.dead).sort((a, b) => (b.boss - a.boss) || Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0];
        keys.clear();
        if (tg) { const d = Math.hypot(tg.x - P.x, tg.y - P.y), want = tg.r + 28;
          if (d > want + 4) { if (tg.x > P.x + 4) keys.add('right'); if (tg.x < P.x - 4) keys.add('left'); if (tg.y > P.y + 4) keys.add('down'); if (tg.y < P.y - 4) keys.add('up'); } }
        for (let i = 0; i < 5; i++) useSkill(i);
        castUlt();
        const hadBoss = run.mobs.some(m => m.boss && !m.dead);
        if (hadBoss) bossSeen = true;
        if (bossSeen) tB += 1 / 60; else tM += 1 / 60;
        update(1 / 60);
        if (bossSeen && !run.mobs.some(m => m.boss && !m.dead) && (state.bossKills[key] || 0) > 1) bossDead = true;
      }
      hurtPlayer = o;
      const out = { zone: z.name, rec: z.rec, atk: run.atk, hp: realMax, mobT: tM, bossT: tB, dmgM: dmgM / realMax, dmgB: dmgB / realMax, died: deaths > 0 || run.over, bossDead };
      if (!run.over) endRun(false); run = null;
      return out;
    }, [key, BUILD, MODE]);
    rows.push(r);
    console.log(`${r.zone.padEnd(8)} +${r.rec} 공격력 ${r.atk.toExponential(1)} 체력 ${r.hp} | 몹 20마리 ${r.mobT.toFixed(0)}초 (피해 ${r.dmgM.toFixed(1)}배) | 보스 ${r.bossDead ? r.bossT.toFixed(0) + '초' : '못 잡음'} (피해 ${r.dmgB.toFixed(1)}배)${MODE === 'real' ? (r.died ? ' · 쓰러짐' : ' · 생존') : ''}`);
  }
  if (errs.length) console.log('errors', errs.slice(0, 3));
  await b.close(); })();
