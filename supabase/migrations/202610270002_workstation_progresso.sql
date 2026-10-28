-- PROPOSTA: não executada em produção. Aplicar após 202610270001 em staging.
-- Objetos novos apenas; não altera cadastros nem o recurso publicado.
begin;
-- Schema privado criado pela proposta 001.
revoke all on schema workstation_private from public, anon, authenticated;
grant usage on schema workstation_private to authenticated;
create table public.workstation_progresso (
 user_id uuid primary key references auth.users(id),
 dados jsonb not null default '{}'::jsonb,
 revisao bigint not null default 0,
 atualizado_em timestamptz not null default now(),
 check (jsonb_typeof(dados) = 'object' and octet_length(dados::text) <= 1000000)
);
alter table public.workstation_progresso enable row level security;
revoke all on public.workstation_progresso from public,anon,authenticated;

create function workstation_private.progress(op text, payload jsonb default null, expected bigint default null, started timestamptz default null)
returns jsonb language plpgsql security definer set search_path = '' as $fn$
declare uid uuid := auth.uid(); role_name text; class_active boolean; class_started timestamptz; item public.workstation_progresso%rowtype; result jsonb;
begin
 if uid is null then raise exception 'Autenticação obrigatória' using errcode='42501'; end if;
 -- Mesma linha bloqueada por aula_end: nenhuma gravação autorizada após seu commit.
 select ativa,iniciada_em into class_active,class_started from public.workstation_aula_estado where singleton for share;
 select papel into role_name from public.sala_membros where user_id=uid and ativo is true for share;
 if role_name is null then raise exception 'Membro não autorizado' using errcode='42501'; end if;
 if op='summary' then
  if role_name <> 'administradora' then raise exception 'Exclusivo da professora' using errcode='42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('nome',m.nome,'turma',m.turma,'revisao',p.revisao,'atualizado_em',p.atualizado_em,'tarefas_concluidas',coalesce((select count(*) from jsonb_each_text(case when jsonb_typeof(p.dados->'wrp_progress')='string' then (p.dados->>'wrp_progress')::jsonb else '{}'::jsonb end) x where x.value='true'),0))), '[]'::jsonb)
   into result from public.workstation_progresso p join public.sala_membros m on m.user_id=p.user_id;
  return result;
 end if;
 if role_name <> 'administradora' and class_active is distinct from true then raise exception 'Aula encerrada' using errcode='42501'; end if;
 if op='load' then
  select * into item from public.workstation_progresso where user_id=uid;
  return jsonb_build_object('data',coalesce(item.dados,'{}'::jsonb),'revision',coalesce(item.revisao,0),'started_at',class_started);
 end if;
 if op <> 'save' then raise exception 'Operação inválida'; end if;
 if started is distinct from class_started then raise exception 'A sessão pertence a outra aula' using errcode='42501'; end if;
 if payload is null or jsonb_typeof(payload)<>'object' or octet_length(payload::text)>1000000 or expected is null then raise exception 'Dados inválidos' using errcode='22023'; end if;
 if exists(select 1 from jsonb_each(payload) e where e.key not like 'wrp\_%' escape '\' or jsonb_typeof(e.value)<>'string') then raise exception 'Chaves inválidas' using errcode='22023'; end if;
 if payload ? 'wrp_progress' then
  if jsonb_typeof((payload->>'wrp_progress')::jsonb)<>'object' or (select count(*) from jsonb_each((payload->>'wrp_progress')::jsonb))>324 or exists(select 1 from jsonb_each((payload->>'wrp_progress')::jsonb) e where e.value <> 'true'::jsonb or e.key !~ '^[0-9]{1,2}:[0-9]{1,2}$') then raise exception 'Progresso inválido' using errcode='22023'; end if;
 end if;
 insert into public.workstation_progresso(user_id) values(uid) on conflict do nothing;
 select * into item from public.workstation_progresso where user_id=uid for update;
 -- A business conflict must not use 40001: PostgREST retries serialization failures.
 if item.revisao<>expected then raise exception 'Progresso atualizado em outra sessão. Reabra a Workstation.' using errcode='PT409'; end if;
 update public.workstation_progresso set dados=payload,revisao=revisao+1,atualizado_em=clock_timestamp() where user_id=uid returning * into item;
 return jsonb_build_object('revision',item.revisao);
end;
$fn$;
revoke all on function workstation_private.progress(text,jsonb,bigint,timestamptz) from public,anon,authenticated;
grant execute on function workstation_private.progress(text,jsonb,bigint,timestamptz) to authenticated;
create function public.workstation_progresso_load() returns jsonb language sql security invoker set search_path='' as $fn$ select workstation_private.progress('load'); $fn$;
create function public.workstation_progresso_save(p_dados jsonb,p_revisao bigint,p_iniciada_em timestamptz) returns jsonb language sql security invoker set search_path='' as $fn$ select workstation_private.progress('save',p_dados,p_revisao,p_iniciada_em); $fn$;
create function public.workstation_progresso_summary() returns jsonb language sql security invoker set search_path='' as $fn$ select workstation_private.progress('summary'); $fn$;
revoke all on function public.workstation_progresso_load() from public,anon,authenticated;
revoke all on function public.workstation_progresso_save(jsonb,bigint,timestamptz) from public,anon,authenticated;
revoke all on function public.workstation_progresso_summary() from public,anon,authenticated;
grant execute on function public.workstation_progresso_load() to authenticated;
grant execute on function public.workstation_progresso_save(jsonb,bigint,timestamptz) to authenticated;
grant execute on function public.workstation_progresso_summary() to authenticated;

-- Restringe somente a leitura do recurso Workstation após o fim da aula.
create function workstation_private.can_read_resource() returns boolean
language sql stable security definer set search_path='' as $fn$
 select exists(select 1 from public.sala_membros m where m.user_id=auth.uid() and m.ativo and
  (m.papel='administradora' or exists(select 1 from public.workstation_aula_estado s where s.singleton and s.ativa)));
$fn$;
revoke all on function workstation_private.can_read_resource() from public,anon,authenticated;
grant execute on function workstation_private.can_read_resource() to authenticated;
create policy workstation_class_read on public.sala_recursos as restrictive for select to authenticated
 using (id <> 'workstation-patricia' or workstation_private.can_read_resource());

commit;
