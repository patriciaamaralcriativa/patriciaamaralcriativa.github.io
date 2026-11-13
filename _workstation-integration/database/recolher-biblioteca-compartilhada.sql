-- Reversão de acesso, SEM apagar arquivos ou alterar os mecanismos anteriores.
-- Aplicar somente se uma reversão completa do módulo compartilhado for necessária.
begin;
drop policy if exists biblioteca_v2_objetos_ler on storage.objects;
drop policy if exists biblioteca_v2_objetos_criar on storage.objects;
drop policy if exists biblioteca_v2_objetos_remover on storage.objects;
revoke all on public.workstation_biblioteca_v2,public.workstation_biblioteca_arquivos_v2 from authenticated,anon;
commit;
-- O bucket continua privado; tabelas e dados permanecem para recuperação.
-- A reversão normal da interface é git revert <commit-publicado>.
