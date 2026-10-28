-- Primeiro restaurar a sala/recurso anterior e exportar workstation_progresso.
-- Preserva todos os registros de progresso; não usar DROP TABLE.
begin;
drop policy workstation_class_read on public.sala_recursos;
revoke all on function workstation_private.can_read_resource() from authenticated;
revoke all on function public.workstation_progresso_load() from authenticated;
revoke all on function public.workstation_progresso_save(jsonb,bigint,timestamptz) from authenticated;
revoke all on function public.workstation_progresso_summary() from authenticated;
revoke all on function workstation_private.progress(text,jsonb,bigint,timestamptz) from authenticated;
commit;
