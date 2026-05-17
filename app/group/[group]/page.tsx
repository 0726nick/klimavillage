'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from './group.module.css'

export default function GroupPage() {
  const router = useRouter()
  const params = useParams()
  const group = (params.group as string).toUpperCase()

  const [members, setMembers] = useState<string[]>([])
  const [nameInput, setNameInput] = useState('')
  const [loading, setLoading] = useState(true)

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

  async function handleEnter() {
    const name = nameInput.trim()
    if (!name) return
    // upsert: 이미 있으면 그냥 입장, 없으면 생성
    await supabase.from('members').upsert(
      { group_id: group, name },
      { onConflict: 'group_id,name' }
    )
    router.push(`/member/${group}/${encodeURIComponent(name)}`)
  }

  async function handleDelete(name: string) {
    if (!confirm(`'${name}'의 기록을 삭제할까요?`)) return
    await supabase.from('members').delete()
      .eq('group_id', group).eq('name', name)
    await supabase.from('activity_records').delete()
      .eq('group_id', group).eq('name', name)
    fetchMembers()
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => router.push('/')}>← 뒤로</button>
        <h1>{group}모둠</h1>
        <div />
      </header>

      <div className={styles.body}>
        <h2>내 이름을 입력하세요</h2>
        <p>이름을 입력하면 내 개인 활동 페이지로 이동합니다.</p>

        <div className={styles.inputWrap}>
          <input
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleEnter()}
            placeholder="이름 입력..."
            maxLength={10}
          />
          <button onClick={handleEnter}>입장</button>
        </div>

        {loading ? (
          <p className={styles.loading}>불러오는 중...</p>
        ) : members.length === 0 ? (
          <p className={styles.empty}>아직 입장한 친구가 없어요</p>
        ) : (
          <div className={styles.memberList}>
            {members.map(name => (
              <div key={name} className={styles.memberItem}>
                <div onClick={() => router.push(`/member/${group}/${encodeURIComponent(name)}`)}>
                  <span className={styles.mName}>👤 {name}</span>
                  <span className={styles.mSub}>{group}모둠 · 클릭하여 입장</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button className={styles.deleteBtn} onClick={() => handleDelete(name)}>✕</button>
                  <span className={styles.arrow}>›</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
