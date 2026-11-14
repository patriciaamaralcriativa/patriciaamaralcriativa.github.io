# Testes de banco

Requer Node.js e acesso ao npm na primeira instalação:

```sh
npm ci
npm test
```

Dependência de desenvolvimento fixada no lockfile: `@electric-sql/pglite@0.5.16`.
O teste roda PostgreSQL local e a extensão pgcrypto. Cria identidades de teste locais e executa os dois arquivos de migração originais, sem modificar suas instruções SQL.
Não usa chave Supabase, rede de produção ou dados de alunos.

Este teste não substitui Supabase Auth, PostgREST, Realtime, concorrência entre conexões independentes ou celulares reais. A identidade `auth.uid()` e `auth.users` são simuladas no ambiente local.
