# 🌱 기후행동 마을활동

기후행동 프로젝트 마을활동 개인 기록 시스템  
**Next.js + Supabase + Vercel** 으로 구성됩니다.

---

## 📋 배포 순서 (처음 한 번만)

### 1단계 — Supabase 설정

1. [supabase.com](https://supabase.com) → 무료 계정 생성
2. **New Project** 생성 (이름: `klimavillage`, 지역: Northeast Asia)
3. **SQL Editor** → `supabase_schema.sql` 전체 내용 붙여넣고 **Run**
4. **Project Settings → API** 에서 두 값을 복사:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

### 2단계 — GitHub 업로드

```bash
# 터미널에서 이 폴더 안에서 실행
git init
git add .
git commit -m "기후행동 마을활동 초기 배포"

# GitHub 에서 새 repository 생성 후:
git remote add origin https://github.com/YOUR_ID/klimavillage.git
git push -u origin main
```

---

### 3단계 — Vercel 배포

1. [vercel.com](https://vercel.com) → **New Project**
2. GitHub 저장소 `klimavillage` 선택 → **Import**
3. **Environment Variables** 에 추가:
   | 키 | 값 |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
4. **Deploy** 클릭 → 완료!

---

## 🔗 사용 방법

배포 후 생성된 링크 (예: `klimavillage.vercel.app`)를 학생들에게 공유하면:

```
klimavillage.vercel.app          → 모둠 선택
klimavillage.vercel.app/group/A  → A모둠 이름 입력
klimavillage.vercel.app/member/A/홍길동  → 홍길동 개인 페이지
```

---

## 💻 로컬 개발

```bash
npm install
# .env.local 파일에 Supabase 키 입력 후:
npm run dev
# http://localhost:3000 에서 확인
```
