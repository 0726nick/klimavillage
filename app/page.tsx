'use client'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

const GROUPS = [
  { id: 'A', emoji: '🌿', color: '#2d7a4f', size: 5 },
  { id: 'B', emoji: '💧', color: '#1a6fa8', size: 4 },
  { id: 'C', emoji: '🌍', color: '#8b5e3c', size: 4 },
  { id: 'D', emoji: '☀️', color: '#6b46c1', size: 4 },
]

export default function Home() {
  const router = useRouter()
  return (
    <main className={styles.landing}>
      <div className={styles.hero}>
        <div className={styles.leafIcon}>🌱</div>
        <h1>기후행동 마을활동</h1>
        <p>모둠을 선택하고 활동을 시작하세요</p>
      </div>
      <div className={styles.groupGrid}>
        {GROUPS.map(g => (
          <button
            key={g.id}
            className={styles.groupCard}
            style={{ '--gc': g.color } as React.CSSProperties}
            onClick={() => router.push(`/group/${g.id}`)}
          >
            <div className={styles.groupEmoji}>{g.emoji}</div>
            <div className={styles.groupLabel} style={{ color: g.color }}>{g.id} 모둠</div>
            <div className={styles.groupSub}>{g.size}명 모둠 · 클릭하여 입장</div>
          </button>
        ))}
      </div>
      <button className={styles.adminLink} onClick={() => router.push('/admin')}>
        🔐 관리자
      </button>
    </main>
  )
}
