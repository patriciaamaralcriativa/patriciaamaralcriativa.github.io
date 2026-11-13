-- Additive private library. Does not replace existing policies, tables or functions.
create schema ws_biblioteca;
revoke all on schema ws_biblioteca from public, anon;
grant usage on schema ws_biblioteca to authenticated;

create table public.workstation_biblioteca_v2 (
 id uuid primary key default gen_random_uuid(),
 criada_por uuid not null default auth.uid() references auth.users(id),
 titulo text not null check(length(trim(titulo)) between 1 and 100),
 modalidade text not null check(modalidade in ('rx','ct','mg','dbt')),
 origem text not null check(length(trim(origem)) between 1 and 300),
 licenca text not null check(length(trim(licenca)) between 1 and 200),
 revisado boolean not null default false,
 publicado boolean not null default false,
 quantidade integer not null check(quantidade between 1 and 1000),
 tamanho bigint not null check(tamanho between 1 and 1073741824),
 criado_em timestamptz not null default now(),
 atualizado_em timestamptz not null default now()
);
create index workstation_biblioteca_v2_autora on public.workstation_biblioteca_v2(criada_por);
create index workstation_biblioteca_v2_liberados on public.workstation_biblioteca_v2(modalidade,criado_em desc) where publicado;
create table public.workstation_biblioteca_arquivos_v2 (
 id uuid primary key default gen_random_uuid(),
 biblioteca_id uuid not null references public.workstation_biblioteca_v2(id) on delete cascade,
 nome text not null check(length(trim(nome)) between 1 and 180),
 mime text not null check(mime in ('image/png','image/jpeg','application/dicom')),
 tamanho bigint not null check(tamanho between 1 and 314572800),
 sha256 text not null check(sha256 ~ '^[0-9a-f]{64}$'),
 partes integer not null check(partes between 1 and 75 and partes=ceil(tamanho::numeric/4194304)),
 criado_em timestamptz not null default now()
);
create index workstation_biblioteca_arquivos_v2_conjunto on public.workstation_biblioteca_arquivos_v2(biblioteca_id);
alter table public.workstation_biblioteca_v2 enable row level security;
alter table public.workstation_biblioteca_arquivos_v2 enable row level security;
revoke all on public.workstation_biblioteca_v2,public.workstation_biblioteca_arquivos_v2 from anon,authenticated;
grant select,insert,delete on public.workstation_biblioteca_v2 to authenticated;
grant update(titulo,origem,licenca,revisado,publicado) on public.workstation_biblioteca_v2 to authenticated;
grant select,insert,delete on public.workstation_biblioteca_arquivos_v2 to authenticated;

create policy biblioteca_v2_ler on public.workstation_biblioteca_v2 for select to authenticated
 using ((criada_por=(select auth.uid()) and (select ws_t_educacao.professora())) or (publicado and (select ws_t_educacao.aluno_autorizado())));
create policy biblioteca_v2_criar on public.workstation_biblioteca_v2 for insert to authenticated
 with check (criada_por=(select auth.uid()) and not publicado and (select ws_t_educacao.professora()));
create policy biblioteca_v2_editar on public.workstation_biblioteca_v2 for update to authenticated
 using(criada_por=(select auth.uid()) and (select ws_t_educacao.professora()))
 with check(criada_por=(select auth.uid()) and (select ws_t_educacao.professora()));
create policy biblioteca_v2_remover on public.workstation_biblioteca_v2 for delete to authenticated
 using(criada_por=(select auth.uid()) and not publicado and (select ws_t_educacao.professora()));
create policy biblioteca_arquivos_v2_ler on public.workstation_biblioteca_arquivos_v2 for select to authenticated
 using(exists(select 1 from public.workstation_biblioteca_v2 b where b.id=biblioteca_id));
create policy biblioteca_arquivos_v2_criar on public.workstation_biblioteca_arquivos_v2 for insert to authenticated
 with check(exists(select 1 from public.workstation_biblioteca_v2 b where b.id=biblioteca_id and b.criada_por=(select auth.uid()) and not b.publicado and (select ws_t_educacao.professora())));
create policy biblioteca_arquivos_v2_remover on public.workstation_biblioteca_arquivos_v2 for delete to authenticated
 using(exists(select 1 from public.workstation_biblioteca_v2 b where b.id=biblioteca_id and b.criada_por=(select auth.uid()) and not b.publicado and (select ws_t_educacao.professora())));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('workstation-biblioteca-v2','workstation-biblioteca-v2',false,4194304,array['application/octet-stream']);

-- The row lock also serializes storage writes/deletes with release/retraction.
create function ws_biblioteca.conjunto_editavel(conjunto uuid) returns boolean language plpgsql volatile security invoker set search_path='' as $$
declare b record;
begin
 select * into b from public.workstation_biblioteca_v2 where id=conjunto for update;
 return found and b.criada_por=auth.uid() and not b.publicado and ws_t_educacao.professora();
