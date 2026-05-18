'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  LAND1, LAND2, PROD1, PROD2, CP_ACTIVITIES,
  getAllocatedCredit, GROUP_SIZE, type MemberRecord,
} from '@/lib/constants'
import styles from './admin.module.css'

const ADMIN_PASSWORD = 'utem21'

type MemberRow = {
  name: string
  group_id: string
  week1: MemberRecord['week1']
  week2: MemberRecord['week2']
}

// ── 개인 합계 계산 ──────────────────────────────────
function calcMember1(week1: MemberRecord['week1']) {
  let lw = 0, pw = 0, carbon = 0
  for (let d = 1; d <= 5; d++) {
    const dd = week1.days[d]; if (!dd) continue
    if (dd.land) { lw += LAND1[dd.land]?.wage ?? 0; carbon += LAND1[dd.land]?.carbon ?? 0 }
    for (const i of (dd.productions || [])) { pw += PROD1[i]?.wage ?? 0; carbon += PROD1[i]?.carbon ?? 0 }
  }
  return { lw, pw, carbon, total: lw + pw }
}
function calcMember2(week2: MemberRecord['week2']) {
  let lw = 0, pw = 0, cpw = 0, cg = 0, cu = 0
  for (let d = 1; d <= 4; d++) {
    const dd = week2.days[d]; if (!dd) continue
    if (dd.land) { lw += LAND2[dd.land]?.wage ?? 0; cg += LAND2[dd.land]?.credit ?? 0 }
    for (const i of (dd.productions || [])) { pw += PROD2[i]?.wage ?? 0; cu += PROD2[i]?.creditUsed ?? 0 }
    for (const i of (dd.carbonPoints || [])) cpw += CP_ACTIVITIES[i]?.wage ?? 0
  }
  return { lw, pw, cpw, cg, cu, total: lw + pw + cpw }
}

// ── 모둠 통계 계산 ──────────────────────────────────
function calcGroup(members: MemberRow[], group: string) {
  const size = GROUP_SIZE[group] ?? 4
  const limit = size === 5 ? 200 : 160
  let w1Carbon = 0, w1Wage = 0
  let w2Wage = 0, w2CreditGained = 0, w2CreditUsed = 0, w2Cp = 0
  for (const m of members) {
    const t1 = calcMember1(m.week1)
    const t2 = calcMember2(m.week2)
    w1Carbon += t1.carbon; w1Wage += t1.total
    w2Wage += t2.lw + t2.pw; w2Cp += t2.cpw
    w2CreditGained += t2.cg; w2CreditUsed += t2.cu
  }
  const allocCredit = getAllocatedCredit(w1Carbon, size)
  const totalCredit = allocCredit + w2CreditGained
  return { size, limit, w1Carbon, w1Wage, w2Wage, w2Cp, totalCredit, w2CreditUsed, allocCredit }
}

