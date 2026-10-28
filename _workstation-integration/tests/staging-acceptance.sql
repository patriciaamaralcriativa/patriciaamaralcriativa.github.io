-- PENDENTE DE EXECUÇÃO. Apenas em staging descartável após aplicar as propostas 001 e 002.
-- Requer fixtures auth.users/sala_membros já criadas com IDs fictícios abaixo.
-- Nenhum e-mail será enviado por este teste SQL. Transação revertida ao final.
begin;
-- Configure IDs dos usuários de teste existentes no staging antes da execução.
-- Professora: 00000000-0000-4000-8000-000000000001
-- Aluno A:    00000000-0000-4000-8000-000000000002
-- Aluno B:    00000000-0000-4000-8000-000000000003
-- Suspenso:   00000000-0000-4000-8000-000000000004
-- Casos obrigatórios para o executor:
-- 1. SET LOCAL ROLE anon: recurso/estado/progresso negados.
-- 2. JWT de aluno A ativo + aula ativa: load/save próprios aprovados.
-- 3. JWT de aluno B: load não contém dados de A.
-- 4. JWT de aluno/suspenso: start/end/summary negados; tabela de progresso sem acesso direto.
-- 5. JWT professora: start/end/summary aprovados.
-- 6. Após commit de end, nova transação de A: save e leitura do recurso negadas.
-- 7. Durante save concorrente, end espera lock; após seu commit, novos saves negados.
-- 8. Revisão antiga: save gera SQLSTATE PT409 / HTTP 409, sem retry nem sobrescrita.
-- 9. iniciada_em antigo após reabrir aula: save negado.
-- 10. Payload fora do namespace, JSON inválido ou >1MB: save negado.
-- 11. Após rollback de implantação, linhas anteriores de recurso e alunos inalteradas.
select 'PENDENTE: executar matriz com usuários de staging e concorrência real' as estado;
rollback;
