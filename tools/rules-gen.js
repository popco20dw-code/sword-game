// 패치노트의 '현재 규칙과 수치' 칸을 게임 데이터에서 다시 만든다.
// 사용: node tools/rules-gen.js   (index.html을 읽어서 patch-notes.html의 <section id="rules">를 바꿈)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + path.join(ROOT, 'index.html')); await p.waitForTimeout(500);
  const html = await p.evaluate(() => {
    const M = k => k === 'runes' ? '룬석' : matName(k);
    const num = n => n >= 1e12 ? (n / 1e12).toLocaleString('ko-KR', { maximumFractionDigits: 2 }) + '조' : n >= 1e8 ? (n / 1e8).toLocaleString('ko-KR', { maximumFractionDigits: 1 }) + '억' : n >= 1e4 ? (n / 1e4).toLocaleString('ko-KR', { maximumFractionDigits: 0 }) + '만' : n.toLocaleString('ko-KR');
    const row = cells => `<tr>${cells.map(c => typeof c === 'number' || /^[+\d.·/ %,-]+$/.test(String(c)) ? `<td class="num">${c}</td>` : `<td>${c}</td>`).join('')}</tr>`;
    const table = (head, rows) => `<div class="tablewrap"><table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(row).join('')}</tbody></table></div>`;
    const matsTxt = a => a && a.length ? a.map(([k, n]) => `${M(k)} ${n}`).join(' + ') : '없음';
    const tiers = (item, max) => { const out = []; for (let lv = 0; lv < max; lv += 5) out.push(lv); return out; };
    const S = ITEMS.sword, P = ITEMS.pick;
    let out = `<section id="rules" class="rules" aria-labelledby="h-rules">\n    <h2 id="h-rules">현재 규칙과 수치 (${GAME_VERSION} 기준)</h2>\n`;

    // 검
    out += `<div class="rule"><h3>검 강화</h3><p>강화 비용은 +20까지 단계마다 1.3배, +20~34는 1.2배, +35부터 1.1배. 재료는 시도할 때 소모되지만 실패하면 ${MAT_REFUND}% 확률로 돌려받음. 실패할 때마다 다음 성공 확률 +${PITY_STEP}%p (성공하거나 파괴되면 0으로, 곡괭이도 같음). 판매가는 그 단계 강화 비용 × (2 + 0.1 × 단계). 지금 최고 단계는 <b>+${S.max} ${S.names[tierIndex(S.max, S)]}</b> (최종 +${S.max}).</p>` +
      table(['지금 단계', '이름', '성공 / 유지 / 하락 / 파괴 (%)', '1회 재료'], tiers(S, S.max).map(lv => [`+${lv}~${lv + 4}`, S.names[tierIndex(lv, S)], S.odds(lv).join(' / '), matsTxt(S.mats(lv))])) + `</div>`;
    // 곡괭이
    out += `<div class="rule"><h3>곡괭이와 광산</h3><p>곡괭이는 +${P.max}까지, 파괴 없음. 비용은 +15까지 1.4배, +35까지 1.2배, 그 뒤 1.35배. 돌 하나당 골드 ${MINE_GOLD} × 1.2<sup>단계</sup> (손으로 캘 때 ×${MINE_HAND}, 캘 때마다 돌이 다른 자리로 옮겨 감), ${VEIN_CHANCE}% 황금 광맥(${VEIN_MULT}배). 보석 확률: 루비 3%(+5부터, 단계당 +0.2%p) · 다이아 1.5%(+10부터, +0.1%p) · 별의 파편 0.5%(+15부터, +0.05%p), +35부터는 단계마다 그 두 배씩 더. 룬석은 +${RUNE_REQ}부터. 광부 최대 ${MINER_MAX}명, 게임을 닫아도 최대 ${OFFLINE_CAP / 3600}시간. 자동 클릭은 1초 ${AC_MAX_PER_SEC}번까지, 기계처럼 일정하면 광산 잠금(30초부터 두 배씩).</p>` +
      table(['곡괭이 단계', '이름', '성공 / 유지 / 하락 (%)', '1회 재료'], tiers(P, P.max).map(lv => [`+${lv}~${lv + 4}`, P.names[tierIndex(lv, P)], P.odds(lv).slice(0, 3).join(' / '), matsTxt(P.mats?.(lv))])) +
      `<p>보석 합성: 루비 10개 또는 다이아몬드 4개 → 별의 파편 1개.</p></div>`;
    // 월드 1
    const hard = Object.values(HARD_DMG);
    out += `<div class="rule"><h3>사냥터 · 월드 1</h3><p>공격력 = 8 × 1.17<sup>검 단계</sup>, 체력 = 100 + 6 × 검 단계 (+ 방어구). 몹 ${BOSS_EVERY}마리마다 보스 (잡으면 보스 재료 1~5개, 월드 2도 같음). 뇌운 봉우리부터는 몹 공격력 ×${hard.slice(0, 3).join('·×')}, 체력 ×${HARD_HP}. <b>용의 둥지 킹 드래곤을 잡으면 월드 2가 열림.</b></p>` +
      table(['사냥터', '권장', '일반 몹', '보스 → 재료', '보스 별의 파편', '몹 드롭 % (루비·다이아·별·룬석)'], ZONES.map(z => [z.name, '+' + z.rec, [z.mob, z.alt].filter(Boolean).map(m => m.name).join(', '), `${z.boss.name ?? DUNGEON.bosses.find(x => x.kind === z.boss.kind)?.name} → ${M(z.boss.mat)}`, zoneStars(z), `${z.drops.ruby} · ${z.drops.diamond} · ${z.drops.star} · ${z.rune}`])) + `</div>`;
    // 월드 2
    out += `<div class="rule"><h3>사냥터 · 월드 2</h3><p>사냥터 하나가 검 5단계를 담당. 표의 기본 수치에 몹·보스 체력 ×${W2_HP}, 공격력 ×${W2_DMG}, 여기에 사냥터 보스는 체력 ×${W2_BOSS_HP}·공격력 ×${W2_BOSS_DMG}, 일반 몹은 체력 ×${W2_MOB_HP}·공격력 ×${W2_MOB_DMG}. 보스는 체력 50% 아래에서 분노해 기술이 강해지고, 같은 기술을 연달아 쓰지 않음. 독은 지속 피해 + 중독 중 회복 절반.</p>` +
      table(['사냥터', '권장', '지형', '일반 몹', '보스 → 재료', '보스 별의 파편', '몹 드롭 %'], ZONES2.map(z => [z.name, '+' + z.rec, z.feature, [z.mob, z.alt].filter(Boolean).map(m => m.name).join(', '), `${z.boss.name} → ${M(z.boss.mat)}`, zoneStars(z), `${z.drops.ruby} · ${z.drops.diamond} · ${z.drops.star} · ${z.rune}`])) + `</div>`;
    // 던전
    const P2 = DUNGEON2_PRIZE;
    out += `<div class="rule"><h3>별의 던전 (월드 2)</h3><p>별의 균열 보스를 잡으면 열림. 권장 +${DUNGEON2.rec}. 월드 2 보스 9마리(검 +125 기준으로 다시 맞춤: 체력 ${num(DUNGEON2.bosses[0].hp)}~${num(DUNGEON2.bosses[8].hp)}, 공격력 ${DUNGEON2.bosses[0].dmg}~${DUNGEON2.bosses[8].dmg}) + 숨은 보스 별을 삼킨 자 · 진(체력 ${num(DUNGEON2.bosses[9].hp)}, 공격력 ${DUNGEON2.bosses[9].dmg}). 보상은 모두 잡아야 한꺼번에: ${num(P2.gold)} G · 별의 파편 ${P2.mats.star} · 룬석 ${P2.runes} · 월드 2 보스 재료 각 3(별의 핵 5). 클리어 목표가 두 번째 엔딩.</p></div>`;
    const P1 = DUNGEON_PRIZE, extra = Object.entries(P1.mats).filter(([k, v]) => k !== 'star' && v > 2).map(([k, v]) => `${M(k)} ${v}`);
    out += `<div class="rule"><h3>보스 던전 (월드 1 추가 콘텐츠, 권장 +${DUNGEON.rec})</h3><p>보스 9마리 연전, 잡을 때마다 체력 30% 회복. 몹 공격력 ×${HARD_DMG.dungeon}. <b>보상은 모두 잡아야 한꺼번에:</b> ${num(P1.gold)} G · 별의 파편 ${P1.mats.star} · 룬석 ${P1.runes} · 보스 재료 각 2${extra.length ? ' · ' + extra.join(' · ') : ''}. 도중에 쓰러지면 보상 없음. 보스 연습은 보상 없음.</p>` +
      table(['순서', '보스', '체력', '공격력'], DUNGEON.bosses.map((x, i) => [i + 1, x.name, num(x.hp), x.dmg])) + `</div>`;
    // 월드 3
    out += `<div class="rule"><h3>월드 3 · 무너진 차원 (스테이지)</h3><p>별의 던전을 클리어하면 열림. 장의 10스테이지를 모두 깨면 다음 장이 열림. 각 스테이지 ★ 클리어 · ★ 체력 50% 이상 · ★ 제한 시간. <b>상한 동기화</b>: 장마다 검·방어구·캐릭터 레벨 상한(넘는 검 단계는 1단계당 공격력 +1%, 최대 +15%), 스킬 트리 효과 절반. <b>차원 각인</b>: 월드 3 별 1개 = 1점, 월드 3 안에서만 적용(${MARKS.flat().length}칸, 줄마다 ${MARK_COST.join('·')}점). 4장은 졸음·수면, 5장 최종 보스 아르케는 5막 연속·부활 금지. 미로 스테이지는 거울벽 미로와 번갈아 닫히는 거울문, 제한 시간 있음. 방어 스테이지 몹은 나와 수정 중 가까운 쪽을 노림. 일반 스테이지 몹은 체력 ×${W3_NORMAL_HP}·공격력 ×${W3_NORMAL_DMG}. 첫 클리어: 별의 파편·룬석·강화석 8·소울 40 (보스 스테이지 뽑기권 1). 보스 스테이지는 매번 그 장 보스 재료 1~5개(10스테이지 +2) · 뽑기권 25%. 장 별 상자: ${W3_CHESTS.map(c => '★' + c.need + ' ' + c.text).join(' · ')}.</p>` +
      table(['장', '상한 (검·방어구·캐릭터)', '장 보스 → 재료'], W3_CH.map(c => [`${c.n}장 ${c.name}`, `+${c.cap.sword} · +${c.cap.armor} · Lv ${c.cap.char}`, `${W3_MOB[W3_STAGES[c.n][9].boss].name} → ${M(c.mat)}`])) +
      table(['스테이지', '종류', '설명', '★★★ 시간'], W3_CH.flatMap(c => W3_STAGES[c.n].map((d, i) => [`${c.n}-${i + 1} ${d.name}`, W3_TYPES[d.type][1], d.desc, d.par + '초']))) + `</div>`;
    // 방어구
    out += `<div class="rule"><h3>방어구</h3><p>망자의 묘지 암흑사신을 잡으면 열림. 상점 → 방어구 뽑기(별의 파편 ${GACHA_COST}개, 10회 ${GACHA_COST * 10}개)로 얻고 대장간에서 장착·강화(+${ARMOR_MAX}까지, 파괴 없음, +5부터 하락). 뽑을 때마다 강화석 ${PULL_STONES}개, 중복은 강화석으로. 강화 비용: 강화석 (3 + 2 × 단계) × (1 + 0.25 × (별 − 1)) + 종류별 재료. 기본 체력: ${ARMOR_SLOTS.map(s => s.name + ' ' + s.hp).join(' · ')} × 종류 배율 × (1 + 0.05 × 단계). 성공 확률 +0~4 80% · +5~9 60% · +10~14 45% · +15~19 30%.</p>` +
      table(['등급', '종류', '뽑기 % (부위별)', '체력 배율', '강화 재료', '중복 강화석', `효과 (+0 → +${ARMOR_MAX})`], ARMOR_TYPES.map(t => [`${'★'.repeat(t.stars)} ${t.grade}`, t.pre.trim(), `${t.rate} (${+(t.rate / 3).toFixed(2)})`, '×' + t.hpMul, t.mat ? '강화석 + ' + M(t.mat) : '강화석만', t.dup,
        ARMOR_BONUS[t.key] ? ARMOR_BONUS[t.key].txt(ARMOR_BONUS[t.key].v(0)) + ' → ' + ARMOR_BONUS[t.key].txt(ARMOR_BONUS[t.key].v(ARMOR_MAX)) + (t.key === 'dragon' ? ` (세트: 보스 피해 +${DRAGON_SET_BOSS}%)` : '')
          : t.key === 'rune' ? '스킬 재사용 −10% (세트: 스킬 칸 +1)' : t.key === 'star' ? '세트: 1회 부활' : ['fire', 'ice', 'bolt'].includes(t.key) ? '부위별 속성 효과' : '체력만'])) +
      `\n      <div class="tablewrap"><table><thead><tr><th>종류</th><th>투구</th><th>갑옷</th><th>신발</th></tr></thead><tbody><tr><td>화염</td><td>불 피해·화상 25%(+2%/단계) 감소</td><td>때린 적 화상 3초 (공격력 30%/초 +3%/단계)</td><td>지나간 자리에 불길 (40%/초 +4%/단계)</td></tr><tr><td>얼음</td><td>얼음 피해·빙결·둔화 25%+ 감소</td><td>때린 적 이동·공격 속도 −30%(+1.5%/단계)</td><td>얼음 장판: 몹 이동 −35%(+1.5%/단계)</td></tr><tr><td>뇌전</td><td>번개 피해·기절 25%+ 감소</td><td>피해를 입으면 연쇄 번개 3마리(+1/5단계)</td><td>이동 속도 +8%(+0.5%/단계)</td></tr><tr><td>별</td><td>3부위 세트: 사냥마다 1회 부활</td><td></td><td></td></tr><tr><td>룬</td><td>부위마다 스킬 재사용 −10%</td><td>3부위 세트: 스킬 칸 +1</td><td></td></tr></tbody></table></div></div>`;
    // 캐릭터
    out += `<div class="rule"><h3>캐릭터</h3><p>캐릭터는 뽑기로만 얻어요. 뽑기권: 보스 처치 시 월드 1 ${ZONES.map(z => z.name + ' ' + ticketPct(z) + '%').join(' · ')} · 월드 2 ${ticketPct(ZONES2[0])}%, 던전 클리어 1장. 못 받은 보스의 확률(%)이 쌓여 ${TICKET_PITY}이 되면 확정. 소울로 Lv ${CHAR_MAX}까지 강화.</p>` +
      table(['결과', '확률'], [['전설 캐릭터 (열린 전설 한 명당)', LEGEND_RATE + '%'], ...CPULL.map(([k, v]) => [{ epicChar: '에픽 캐릭터', commonChar: '일반 캐릭터', epicShard: '에픽 조각 1~2', commonShard: '일반 조각 1~3' }[k], v + '%']), ['소울 20~60', '나머지']]) +
      table(['캐릭터', '등급', 'Lv 1', `Lv ${CHAR_MAX}`], CHARS.map(c => [c.name + (c.lockText ? ` (${c.lockText})` : ''), CHAR_TIER[c.tier].name, c.desc(1), c.desc(CHAR_MAX)])) + `</div>`;
    // 스킬
    out += `<div class="rule"><h3>스킬 (Lv 1 → Lv 5)</h3><p>룬석으로 배우고 강화. 장착 2칸(사기꾼 3칸, 룬 세트 +1). 폭탄·낙뢰는 보스에게 ${BOSS_AOE * 100}%, 회전 베기·돌진 베기·가시 갑옷은 ${BOSS_SKILL * 100}%.</p>` +
      table(['스킬', '종류', 'Lv 1', 'Lv 5'], SKILLS.map(s => [s.name, s.active ? '액티브' : '패시브', s.desc(1), s.desc(5)])) + `</div>`;
    // 스킬 트리
    out += `<div class="rule"><h3>스킬 트리 (노드 ${Object.keys(TREE).length}개, 룬석 ${Object.values(TREE).reduce((a, n) => a + treeCost(n), 0).toLocaleString('ko-KR')}개면 전부)</h3><p>사냥터 → 스킬 트리. 가운데 '시작'에서 다섯 방향으로 뻗은 하나의 그물 트리(이웃 방향끼리 다리로 연결). 배운 노드와 이어진 노드만 배울 수 있음. 값 = 16 × 1.3<sup>고리−1</sup> (★ 큰 능력 ×4, ⚠ 대가 ×0.5). 방향마다 큰 능력 2개(4·8번째 고리), 바로 앞의 대가를 지나야 닿음. 초기화하면 룬석 전부 돌려받음.</p>` +
      table(['방향', '고리', '종류', '효과', '룬석'], Object.values(TREE).sort((x, y) => TREE_BRANCHES.indexOf(x.br) - TREE_BRANCHES.indexOf(y.br) || x.d - y.d || x.x - y.x).map(n => [n.br.name, n.d, n.major ? '★ ' + n.major : n.kind === 'curse' ? '⚠ 대가' : '', nodeDesc(n), treeCost(n)])) + `</div>`;
    // 상점
    out += `<div class="rule"><h3>상점 아이템</h3>${table(['아이템', '가격', '효과'], SHOP.map(w => [w.name, num(w.price) + ' G', w.desc]))}</div>\n  </section>`;
    return out;
  });
  await b.close();
  const P = path.join(ROOT, 'patch-notes.html');
  let s = fs.readFileSync(P, 'utf8');
  const i = s.indexOf('<section id="rules"'), j = s.indexOf('</section>', i) + '</section>'.length;
  if (i < 0) throw new Error('rules section not found');
  s = s.slice(0, i) + html.trim() + s.slice(j);
  fs.writeFileSync(P, s);
  console.log('patch-notes.html 규칙 칸을 다시 만들었어요 (' + html.length + '자)');
})();
