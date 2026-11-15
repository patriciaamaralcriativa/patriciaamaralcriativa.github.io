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

## Teste real por HTTP / Realtime

`live-session.mjs` usa o cliente real, cria quatro identidades descartáveis e pausa para preparação explícita de uma identidade administrativa temporária. Não executa essa concessão por conta própria. Após a preparação, cobre salas, três duplas, respostas simultâneas, duplicatas, pontuação, sinal WebSocket e reconexão. Não contém credenciais e nunca pede senha em linha de comando. Requer Node com terminal interativo e autorização específica para a preparação/limpeza da identidade de teste.

Após autorização específica da professora, a execução passou em 16 verificações reais. A identidade administrativa temporária, as duplas sintéticas e seus registros foram removidos. O teste não substitui a validação do e-mail da professora ou de aparelhos físicos.

## Interface simulada

`npm run test:ui` executa 22 verificações da interface em JSDOM com Auth/API simulados: seleção de bancos, configurações, controles, editor, navegação, escaping, projeção sem ranking e solicitação de link por e-mail. Não envia e-mails nem concede acesso no serviço real.
