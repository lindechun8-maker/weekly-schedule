-- 在 Supabase 的 SQL Editor 中执行此文件。
-- 每个已登录用户拥有一份自己的周日程，电脑和手机登录同一邮箱即可同步。
create table if not exists public.schedules (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  events jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.schedules enable row level security;

-- 在不公开匿名访问的前提下，仅授权已登录用户，由下方 RLS 策略继续限制到本人。
grant select, insert, update on table public.schedules to authenticated;

create policy "用户仅可读取自己的日程"
on public.schedules for select to authenticated
using (auth.uid() = owner_id);

create policy "用户仅可新建自己的日程"
on public.schedules for insert to authenticated
with check (auth.uid() = owner_id);

-- 允许已登录的设备在另一台设备编辑后即时收到更新。
alter publication supabase_realtime add table public.schedules;

create policy "用户仅可修改自己的日程"
on public.schedules for update to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

-- 允许已登录的设备在另一台设备编辑后即时收到更新。
alter publication supabase_realtime add table public.schedules;
