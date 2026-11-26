// 월드 3 스테이지 자동 플레이: node tools/stage-sim.js [strong|mid|base] [inf|real] [장] [스테이지...]
// 봇: 보스·정예·보물 요정 우선으로 붙어서 때림. 돌파는 출구로, 방어는 등불 근처의 몹부터. 피하지 않음.
const { chromium } = require('playwright');
const BUILD = process.argv[2] || 'mid', MODE = process.argv[3] || 'inf', CH = +(process.argv[4] || 1);
const ONLY = process.argv.slice(5).map(Number);
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]));
  await p.goto('file://' + __dirname + '/../index.html'); await p.waitForTimeout(300);
  const n = await p.evaluate(ch => W3_STAGES[ch].length, CH);
  for (let s = 1; s <= n; s++) {
    if (ONLY.length && !ONLY.includes(s)) continue;
    const r = await p.evaluate(async ([BUILD, MODE, CH, s]) => {
      state.dungeon2Clears = 1; state.sword = W3_CH[CH - 1].cap.sword; state.mlv = 200; for (let c = 1; c < CH; c++) state.w3.best[c + '-10'] = 1;
      for (const z of [...ZONES, ...ZONES2]) state.bossKills[z.key] = 1;
      state.traits = BUILD === 'strong' ? { str: 20, vit: 20, dex: 10, luck: 20 } : BUILD === 'mid' ? { str: 10, vit: 10, dex: 0, luck: 0 } : { str: 0, vit: 0, dex: 0, luck: 0 };
      state.tree = {}; const nodes = Object.values(TREE).sort((a, b) => a.d - b.d);
      for (const nd of nodes.slice(0, BUILD === 'strong' ? 100 : BUILD === 'mid' ? 50 : 0)) state.tree[nd.id] = true;
      state.armor.owned = {}; state.armor.equip = { head: null, body: null, feet: null };
      if (BUILD !== 'base') for (const sl of ARMOR_SLOTS) { const id = armorId(sl.key, BUILD === 'strong' ? 'dragon' : 'fire'); state.armor.owned[id] = 20; state.armor.equip[sl.key] = id; }
      state.char = BUILD === 'strong' ? 'archmage' : BUILD === 'mid' ? 'demon' : 'adventurer'; state.chars[state.char] = true; state.charLv[state.char] = 10;
      state.skills = { frenzy: 5, drain: 5, whirl: 5, crit: 5, bomb: 5 };
      state.equip = ['frenzy', 'drain', 'whirl', 'crit', 'bomb', null];
      showTab('hunt'); enterZone(`w3:${CH}:${s}`); pause(); dev.god = false;
      const realMax = run.p.max; let dmg = 0;
      if (MODE === 'inf') run.p.max = run.p.hp = realMax * 1e5;
      const o = hurtPlayer; hurtPlayer = (d, e) => { const h = run.p.hp, rr = o(d, e); dmg += Math.max(0, h - run.p.hp); return rr; };
      let f = 0;
      for (; f < 60 * 240 && !run.over; f++) {
        const P = run.p, S = run.stage, mobs = run.mobs.filter(m => !m.dead && !(m.ghost > 0));
        const score = m => (m.boss || m.elite || m.kind === 'mTreasure' ? -1e4 : 0) + Math.hypot(m.x - P.x, m.y - P.y) + (S.crystal ? Math.hypot(m.x - S.crystal.x, m.y - S.crystal.y) * 0.5 : 0);
        let goal = null;
        if (S.exit) { const g = S.gates[S.gate]; goal = g ? { x: g.x, y: g.y, want: 0 } : { x: S.exit.x, y: S.exit.y, want: 0 }; }
        else { const tg = mobs.sort((a, b) => score(a) - score(b))[0]; if (tg) goal = { x: tg.x, y: tg.y, want: tg.r + 26 }; else if (S.crystal) goal = { x: S.crystal.x, y: S.crystal.y + 30, want: 0 }; }
        keys.clear();
        if (goal) { const d = Math.hypot(goal.x - P.x, goal.y - P.y); if (d > goal.want + 4) { if (goal.x > P.x + 4) keys.add('right'); if (goal.x < P.x - 4) keys.add('left'); if (goal.y > P.y + 4) keys.add('down'); if (goal.y < P.y - 4) keys.add('up'); } }
        for (let i = 0; i < 5; i++) useSkill(i);
        castUlt(); castAwake();
        if (run.p.charmT > 0 && f % 6 === 0) charmTap();
        update(1 / 60);
      }
      hurtPlayer = o;
      const S = run.stage;
      const out = { s, name: run.zone.name, type: S.def.type, t: S.t, clear: !!S.result, stars: S.result?.stars, fail: S.fail || (run.over && !S.result ? '쓰러짐' : run.over ? '' : '시간 초과'), dmg: dmg / realMax, hp: realMax };
      if (!run.over) endRun(false);
      run = null;
      return out;
    }, [BUILD, MODE, CH, s]);
    console.log(`${r.name.padEnd(12)} [${r.type}] ${r.clear ? `클리어 ★${r.stars}` : `실패(${r.fail})`} ${r.t.toFixed(0)}초 · 받은 피해 최대체력의 ${r.dmg.toFixed(1)}배 (체력 ${r.hp})`);
  }
  if (errs.length) console.log('errors', errs.slice(0, 4));
  await b.close(); })();
