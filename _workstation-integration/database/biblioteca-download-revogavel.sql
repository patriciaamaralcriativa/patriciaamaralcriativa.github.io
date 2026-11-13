-- Students receive chunks only through the authenticated, reauthorizing function.
-- Authors retain direct reads for upload checks and release validation.
alter policy biblioteca_v2_objetos_ler on storage.objects
 using(bucket_id='workstation-biblioteca-v2' and (select ws_t_educacao.professora()) and exists(
 select 1 from public.workstation_biblioteca_arquivos_v2 f join public.workstation_biblioteca_v2 b on b.id=f.biblioteca_id
 where name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9]{5}\.bin$'
 and b.criada_por=(select auth.uid())
 and split_part(name,'/',1)=b.criada_por::text and split_part(name,'/',2)=b.id::text and split_part(name,'/',3)=f.id::text
 and (case when name ~ '/[0-9]{5}\.bin$' then split_part(split_part(name,'/',4),'.',1)::integer else -1 end) between 0 and f.partes-1));
