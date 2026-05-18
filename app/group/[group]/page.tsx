'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { GROUP_SIZE } from '@/lib/constants'
import styles from './group.module.css'

export default function GroupPage() {
  const router = useRouter()
  const params = useParams()
  const group = (params.group as string).toUpperCase()

  const maxSize = GROUP_SIZE[group] ?? 4

  const [members, setMembers]         = useState<string[]>([])
  const [nameInput, setNameInput]     = useState('')
  const [pwInput, setPwInput]         = useState('')
  const [pwConfirm, setPwConfirm]     = useState('')
  const [step, setStep]               = useState<'name' | 'register' | 'login' | 'full'>('name')
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [checking, setChecking]       = useState(false)

  useEffect(() => { fetchMembers() }, [group])

  async function fetchMembers() {
    setLoading(true)
    const { data } = await supabase
      .from('members')
      .select('name')
      .eq('group_id', group)
      .order('created_at')
    setMembers((data || []).map((r: { name: string }) => r.name))
    setLoading(false)
  }

  // 1단계: 이름 입력 후 신규/기존 판단
  async function handleNameNext() {
    const name = nameInput.trim()
    if (!name) return
    setChecking(true)
    const { data } = await supabase
      .from('members')
      .select('name')
      .eq('group_id', group)
      .eq('name', name)
      .single()
    setChecking(false)

    if (data) {
      // 기존 회원 → 로그인
      setStep('login')
    } else {
      // 신규 → 정원 확인
      if (members.length >= maxSize) {
        setStep('full')
        return
      }
      setStep('register')
    }
    setError('')
    setPwInput('')
    setPwConfirm('')
  }

  // 2단계A: 신규 등록
  async function handleRegister() {
    if (!pwInput) { setError('비밀번호를 입력해주세요'); return }
    if (pwInput !== pwConfirm) { setError('비밀번호가 일치하지 않아요'); return }
    if (pwInput.length < 4) { setError('비밀번호는 4자 이상으로 해주세요'); return }
    // 등록 직전 정원 재확인 (동시 가입 방지)
    const { count } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', group)
    if ((count ?? 0) >= maxSize) { setStep('full'); return }
    const name = nameInput.trim()
    await supabase.from('members').insert({ group_id: group, name, password: pwInput })
    router.push(`/member/${group}/${encodeURIComponent(name)}`)
  }

  // 2단계B: 기존 로그인
  async function handleLogin() {
    if (!pwInput) { setError('비밀번호를 입력해주세요'); return }
    const name = nameInput.trim()
    const { data } = await supabase
      .from('members')
      .select('password')
      .eq('group_id', group)
      .eq('name', name)
      .single()
    if (!data || data.password !== pwInput) {
      setError('비밀번호가 틀렸어요')
      return
    }
    router.push(`/member/${group}/${encodeURIComponent(name)}`)
  }

  function handleBack() {
    setStep('name')
    setError('')
    setPwInput('')
    setPwConfirm('')
  }

  async function handleDelete(name: string) {
    const pw = prompt(`'${name}' 의 비밀번호를 입력하면 삭제됩니다.`)
    if (pw === null) return // 취소
    const { data } = await supabase
      .from('members')
      .select('password')
      .eq('group_id', group)
      .eq('name', name)
      .single()
    if (!data || data.password !== pw) {
      alert('비밀번호가 틀렸어요!')
      return
    }
    await supabase.from('members').delete()
      .eq('group_id', group).eq('name', name)
    await supabase.from('activity_records').delete()
      .eq('group_id', group).eq('name', name)
    fetchMembers()
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.topBar}>
        <button className={styles.backBtn} onClick={step === 'name' ? () => router.push('/') : handleBack}>← 뒤로</button>
        <h1>{group}모둠</h1>
        <div />
      </header>

      <div className={styles.body}>

        {/* ── 1단계: 이름 입력 ── */}
        {step === 'name' && (
          <>
            <div className={styles.capacityBar}>
              <span>모둠 정원</span>
              <span className={members.length >= maxSize ? styles.full : ''}>{members.length} / {maxSize}명</span>
            </div>
            <h2>이름을 입력하세요</h2>
            <p>처음 입장하면 비밀번호를 설정하고, 다시 들어올 때는 비밀번호로 확인해요.</p>
            <div className={styles.inputWrap}>
              <input
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleNameNext()}
                placeholder="이름 입력..."
                maxLength={10}
                autoFocus
              />
              <button onClick={handleNameNext} disabled={checking}>
                {checking ? '확인 중...' : '다음'}
              </button>
            </div>

            {loading ? (
              <p className={styles.loading}>불러오는 중...</p>
            ) : members.length === 0 ? (
              <p className={styles.empty}>아직 입장한 친구가 없어요</p>
            ) : (
              <div className={styles.memberList}>
                <p className={styles.memberListTitle}>이미 등록된 친구들</p>
                {members.map(name => (
                  <div key={name} className={styles.memberItem}
                    onClick={() => { setNameInput(name); setStep('login'); setError(''); setPwInput('') }}>
                    <div>
                      <span className={styles.mName}>👤 {name}</span>
                      <span className={styles.mSub}>{group}모둠 · 클릭하여 로그인</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button className={styles.deleteBtn} onClick={e => { e.stopPropagation(); handleDelete(name) }}>✕</button>
                      <span className={styles.arrow}>›</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── 정원 초과 ── */}
        {step === 'full' && (
          <div className={styles.fullWrap}>
            <div className={styles.fullIcon}>🚫</div>
            <h2>{group}모둠 정원이 찼어요!</h2>
            <p>{group}모둠은 최대 <strong>{maxSize}명</strong>까지 입장할 수 있어요.<br />이미 {members.length}명이 등록되어 있습니다.</p>
            <p style={{ marginTop: 12, color: '#aaa', fontSize: '0.85rem' }}>이미 등록한 경우 이름을 클릭해 로그인하세요.</p>
            <div className={styles.memberList} style={{ marginTop: 16 }}>
              {members.map(name => (
                <div key={name} className={styles.memberItem}
                  onClick={() => { setNameInput(name); setStep('login'); setError(''); setPwInput('') }}>
                  <div>
                    <span className={styles.mName}>👤 {name}</span>
                    <span className={styles.mSub}>클릭하여 로그인</span>
                  </div>
                  <span className={styles.arrow}>›</span>
                </div>
              ))}
            </div>
            <button className={styles.btnBack} onClick={handleBack}>← 뒤로</button>
          </div>
        )}

        {/* ── 2단계A: 신규 비밀번호 등록 ── */}
        {step === 'register' && (
          <>
            <div className={styles.stepBadge}>🆕 처음 입장</div>
            <h2>비밀번호를 설정하세요</h2>
            <p><strong>{nameInput}</strong> 님, 처음 오셨네요! 다음에 다시 들어올 때 쓸 비밀번호를 정해주세요.</p>
            <div className={styles.pwWrap}>
              <input
                type="password"
                value={pwInput}
                onChange={e => { setPwInput(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleRegister()}
                placeholder="비밀번호 (4자 이상)"
                autoFocus
              />
              <input
                type="password"
                value={pwConfirm}
                onChange={e => { setPwConfirm(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleRegister()}
                placeholder="비밀번호 확인"
              />
              {error && <p className={styles.errorMsg}>⚠️ {error}</p>}
              <button className={styles.btnFull} onClick={handleRegister}>등록하고 입장 🌱</button>
            </div>
          </>
        )}

        {/* ── 2단계B: 기존 로그인 ── */}
        {step === 'login' && (
          <>
            <div className={styles.stepBadge}>👋 다시 오셨군요</div>
            <h2>비밀번호를 입력하세요</h2>
            <p><strong>{nameInput}</strong> 님의 비밀번호를 입력해주세요.</p>
            <div className={styles.pwWrap}>
              <input
                type="password"
                value={pwInput}
                onChange={e => { setPwInput(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="비밀번호 입력..."
                autoFocus
              />
              {error && <p className={styles.errorMsg}>⚠️ {error}</p>}
              <button className={styles.btnFull} onClick={handleLogin}>입장하기 →</button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
