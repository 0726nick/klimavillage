'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  LAND1, LAND2, PROD1, PROD2, CP_ACTIVITIES,
  getAllocatedCredit, GROUP_SIZE, type MemberRecord, type DayData,
} from '@/lib/constants'
import styles from './member.module.css'

// ── 빈 DayData ──────────────────────────────────────
const emptyDay = (): DayData => ({ land: null, productions: [], carbonPoints: [] })
const emptyRecord = (): MemberRecord['week1' | 'week2'] => ({ days: {} })

// ── 모둠 탄소 통계 계산 ──────────────────────────────
function calcGroupStats1(records: MemberRecord[], size: number) {
  let total = 0
  for (const r of records) {
    for (let d = 1; d <= 5; d++) {
      const dd = r.week1.days[d]
      if (!dd) continue
      if (dd.land) total += LAND1[dd.land]?.carbon ?? 0
      for (const i of dd.productions) total += PROD1[i]?.carbon ?? 0
    }
  }
  const limit = size >= 5 ? 200 : 160
  return { total, limit }
}

function calcGroupStats2(records: MemberRecord[], size: number) {
  const { total: w1Carbon } = calcGroupStats1(records, size)
  const allocCredit = getAllocatedCredit(w1Carbon, size)
  let gained = allocCredit, used = 0
  for (const r of records) {
    for (let d = 1; d <= 4; d++) {
      const dd = r.week2.days[d]
      if (!dd) continue
      if (dd.land) gained += LAND2[dd.land]?.credit ?? 0
      for (const i of dd.productions) used += PROD2[i]?.creditUsed ?? 0
    }
  }
  return { allocCredit, gained, used, w1Carbon }
}

