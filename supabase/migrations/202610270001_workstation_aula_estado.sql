-- Workstation T web integration. Apply only after review in a staging Supabase project.
-- This migration does not alter sala_membros, sala_recursos, users, or existing RLS policies.
begin;
create schema workstation_private;
revoke all on schema workstation_private from public, anon, authenticated;
grant usage on schema workstation_private to authenticated;

create table public.workstation_aula_estado (
  singleton boolean primary key default true check (singleton = true),
  ativa boolean not null default false,
  iniciada_por uuid,
  iniciada_em timestamptz,
  encerrada_em timestamptz,
  atualizada_em timestamptz not null default pg_catalog.now()
);

alter table public.workstation_aula_estado enable row level security;
revoke all on table public.workstation_aula_estado from public, anon, authenticated;

insert into public.workstation_aula_estado (singleton, ativa)
values (true, false)
on conflict (singleton) do nothing;

create function workstation_private.workstation_aula_status()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_papel text;
  v_ativa boolean;
  v_iniciada_em timestamptz;
  v_encerrada_em timestamptz;
begin
  if v_user is null then
    raise exception 'Autenticação obrigatória.' using errcode = '42501';
  end if;

  select sm.papel::text into v_papel
  from public.sala_membros as sm
  where sm.user_id = v_user and sm.ativo is true
  limit 1;

  if not found then
    raise exception 'Acesso não autorizado à Sala de Aulas.' using errcode = '42501';
  end if;

  select s.ativa, s.iniciada_em, s.encerrada_em
    into v_ativa, v_iniciada_em, v_encerrada_em
  from public.workstation_aula_estado as s
  where s.singleton = true;

  return pg_catalog.jsonb_build_object(
    'active', coalesce(v_ativa, false),
    'is_admin', v_papel = 'administradora',
    'started_at', v_iniciada_em,
    'ended_at', v_encerrada_em
  );
end;
$function$;

create function workstation_private.workstation_aula_start()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_started timestamptz;
begin
  if v_user is null or not exists (
    select 1 from public.sala_membros as sm
    where sm.user_id = v_user and sm.ativo is true and sm.papel::text = 'administradora'
  ) then
    raise exception 'Operação exclusiva da professora autorizada.' using errcode = '42501';
  end if;

  insert into public.workstation_aula_estado as current_state
    (singleton, ativa, iniciada_por, iniciada_em, encerrada_em, atualizada_em)
  values (true, true, v_user, pg_catalog.now(), null, pg_catalog.now())
  on conflict (singleton) do update set
    ativa = true,
    iniciada_por = excluded.iniciada_por,
    iniciada_em = excluded.iniciada_em,
    encerrada_em = null,
    atualizada_em = excluded.atualizada_em
  returning current_state.iniciada_em into v_started;

  return pg_catalog.jsonb_build_object('active', true, 'is_admin', true, 'started_at', v_started);
end;
$function$;

create function workstation_private.workstation_aula_end()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_ended timestamptz;
begin
  if v_user is null or not exists (
    select 1 from public.sala_membros as sm
    where sm.user_id = v_user and sm.ativo is true and sm.papel::text = 'administradora'
  ) then
    raise exception 'Operação exclusiva da professora autorizada.' using errcode = '42501';
  end if;

  update public.workstation_aula_estado as s
  set ativa = false, encerrada_em = pg_catalog.now(), atualizada_em = pg_catalog.now()
  where s.singleton = true
  returning s.encerrada_em into v_ended;

  return pg_catalog.jsonb_build_object('active', false, 'is_admin', true, 'ended_at', v_ended);
end;
$function$;

revoke all on function workstation_private.workstation_aula_status() from public, anon, authenticated;
revoke all on function workstation_private.workstation_aula_start() from public, anon, authenticated;
revoke all on function workstation_private.workstation_aula_end() from public, anon, authenticated;
grant execute on function workstation_private.workstation_aula_status() to authenticated;
grant execute on function workstation_private.workstation_aula_start() to authenticated;
grant execute on function workstation_private.workstation_aula_end() to authenticated;

create function public.workstation_aula_status() returns jsonb language sql security invoker set search_path='' as $fn$ select workstation_private.workstation_aula_status(); $fn$;
revoke all on function public.workstation_aula_status() from public,anon,authenticated;
grant execute on function public.workstation_aula_status() to authenticated;
create function public.workstation_aula_start() returns jsonb language sql security invoker set search_path='' as $fn$ select workstation_private.workstation_aula_start(); $fn$;
revoke all on function public.workstation_aula_start() from public,anon,authenticated;
grant execute on function public.workstation_aula_start() to authenticated;
create function public.workstation_aula_end() returns jsonb language sql security invoker set search_path='' as $fn$ select workstation_private.workstation_aula_end(); $fn$;
revoke all on function public.workstation_aula_end() from public,anon,authenticated;
grant execute on function public.workstation_aula_end() to authenticated;
commit;