export default function AdminPage() {
  const router = useRouter()
  const [authed, setAuthed]       = useState(false)
  const [pwInput, setPwInput]     = useState('')
  const [pwError, setPwError]     = useState('')
  const [allData, setAllData]     = useState<MemberRow[]>([])
  const [loading, setLoading]     = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'members'>('overview')
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)

  const GROUPS = ['A', 'B', 'C', 'D']

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('activity_records')
      .select('name, group_id, week1, week2')
      .order('group_id')
    setAllData((data || []) as MemberRow[])
    setLoading(false)
  }, [])

  useEffect(() => { if (authed) fetchAll() }, [authed, fetchAll])

  function handleLogin() {
    if (pwInput === ADMIN_PASSWORD) { setAuthed(true); setPwError('') }
    else setPwError('비밀번호가 틀렸습니다')
  }

  async function handleReset(group: string, name: string) {
    if (!confirm(`[${group}모둠] ${name}의 활동 기록을 초기화할까요?`)) return
    await supabase.from('activity_records')
      .update({ week1: { days: {} }, week2: { days: {} } })
      .eq('group_id', group).eq('name', name)
    fetchAll()
  }

  async function handleDelete(group: string, name: string) {
    if (!confirm(`[${group}모둠] ${name}을 완전히 삭제할까요? 되돌릴 수 없습니다.`)) return
    await supabase.from('members').delete().eq('group_id', group).eq('name', name)
    await supabase.from('activity_records').delete().eq('group_id', group).eq('name', name)
    fetchAll()
  }

  async function handleResetGroup(group: string) {
    if (!confirm(`[${group}모둠] 전체 기록을 초기화할까요?`)) return
    const members = allData.filter(m => m.group_id === group)
    for (const m of members) {
      await supabase.from('activity_records')
        .update({ week1: { days: {} }, week2: { days: {} } })
        .eq('group_id', group).eq('name', m.name)
    }
    fetchAll()
  }

  // ── 로그인 화면 ──────────────────────────────────
  if (!authed) return (
    <div className={styles.loginWrap}>
      <div className={styles.loginCard}>
        <div className={styles.loginIcon}>🔐</div>
        <h1>관리자 페이지</h1>
        <p>관리자 비밀번호를 입력하세요</p>
        <input
          type="password"
          value={pwInput}
          onChange={e => { setPwInput(e.target.value); setPwError('') }}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          placeholder="비밀번호 입력..."
          autoFocus
        />
        {pwError && <p className={styles.errorMsg}>⚠️ {pwError}</p>}
        <button onClick={handleLogin}>입장하기</button>
        <button className={styles.backBtn} onClick={() => router.push('/')}>← 메인으로</button>
      </div>
    </div>
  )

  // ── 관리자 대시보드 ──────────────────────────────
  return (
    <div className={styles.wrap}>
      <header className={styles.topBar}>
        <button className={styles.headerBack} onClick={() => router.push('/')}>← 메인</button>
        <h1>🔐 관리자 페이지</h1>
        <button className={styles.refreshBtn} onClick={fetchAll}>🔄 새로고침</button>
      </header>

      {/* 탭 */}
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === 'overview' ? styles.activeTab : ''}`} onClick={() => setActiveTab('overview')}>
          📊 모둠별 현황
        </button>
        <button className={`${styles.tab} ${activeTab === 'members' ? styles.activeTab : ''}`} onClick={() => setActiveTab('members')}>
          👤 개인별 관리
        </button>
      </div>

      <div className={styles.body}>
        {loading && <p className={styles.loading}>불러오는 중...</p>}

        {/* ════ 탭1: 모둠별 현황 ════ */}
        {activeTab === 'overview' && (
          <div>
            {GROUPS.map(group => {
              const members = allData.filter(m => m.group_id === group)
              const gs = calcGroup(members, group)
              const pct1 = Math.min(100, Math.round(gs.w1Carbon / gs.limit * 100))
              const pct2 = gs.totalCredit > 0 ? Math.min(100, Math.round(gs.w2CreditUsed / gs.totalCredit * 100)) : 0
              const bar1c = pct1 >= 90 ? '#e74c3c' : pct1 >= 70 ? '#f0a500' : '#4caf7d'
              const bar2c = pct2 >= 90 ? '#e74c3c' : pct2 >= 70 ? '#f0a500' : '#4a9fd4'
              const isExpanded = expandedGroup === group

              return (
                <div key={group} className={styles.groupCard}>
                  {/* 모둠 헤더 */}
                  <div className={styles.groupHeader} onClick={() => setExpandedGroup(isExpanded ? null : group)}>
                    <div className={styles.groupTitle}>
                      <span className={styles.groupBadge}>{group}모둠</span>
                      <span className={styles.groupSize}>{gs.size}명</span>
                      <span className={styles.memberCount}>({members.length}명 등록)</span>
                    </div>
                    <span>{isExpanded ? '▲' : '▼'}</span>
                  </div>

                  {/* 모둠 요약 통계 */}
                  <div className={styles.statGrid}>
                    <div className={styles.statItem}>
                      <div className={styles.statVal} style={{ color: '#2d7a4f' }}>{gs.w1Wage}냥</div>
                      <div className={styles.statLabel}>1주차 임금 합계</div>
                    </div>
                    <div className={styles.statItem}>
                      <div className={styles.statVal} style={{ color: '#c0392b' }}>{gs.w1Carbon}g</div>
                      <div className={styles.statLabel}>1주차 탄소배출</div>
                    </div>
                    <div className={styles.statItem}>
                      <div className={styles.statVal} style={{ color: '#2d7a4f' }}>{gs.w2Wage + gs.w2Cp}냥</div>
                      <div className={styles.statLabel}>2주차 임금 합계</div>
                    </div>
                    <div className={styles.statItem}>
                      <div className={styles.statVal} style={{ color: '#1a6fa8' }}>{gs.totalCredit - gs.w2CreditUsed}g</div>
                      <div className={styles.statLabel}>잔여 배출권</div>
                    </div>
                  </div>

                  {/* 진행 바 */}
                  <div className={styles.barSection}>
                    <div className={styles.barRow}>
                      <span>1주차 탄소배출 ({gs.w1Carbon}g / {gs.limit}g)</span>
                      <span>{pct1}%</span>
                    </div>
                    <div className={styles.barBg}><div className={styles.barFill} style={{ width: `${pct1}%`, background: bar1c }} /></div>
                    <div className={styles.barRow} style={{ marginTop: 8 }}>
                      <span>2주차 배출권 사용 ({gs.w2CreditUsed}g / {gs.totalCredit}g)</span>
                      <span>{pct2}%</span>
                    </div>
                    <div className={styles.barBg}><div className={styles.barFill} style={{ width: `${pct2}%`, background: bar2c }} /></div>
                  </div>

                  {/* 개인별 상세 (펼치기) */}
                  {isExpanded && (
                    <div className={styles.memberTable}>
                      <div className={styles.tableHeader}>
                        <div>이름</div>
                        <div>1주차 임금</div>
                        <div>1주차 탄소</div>
                        <div>2주차 임금</div>
                        <div>탄소포인트</div>
                        <div>배출권(순)</div>
                      </div>
                      {members.length === 0 ? (
                        <p className={styles.empty}>등록된 학생이 없어요</p>
                      ) : members.map(m => {
                        const t1 = calcMember1(m.week1)
                        const t2 = calcMember2(m.week2)
                        return (
                          <div key={m.name} className={styles.tableRow}>
                            <div className={styles.memberName}>👤 {m.name}</div>
                            <div style={{ color: '#2d7a4f', fontWeight: 700 }}>{t1.total}냥</div>
                            <div style={{ color: '#c0392b', fontWeight: 700 }}>{t1.carbon}g</div>
                            <div style={{ color: '#2d7a4f', fontWeight: 700 }}>{t2.lw + t2.pw}냥</div>
                            <div style={{ color: '#4caf7d', fontWeight: 700 }}>{t2.cpw}냥</div>
                            <div style={{ color: t2.cg - t2.cu >= 0 ? '#1a6fa8' : '#c0392b', fontWeight: 700 }}>
                              {t2.cg - t2.cu >= 0 ? '+' : ''}{t2.cg - t2.cu}g
                            </div>
                          </div>
                        )
                      })}

                      {/* 모둠 초기화 버튼 */}
                      <div className={styles.groupActions}>
                        <button className={styles.btnResetGroup} onClick={() => handleResetGroup(group)}>
                          🔄 {group}모둠 전체 초기화
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ════ 탭2: 개인별 관리 ════ */}
        {activeTab === 'members' && (
          <div>
            {GROUPS.map(group => {
              const members = allData.filter(m => m.group_id === group)
              return (
                <div key={group} className={styles.groupCard}>
                  <div className={styles.groupHeader} onClick={() => setExpandedGroup(expandedGroup === group + '_m' ? null : group + '_m')}>
                    <div className={styles.groupTitle}>
                      <span className={styles.groupBadge}>{group}모둠</span>
                      <span className={styles.memberCount}>({members.length}명)</span>
                    </div>
                    <span>{expandedGroup === group + '_m' ? '▲' : '▼'}</span>
                  </div>

                  {expandedGroup === group + '_m' && (
                    <div className={styles.memberManageList}>
                      {members.length === 0 ? (
                        <p className={styles.empty}>등록된 학생이 없어요</p>
                      ) : members.map(m => {
                        const t1 = calcMember1(m.week1)
                        const t2 = calcMember2(m.week2)
                        return (
                          <div key={m.name} className={styles.manageRow}>
                            <div className={styles.manageInfo}>
                              <div className={styles.manageName}>👤 {m.name}</div>
                              <div className={styles.manageSub}>
                                1주차: {t1.total}냥 / {t1.carbon}g &nbsp;|&nbsp;
                                2주차: {t2.total}냥 / 배출권 {t2.cg - t2.cu >= 0 ? '+' : ''}{t2.cg - t2.cu}g
                              </div>
                            </div>
                            <div className={styles.manageActions}>
                              <button className={styles.btnReset} onClick={() => handleReset(group, m.name)}>
                                🔄 초기화
                              </button>
                              <button className={styles.btnDelete} onClick={() => handleDelete(group, m.name)}>
                                🗑️ 삭제
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
