-- RADIOQUIZ schema foundation.
-- REVIEW AND APPLY ONLY IN A DEDICATED STAGING SUPABASE PROJECT.
-- This migration creates isolated radioquiz_* tables. It does not modify existing app tables.
-- Client access is intentionally revoked; secure RPC functions will be added in a later migration.

begin;

create extension if not exists pgcrypto with schema extensions;

create table public.radioquiz_quizzes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  subject text not null default 'Radiologia' check (char_length(subject) between 2 and 80),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.radioquiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.radioquiz_quizzes(id) on delete cascade,
  position integer not null check (position > 0),
  prompt text not null check (char_length(prompt) between 5 and 1500),
  options jsonb not null check (
    jsonb_typeof(options) = 'array'
    and jsonb_array_length(options) between 2 and 6
  ),
  answer_index integer not null check (answer_index between 0 and 5),
  explanation text not null default '' check (char_length(explanation) <= 1500),
  time_limit_seconds integer not null default 30 check (time_limit_seconds between 10 and 180),
  created_at timestamptz not null default now(),
  unique (quiz_id, position),
  check (answer_index < jsonb_array_length(options))
);

create table public.radioquiz_rooms (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.radioquiz_quizzes(id) on delete restrict,
  owner_id uuid not null references auth.users(id) on delete cascade,
  pin_digest text not null unique,
  status text not null default 'waiting'
    check (status in ('waiting','running','paused','finished','cancelled')),
  current_position integer not null default 0 check (current_position >= 0),
  question_started_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '4 hours'),
  finished_at timestamptz
);

create table public.radioquiz_teams (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.radioquiz_rooms(id) on delete cascade,
  team_name text not null check (char_length(team_name) between 2 and 32),
  member_one text not null check (char_length(member_one) between 1 and 60),
  member_two text not null check (char_length(member_two) between 1 and 60),
  score integer not null default 0 check (score >= 0),
  joined_at timestamptz not null default now(),
  unique (room_id, team_name),
  unique (id, room_id)
);

create table public.radioquiz_answers (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.radioquiz_rooms(id) on delete cascade,
  team_id uuid not null,
  question_id uuid not null references public.radioquiz_questions(id) on delete cascade,
  selected_index integer not null check (selected_index between 0 and 5),
  is_correct boolean not null,
  response_ms integer check (response_ms between 0 and 180000),
  submitted_at timestamptz not null default now(),
  foreign key (team_id, room_id)
    references public.radioquiz_teams(id, room_id) on delete cascade,
  unique (team_id, question_id)
);

create index radioquiz_questions_quiz_position_idx
  on public.radioquiz_questions(quiz_id, position);
create index radioquiz_rooms_owner_created_idx
  on public.radioquiz_rooms(owner_id, created_at desc);
create index radioquiz_rooms_expiry_idx
  on public.radioquiz_rooms(expires_at);
create index radioquiz_teams_room_score_idx
  on public.radioquiz_teams(room_id, score desc, joined_at);
create index radioquiz_answers_room_question_idx
  on public.radioquiz_answers(room_id, question_id);

alter table public.radioquiz_quizzes enable row level security;
alter table public.radioquiz_questions enable row level security;
alter table public.radioquiz_rooms enable row level security;
alter table public.radioquiz_teams enable row level security;
alter table public.radioquiz_answers enable row level security;

-- No direct browser access. Subsequent migrations will expose narrowly scoped RPCs.
revoke all on table public.radioquiz_quizzes from public, anon, authenticated;
revoke all on table public.radioquiz_questions from public, anon, authenticated;
revoke all on table public.radioquiz_rooms from public, anon, authenticated;
revoke all on table public.radioquiz_teams from public, anon, authenticated;
revoke all on table public.radioquiz_answers from public, anon, authenticated;

commit;
