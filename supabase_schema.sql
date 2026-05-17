-- ══════════════════════════════════════════════════════
-- 기후행동 마을활동 Supabase 스키마
-- Supabase > SQL Editor 에 붙여넣고 실행하세요
-- ══════════════════════════════════════════════════════

-- 1) members 테이블
create table if not exists members (
  id         bigint generated always as identity primary key,
  group_id   text   not null,   -- 'A' | 'B' | 'C' | 'D'
  name       text   not null,
  created_at timestamptz default now(),
  unique(group_id, name)
);

-- 2) activity_records 테이블 (개인 활동 데이터 JSON 저장)
create table if not exists activity_records (
  id         bigint generated always as identity primary key,
  group_id   text   not null,
  name       text   not null,
  week1      jsonb  not null default '{"days":{}}',
  week2      jsonb  not null default '{"days":{}}',
  updated_at timestamptz default now(),
  unique(group_id, name)
);

-- 3) updated_at 자동 갱신 트리거
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on activity_records;
create trigger set_updated_at
  before update on activity_records
  for each row execute function update_updated_at();

-- 4) Row Level Security (RLS) — 누구나 읽기/쓰기 허용 (수업용)
alter table members         enable row level security;
alter table activity_records enable row level security;

create policy "allow_all_members"          on members          for all using (true) with check (true);
create policy "allow_all_activity_records" on activity_records for all using (true) with check (true);
