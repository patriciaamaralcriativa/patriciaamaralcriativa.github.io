-- Optional, backward-compatible appearance extension; apply only in dedicated RADIOQUIZ after authorization.
-- It does not change questions, clocks, answers or scoring.
begin;
create table radioquiz_private.team_looks (
 team_id uuid primary key references public.radioquiz_teams(id) on delete cascade,
 kind text not null check(kind in ('robot','astro','comet','cat')),
 color text not null check(color in ('violet','cyan','pink','lime','orange','blue')),
 accessory text not null check(accessory in ('none','glasses','headphones','crown')),
 updated_at timestamptz not null default now()
);
alter table radioquiz_private.team_looks enable row level security;
revoke all on radioquiz_private.team_looks from public,anon,authenticated;

create function radioquiz_private.api_with_mascots(op text,p jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); t public.radioquiz_teams; result jsonb; appearances jsonb; item jsonb;
begin
 if uid is null then raise exception 'Entre na sua conta para continuar.' using errcode='42501'; end if;
 if op='set_mascot' then
  if jsonb_typeof(p) is distinct from 'object' or jsonb_typeof(p->'look') is distinct from 'object' then raise exception 'Mascote inválido.'; end if;
  -- Keep the engine's lock order: room first, then team.
  perform 1 from public.radioquiz_rooms where id=(p->>'room_id')::uuid for update;
  select * into t from public.radioquiz_teams
   where room_id=(p->>'room_id')::uuid and session_user_id=uid and not blocked for update;
  if not found then raise exception 'Apenas a própria dupla pode personalizar seu mascote.' using errcode='42501'; end if;
  insert into radioquiz_private.team_looks(team_id,kind,color,accessory)
   values(t.id,p->'look'->>'kind',p->'look'->>'color',p->'look'->>'accessory')
   on conflict(team_id) do update set kind=excluded.kind,color=excluded.color,accessory=excluded.accessory,updated_at=now();
  perform radioquiz_private.signal(t.room_id,'mascot_changed');
  return jsonb_build_object('ok',true);
 end if;
 -- Retain all authorization and game validation from the original engine.
 result:=radioquiz_private.api(op,p);
 if op='state' and not coalesce((p->>'projection')::boolean,false) then
  if result ? 'ranking' then
   select coalesce(jsonb_agg(x.value||jsonb_build_object('mascot',case when l.team_id is null then null else jsonb_build_object('kind',l.kind,'color',l.color,'accessory',l.accessory) end) order by x.ordinality),'[]'::jsonb)
   into appearances from jsonb_array_elements(result->'ranking') with ordinality x(value,ordinality)
   left join radioquiz_private.team_looks l on l.team_id=(x.value->>'id')::uuid;
   result:=result||jsonb_build_object('ranking',appearances);
  end if;
  if result ? 'teams' then
   select coalesce(jsonb_agg(x.value||jsonb_build_object('mascot',case when l.team_id is null then null else jsonb_build_object('kind',l.kind,'color',l.color,'accessory',l.accessory) end) order by x.ordinality),'[]'::jsonb)
   into appearances from jsonb_array_elements(result->'teams') with ordinality x(value,ordinality)
   left join radioquiz_private.team_looks l on l.team_id=(x.value->>'id')::uuid;
   result:=result||jsonb_build_object('teams',appearances);
  end if;
 end if;
 return result;
end $$;
revoke all on function radioquiz_private.api_with_mascots(text,jsonb) from public,anon;
grant execute on function radioquiz_private.api_with_mascots(text,jsonb) to authenticated;
create or replace function public.radioquiz_api(op text,p jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$ select radioquiz_private.api_with_mascots(op,p) $$;
revoke all on function public.radioquiz_api(text,jsonb) from public,anon;
grant execute on function public.radioquiz_api(text,jsonb) to authenticated;
commit;