end;$$;
revoke all on function ws_biblioteca.conjunto_editavel(uuid) from public,anon;
grant execute on function ws_biblioteca.conjunto_editavel(uuid) to authenticated;

create policy biblioteca_v2_objetos_ler on storage.objects for select to authenticated
 using(bucket_id='workstation-biblioteca-v2' and exists(
 select 1 from public.workstation_biblioteca_arquivos_v2 f join public.workstation_biblioteca_v2 b on b.id=f.biblioteca_id
 where name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9]{5}\.bin$'
 and split_part(name,'/',1)=b.criada_por::text and split_part(name,'/',2)=b.id::text and split_part(name,'/',3)=f.id::text
 and (case when name ~ '/[0-9]{5}\.bin$' then split_part(split_part(name,'/',4),'.',1)::integer else -1 end) between 0 and f.partes-1));
create policy biblioteca_v2_objetos_criar on storage.objects for insert to authenticated
 with check(bucket_id='workstation-biblioteca-v2' and (select ws_t_educacao.professora()) and exists(
 select 1 from public.workstation_biblioteca_arquivos_v2 f join public.workstation_biblioteca_v2 b on b.id=f.biblioteca_id
 where name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9]{5}\.bin$'
 and b.criada_por=(select auth.uid()) and not b.publicado and ws_biblioteca.conjunto_editavel(b.id)
 and split_part(name,'/',1)=b.criada_por::text and split_part(name,'/',2)=b.id::text and split_part(name,'/',3)=f.id::text
 and (case when name ~ '/[0-9]{5}\.bin$' then split_part(split_part(name,'/',4),'.',1)::integer else -1 end) between 0 and f.partes-1));
create policy biblioteca_v2_objetos_remover on storage.objects for delete to authenticated
 using(bucket_id='workstation-biblioteca-v2' and (select ws_t_educacao.professora())
 and split_part(name,'/',1)=(select auth.uid())::text
 and exists(select 1 from public.workstation_biblioteca_v2 b where b.id::text=split_part(name,'/',2) and b.criada_por=(select auth.uid()) and not b.publicado and ws_biblioteca.conjunto_editavel(b.id)));

create function ws_biblioteca.validar_publicacao() returns trigger language plpgsql security invoker set search_path='' as $$
declare f record; i integer; expected bigint; actual bigint; count_files integer; total bigint;
begin
 if TG_OP='UPDATE' and (new.id<>old.id or new.criada_por<>old.criada_por or new.modalidade<>old.modalidade or new.quantidade<>old.quantidade or new.tamanho<>old.tamanho or new.criado_em<>old.criado_em) then raise exception 'Identidade e declaração de arquivos são imutáveis.';end if;
 if TG_OP='UPDATE' and old.publicado and (new.titulo<>old.titulo or new.origem<>old.origem or new.licenca<>old.licenca or new.revisado<>old.revisado) then raise exception 'Recolha o conjunto antes de editar.';end if;
 if new.publicado then
  if not new.revisado then raise exception 'Confirme a revisão de privacidade e direitos antes de liberar.';end if;
  select count(*),coalesce(sum(tamanho),0) into count_files,total from public.workstation_biblioteca_arquivos_v2 where biblioteca_id=new.id;
  if count_files<>new.quantidade or total<>new.tamanho then raise exception 'Envio incompleto: quantidade ou tamanho divergente.';end if;
  for f in select * from public.workstation_biblioteca_arquivos_v2 where biblioteca_id=new.id loop
   for i in 0..f.partes-1 loop
    expected:=least(4194304::bigint,f.tamanho-i::bigint*4194304);
    select (metadata->>'size')::bigint into actual from storage.objects where bucket_id='workstation-biblioteca-v2' and name=new.criada_por::text||'/'||new.id::text||'/'||f.id::text||'/'||lpad(i::text,5,'0')||'.bin';
    if actual is null or actual<>expected then raise exception 'Envio incompleto: parte ausente ou tamanho divergente.';end if;
   end loop;
  end loop;
 end if;
 new.atualizado_em:=now();return new;
end;$$;
revoke all on function ws_biblioteca.validar_publicacao() from public,anon;
create trigger biblioteca_v2_validar before insert or update on public.workstation_biblioteca_v2 for each row execute function ws_biblioteca.validar_publicacao();

-- Serialize file writes with publication so a draft cannot change while being released.
create function ws_biblioteca.validar_arquivo() returns trigger language plpgsql security invoker set search_path='' as $$
declare b record;
begin
 select * into b from public.workstation_biblioteca_v2 where id=case when TG_OP='DELETE' then old.biblioteca_id else new.biblioteca_id end for update;
 if b.publicado then raise exception 'Recolha o conjunto antes de alterar os arquivos.';end if;
 if TG_OP='DELETE' then return old;end if;return new;
end;$$;
revoke all on function ws_biblioteca.validar_arquivo() from public,anon;
create trigger biblioteca_v2_arquivo_lock before insert or delete on public.workstation_biblioteca_arquivos_v2 for each row execute function ws_biblioteca.validar_arquivo();
