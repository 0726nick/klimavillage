import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '기후행동 마을활동',
  description: '기후행동 프로젝트 마을활동 개인 기록 시스템',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700;800&family=Black+Han+Sans&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