export default function MemberPage() {
  const router  = useRouter()
  const params  = useParams()
  const group   = (params.group as string).toUpperCase()
  const name    = decodeURIComponent(params.name as string)

  const [week, setWeek]           = useState(1)
  const [w1Day, setW1Day]         = useState(1)
  const [w2Day, setW2Day]         = useState(1)
  const [myData, setMyData]       = useState<MemberRecord>({
    group, name,
    week1: emptyRecord(),
    week2: emptyRecord(),
  })
  const [groupRecords, setGroupRecords] = useState<MemberRecord[]>([])
  const [saving, setSaving]             = useState(false)

  // 모둠 크기는 고정값 사용 (A=5명, BCD=4명)
  const groupSize = GROUP_SIZE[group] ?? 4

  // ── 데이터 로드 ────────────────────────────────────
  const load = useCallback(async () => {
    // 내 데이터 — 없으면 빈 레코드로 생성(upsert)해서 다음 접속에도 유지
    const { data: myRow } = await supabase
      .from('activity_records')
      .select('week1, week2')
      .eq('group_id', group)
      .eq('name', name)
      .single()

    if (myRow) {
      // 기존 데이터 복원
      setMyData({ group, name, week1: myRow.week1, week2: myRow.week2 })
    } else {
      // 첫 접속: 빈 레코드를 DB에 생성해 둠
      const empty = { days: {} }
      await supabase.from('activity_records').upsert(
        { group_id: group, name, week1: empty, week2: empty },
        { onConflict: 'group_id,name' }
      )
    }

    // 모둠 전체 데이터
    const { data: allRows } = await supabase
      .from('activity_records')
      .select('name, week1, week2')
      .eq('group_id', group)

    const records: MemberRecord[] = (allRows || []).map((r: { name: string; week1: MemberRecord['week1']; week2: MemberRecord['week2'] }) => ({
      group, name: r.name, week1: r.week1, week2: r.week2,
    }))
    setGroupRecords(records)
  }, [group, name])

  useEffect(() => { load() }, [load])

  // ── 저장 ───────────────────────────────────────────
  async function save(newData: MemberRecord) {
    setSaving(true)
    await supabase.from('activity_records').upsert(
      { group_id: group, name, week1: newData.week1, week2: newData.week2 },
      { onConflict: 'group_id,name' }
    )
    setSaving(false)
    // 모둠 데이터도 갱신
    load()
  }

  // ── 토지 선택 ──────────────────────────────────────
  function selectLand(w: 1 | 2, land: string) {
    const day = w === 1 ? w1Day : w2Day
    const key = `week${w}` as 'week1' | 'week2'
    const nd = { ...myData }
    if (!nd[key].days[day]) nd[key].days[day] = emptyDay()
    nd[key].days[day].land = land
    setMyData(nd)
    save(nd)
  }

  // ── 생산활동 토글 ──────────────────────────────────
  function toggleProd(w: 1 | 2, idx: number) {
    const day = w === 1 ? w1Day : w2Day
    const key = `week${w}` as 'week1' | 'week2'
    const nd = { ...myData }
    if (!nd[key].days[day]) nd[key].days[day] = emptyDay()
    const arr = [...nd[key].days[day].productions]
    const i = arr.indexOf(idx)
    if (i === -1) arr.push(idx); else arr.splice(i, 1)
    nd[key].days[day].productions = arr
    setMyData(nd)
    save(nd)
  }

  // ── 탄소중립 포인트 토글 ───────────────────────────
  function toggleCp(idx: number) {
    const nd = { ...myData }
    if (!nd.week2.days[w2Day]) nd.week2.days[w2Day] = emptyDay()
    const arr = [...nd.week2.days[w2Day].carbonPoints]
    const i = arr.indexOf(idx)
    if (i === -1) arr.push(idx); else arr.splice(i, 1)
    nd.week2.days[w2Day].carbonPoints = arr
    setMyData(nd)
    save(nd)
  }

  // ── 개인 합계 계산 ─────────────────────────────────
  function myTotals1() {
    let lw = 0, pw = 0, carbon = 0
    for (let d = 1; d <= 5; d++) {
      const dd = myData.week1.days[d]; if (!dd) continue
      if (dd.land) { lw += LAND1[dd.land].wage; carbon += LAND1[dd.land].carbon }
      for (const i of dd.productions) { pw += PROD1[i].wage; carbon += PROD1[i].carbon }
    }
    return { lw, pw, carbon }
  }
  function myTotals2() {
    let lw = 0, pw = 0, cpw = 0, cg = 0, cu = 0
    for (let d = 1; d <= 4; d++) {
      const dd = myData.week2.days[d]; if (!dd) continue
      if (dd.land) { lw += LAND2[dd.land].wage; cg += LAND2[dd.land].credit }
      for (const i of dd.productions) { pw += PROD2[i].wage; cu += PROD2[i].creditUsed }
      for (const i of (dd.carbonPoints || [])) cpw += CP_ACTIVITIES[i].wage
    }
    return { lw, pw, cpw, cg, cu }
  }

  const gs1   = calcGroupStats1(groupRecords, groupSize)
  const gs2   = calcGroupStats2(groupRecords, groupSize)
  const t1    = myTotals1()
  const t2    = myTotals2()
  const pct1  = Math.min(100, Math.round(gs1.total / gs1.limit * 100))
  const pct2  = gs2.gained > 0 ? Math.min(100, Math.round(gs2.used / gs2.gained * 100)) : 0
  const bar1c = pct1 >= 90 ? '#e74c3c' : pct1 >= 70 ? '#f0a500' : '#4caf7d'
  const bar2c = pct2 >= 90 ? '#e74c3c' : pct2 >= 70 ? '#f0a500' : '#4caf7d'

  const curDay1 = myData.week1.days[w1Day] || emptyDay()
  const curDay2 = myData.week2.days[w2Day] || emptyDay()

  // 오늘 탄소포인트
  const todayCp = curDay2.carbonPoints.reduce((s, i) => s + CP_ACTIVITIES[i].wage, 0)
  const todayCpPts = curDay2.carbonPoints.reduce((s, i) => s + CP_ACTIVITIES[i].points, 0)

  return (
    <div className={styles.wrap}>
      <header className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => router.push(`/group/${group}`)}>← 모둠</button>
        <h1>{name}의 활동 기록</h1>
        <div className={styles.meta}>{group}모둠{saving ? ' · 저장 중…' : ''}</div>
      </header>

      <div className={styles.body}>
        {/* ── 주차 탭 ── */}
        <div className={styles.weekTabs}>
          <button className={`${styles.weekTab} ${week === 1 ? styles.activeTab1 : ''}`} onClick={() => setWeek(1)}>
            🏭 1주차<br /><small>경제성장시스템</small>
          </button>
          <button className={`${styles.weekTab} ${week === 2 ? styles.activeTab2 : ''}`} onClick={() => setWeek(2)}>
            🌿 2주차<br /><small>기후행동시스템</small>
          </button>
        </div>

        {/* ════════════════════════════════ 1주차 ═══ */}
        {week === 1 && (
          <div className={styles.fadeIn}>
            {/* 모둠 현황 */}
            <div className={styles.groupSummary1}>
              <h3>🏘️ 모둠 탄소배출 현황</h3>
              <div className={styles.gsGrid}>
                <Stat label="모둠 누적 배출량" val={`${gs1.total}g`} />
                <Stat label="종료 기준"         val={`${gs1.limit}g`} />
                <Stat label="남은 허용량"        val={`${Math.max(0, gs1.limit - gs1.total)}g`} />
              </div>
              <ProgressBar pct={pct1} color={bar1c} label={`${pct1}%`} />
            </div>

            {pct1 >= 100 && <Alert type="danger">🚨 모둠 누적 배출량이 종료 기준을 초과했습니다!</Alert>}
            {pct1 >= 80 && pct1 < 100 && <Alert type="warn">⚠️ 탄소배출량이 위험 수준에 가까워지고 있어요!</Alert>}

            {/* 일차 선택 */}
            <DayNav day={w1Day} max={5} onPrev={() => setW1Day(d => Math.max(1, d-1))} onNext={() => setW1Day(d => Math.min(5, d+1))} color="green" />

            {/* 토지 선택 */}
            <SectionCard icon="🏭" title="토지 선택">
              <div className={styles.landGrid}>
                {Object.entries(LAND1).map(([land, info]) => (
                  <div
                    key={land}
                    className={`${styles.landOption} ${curDay1.land === land ? styles.landSelected1 : ''}`}
                    onClick={() => selectLand(1, land)}
                  >
                    <div className={styles.landName}>{LAND1_EMOJI[land]} {land}</div>
                    <div className={styles.landStats}>
                      <span className={styles.wage}>토지임금: {info.wage}냥</span><br />
                      <span className={styles.carbon}>탄소배출: {info.carbon}g</span><br />
                      <span className={styles.cap}>정원 {info.capacity}명</span>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* 생산활동 */}
            <SectionCard icon="⚙️" title="생산 활동">
              <table className={styles.prodTable}>
                <thead>
                  <tr><th>수준</th><th>활동명</th><th>임금</th><th>탄소</th></tr>
                </thead>
                <tbody>
                  {PROD1.map((act, idx) => {
                    const checked = curDay1.productions.includes(idx)
                    return (
                      <tr key={idx} onClick={() => toggleProd(1, idx)} className={styles.prodRow}>
                        <td><LvBadge lv={act.level} /></td>
                        <td>
                          <div className={styles.actCheck}>
                            <div className={`${styles.checkBox} ${checked ? styles.checked1 : ''}`}>{checked ? '✓' : ''}</div>
                            <span>{act.name}<br /><small>{act.desc}</small></span>
                          </div>
                        </td>
                        <td className={styles.wage}>{act.wage}냥</td>
                        <td className={styles.carbon}>{act.carbon}g</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </SectionCard>

            {/* 일별 기록 */}
            <SectionCard icon="📊" title="일별 기록 요약">
              <DayRecords1 data={myData} today={w1Day} />
              <Ledger rows={[
                { label: '총 토지임금',    val: `${t1.lw}냥` },
                { label: '총 생산임금',    val: `${t1.pw}냥` },
                { label: '총 탄소배출량',  val: `${t1.carbon}g`, red: true },
                { label: '합계 임금',      val: `${t1.lw + t1.pw}냥`, bold: true },
              ]} />
            </SectionCard>
          </div>
        )}

        {/* ════════════════════════════════ 2주차 ═══ */}
        {week === 2 && (
          <div className={styles.fadeIn}>
            {/* 탄소배출권 배정 */}
            <div className={styles.creditAlloc}>
              <h3>🎟️ 모둠 탄소배출권 배정</h3>
              <div className={styles.caGrid}>
                <div className={styles.caItem}><div className={styles.caVal}>{gs2.w1Carbon}g</div><div className={styles.caLabel}>1주차 누적 배출량</div></div>
                <div className={styles.caItem}><div className={styles.caVal}>{gs2.allocCredit}g</div><div className={styles.caLabel}>배정된 탄소배출권</div></div>
              </div>
            </div>

            {/* 모둠 현황 */}
            <div className={styles.groupSummary2}>
              <h3>🏘️ 모둠 탄소배출권 현황</h3>
              <div className={styles.gsGrid}>
                <Stat label="모둠 총 배출권" val={`${gs2.gained}g`} />
                <Stat label="모둠 총 사용량" val={`${gs2.used}g`} />
                <Stat label="잔여 배출권"    val={`${gs2.gained - gs2.used}g`} />
              </div>
              <ProgressBar pct={pct2} color={bar2c} label={`${pct2}%`} />
            </div>

            {gs2.gained - gs2.used <= 0 && gs2.gained > 0 && (
              <Alert type="danger">🚨 탄소배출권이 모두 소진되었습니다! 다른 모둠에서 거래하지 못하면 생산 활동 불가!</Alert>
            )}
            {pct2 >= 70 && gs2.gained - gs2.used > 0 && (
              <Alert type="warn">⚠️ 탄소배출권이 {100 - pct2}%밖에 남지 않았어요!</Alert>
            )}

            {/* 일차 선택 */}
            <DayNav day={w2Day} max={4} onPrev={() => setW2Day(d => Math.max(1, d-1))} onNext={() => setW2Day(d => Math.min(4, d+1))} color="blue" />

            {/* 토지 선택 */}
            <SectionCard icon="🌿" title="토지 선택">
              <div className={styles.landGrid}>
                {Object.entries(LAND2).map(([land, info]) => (
                  <div
                    key={land}
                    className={`${styles.landOption} ${curDay2.land === land ? styles.landSelected2 : ''}`}
                    onClick={() => selectLand(2, land)}
                  >
                    <div className={styles.landName}>{LAND2_EMOJI[land]} {land}</div>
                    <div className={styles.landStats}>
                      <span className={styles.wage}>토지임금: {info.wage}냥</span><br />
                      <span className={styles.credit}>배출권: +{info.credit}g</span><br />
                      <span className={styles.cap}>정원 {info.capacity}명</span>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* 생산활동 */}
            <SectionCard icon="⚙️" title="생산 활동 (배출권 차감)">
              <table className={`${styles.prodTable} ${styles.prodTable2}`}>
                <thead>
                  <tr><th>수준</th><th>활동명</th><th>임금</th><th>배출권 차감</th></tr>
                </thead>
                <tbody>
                  {PROD2.map((act, idx) => {
                    const checked = curDay2.productions.includes(idx)
                    return (
                      <tr key={idx} onClick={() => toggleProd(2, idx)} className={styles.prodRow}>
                        <td><LvBadge lv={act.level} /></td>
                        <td>
                          <div className={styles.actCheck}>
                            <div className={`${styles.checkBox} ${checked ? styles.checked2 : ''}`}>{checked ? '✓' : ''}</div>
                            <span>{act.name}<br /><small>{act.desc}</small></span>
                          </div>
                        </td>
                        <td className={styles.wage}>{act.wage}냥</td>
                        <td className={styles.credit}>-{act.creditUsed}g</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </SectionCard>

            {/* 탄소중립 포인트 */}
            <SectionCard icon="🌱" title="탄소중립 포인트 활동">
              <p className={styles.cpDesc}>완료한 활동에 체크하세요. 1점=5냥 / 2점=8냥 / 3점=10냥</p>
              <div className={styles.cpGrid}>
                {CP_ACTIVITIES.map((act, idx) => {
                  const checked = curDay2.carbonPoints.includes(idx)
                  return (
                    <div key={idx} className={`${styles.cpItem} ${checked ? styles.cpChecked : ''}`} onClick={() => toggleCp(idx)}>
                      <span>
                        <span className={`${styles.lvBadge} ${styles['lv' + act.level]}`}>{act.level}수준</span><br />
                        <span className={styles.cpName}>{act.name}</span><br />
                        <span className={styles.cpSub}>{act.points}점 → {act.wage}냥</span>
                      </span>
                      <div className={`${styles.cpCheck} ${checked ? styles.cpCheckDone : ''}`}>{checked ? '✓' : ''}</div>
                    </div>
                  )
                })}
              </div>
              <div className={styles.cpToday}>
                오늘 탄소중립 포인트: <strong>{todayCpPts}점</strong> → <strong>{todayCp}냥</strong>
              </div>
            </SectionCard>

            {/* 일별 기록 */}
            <SectionCard icon="📊" title="일별 기록 요약">
              <DayRecords2 data={myData} today={w2Day} />
              <Ledger rows={[
                { label: '총 토지임금',           val: `${t2.lw}냥` },
                { label: '총 생산임금',           val: `${t2.pw}냥` },
                { label: '탄소중립 포인트 환산',   val: `${t2.cpw}냥` },
                { label: '탄소배출권 획득 (토지)', val: `${t2.cg}g` },
                { label: '탄소배출권 사용 (생산)', val: `${t2.cu}g` },
                { label: '합계 임금',             val: `${t2.lw + t2.pw + t2.cpw}냥`, bold: true },
              ]} />
            </SectionCard>
          </div>
        )}

        <div className={styles.resetLink}>
          <button onClick={async () => {
            if (!confirm('내 모든 기록을 초기화할까요?')) return
            const nd: MemberRecord = { group, name, week1: { days: {} }, week2: { days: {} } }
            setMyData(nd)
            await save(nd)
          }}>⚠️ 내 기록 초기화</button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════
// 공통 소형 컴포넌트
// ══════════════════════════════════════
const LAND1_EMOJI: Record<string, string> = { '광산': '⛏️', '공장': '🏭', '상점': '🏪', '농장': '🌾' }
const LAND2_EMOJI: Record<string, string> = { '재활용 센터': '♻️', '공유 가게': '🤝', '도시 텃밭': '🥬', '국립공원': '🏞️' }

function Stat({ label, val }: { label: string; val: string }) {
  return (
    <div className={styles.gsItem}>
      <div className={styles.gsVal}>{val}</div>
      <div className={styles.gsLabel}>{label}</div>
    </div>
  )
}

function ProgressBar({ pct, color, label }: { pct: number; color: string; label: string }) {
  return (
    <div className={styles.barWrap}>
      <div className={styles.barLabel}><span>진행도</span><span>{label}</span></div>
      <div className={styles.barBg}><div className={styles.barFill} style={{ width: `${pct}%`, background: color }} /></div>
    </div>
  )
}

function Alert({ type, children }: { type: 'warn' | 'danger' | 'info'; children: React.ReactNode }) {
  return <div className={`${styles.alert} ${styles['alert_' + type]}`}>{children}</div>
}

function DayNav({ day, max, onPrev, onNext, color }: { day: number; max: number; onPrev: () => void; onNext: () => void; color: string }) {
  return (
    <div className={`${styles.sectionCard} ${styles.daynav}`}>
      <div className={styles.sectionHeader}><span>📅</span><h3>기록할 일차 선택</h3></div>
      <div className={styles.sectionBody}>
        <div className={`${styles.dayCounter} ${color === 'blue' ? styles.dayCounterBlue : ''}`}>
          <button className={`${styles.dayBtn} ${color === 'blue' ? styles.dayBtnBlue : ''}`} onClick={onPrev} disabled={day <= 1}>‹</button>
          <span className={styles.dayLabel}>{day}일차</span>
          <button className={`${styles.dayBtn} ${color === 'blue' ? styles.dayBtnBlue : ''}`} onClick={onNext} disabled={day >= max}>›</button>
        </div>
      </div>
    </div>
  )
}

function SectionCard({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionHeader}><span>{icon}</span><h3>{title}</h3></div>
      <div className={styles.sectionBody}>{children}</div>
    </div>
  )
}

function LvBadge({ lv }: { lv: number }) {
  return <span className={`${styles.lvBadge} ${styles['lv' + lv]}`}>{lv}수준</span>
}

function DayRecords1({ data, today }: { data: MemberRecord; today: number }) {
  return (
    <div className={styles.dayRecords}>
      <div className={`${styles.dayRow} ${styles.dayRowHeader}`}>
        <div>일차</div><div>토지임금</div><div>생산임금</div><div>탄소배출</div>
      </div>
      {Array.from({ length: 5 }, (_, i) => i + 1).map(d => {
        const dd = data.week1.days[d]
        const lw = dd?.land ? LAND1[dd.land].wage : 0
        const lc = dd?.land ? LAND1[dd.land].carbon : 0
        let pw = 0, pc = 0
        for (const i of (dd?.productions || [])) { pw += PROD1[i].wage; pc += PROD1[i].carbon }
        return (
          <div key={d} className={`${styles.dayRow} ${d === today ? styles.dayRowToday : ''}`}>
            <div style={{ color: d === today ? 'var(--eco-green)' : undefined, fontWeight: d === today ? 800 : undefined }}>{d}일차</div>
            <div>{lw ? `${lw}냥` : '-'}</div>
            <div>{pw ? `${pw}냥` : '-'}</div>
            <div style={{ color: 'var(--carbon)' }}>{lc + pc ? `${lc + pc}g` : '-'}</div>
          </div>
        )
      })}
    </div>
  )
}

function DayRecords2({ data, today }: { data: MemberRecord; today: number }) {
  return (
    <div className={styles.dayRecords}>
      <div className={`${styles.dayRow} ${styles.dayRowHeader}`}>
        <div>일차</div><div>임금합계</div><div>탄소포인트</div><div>배출권(순)</div>
      </div>
      {Array.from({ length: 4 }, (_, i) => i + 1).map(d => {
        const dd = data.week2.days[d]
        const lw = dd?.land ? LAND2[dd.land].wage : 0
        const cg = dd?.land ? LAND2[dd.land].credit : 0
        let pw = 0, cu = 0, cpw = 0
        for (const i of (dd?.productions || [])) { pw += PROD2[i].wage; cu += PROD2[i].creditUsed }
        for (const i of (dd?.carbonPoints || [])) cpw += CP_ACTIVITIES[i].wage
        const net = cg - cu
        return (
          <div key={d} className={`${styles.dayRow} ${d === today ? styles.dayRowToday2 : ''}`}>
            <div style={{ color: d === today ? 'var(--sky)' : undefined, fontWeight: d === today ? 800 : undefined }}>{d}일차</div>
            <div>{lw + pw + cpw ? `${lw + pw + cpw}냥` : '-'}</div>
            <div style={{ color: 'var(--eco-green)' }}>{cpw ? `${cpw}냥` : '-'}</div>
            <div style={{ color: net >= 0 ? 'var(--sky)' : 'var(--carbon)' }}>{cg || cu ? `${net >= 0 ? '+' : ''}${net}g` : '-'}</div>
          </div>
        )
      })}
    </div>
  )
}

function Ledger({ rows }: { rows: { label: string; val: string; red?: boolean; bold?: boolean }[] }) {
  return (
    <div className={styles.ledger}>
      {rows.map((r, i) => (
        <div key={i} className={`${styles.ledgerRow} ${r.bold ? styles.ledgerBold : ''}`}>
          <span className={styles.ledgerLabel}>{r.label}</span>
          <span style={{ color: r.red ? 'var(--carbon)' : undefined }}>{r.val}</span>
        </div>
      ))}
    </div>
  )
}
