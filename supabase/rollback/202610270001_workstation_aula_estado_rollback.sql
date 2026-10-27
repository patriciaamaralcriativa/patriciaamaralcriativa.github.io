-- Reverter primeiro a sala e recurso. Preserva tabelas e dados novos para recuperação.
begin;
revoke all on function public.workstation_aula_status() from authenticated;
revoke all on function workstation_private.workstation_aula_status() from authenticated;
revoke all on function public.workstation_aula_start() from authenticated;
revoke all on function workstation_private.workstation_aula_start() from authenticated;
revoke all on function public.workstation_aula_end() from authenticated;
revoke all on function workstation_private.workstation_aula_end() from authenticated;
commit;
