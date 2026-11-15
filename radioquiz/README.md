# RADIOQUIZ — UNITERP

Frontend estático independente para GitHub Pages, com Supabase Auth, Postgres e Realtime.

## Acessos

- Alunos: `/radioquiz/` — um aparelho por dupla, entrada com PIN, nome e dois integrantes.
- Professora: `/radioquiz/?view=teacher` — acesso por link no e-mail autorizado, com senha como opção.
- Projetor: aberto pelo botão da sala, em nova aba no computador da professora. Não mostra ranking.

O login administrativo do aplicativo é separado do login do dashboard Supabase. O painel da professora permite criar questionários, selecionar perguntas de vários bancos, configurar tempo/pontos/penalidade, criar salas, controlar questões, bloquear duplas e consultar histórico.

O primeiro acesso pode ser confirmado pelo link no e-mail, sem criar ou lembrar senha. O Site URL e o retorno exato `?view=teacher` foram salvos e conferidos no Supabase Auth, após autorização. O primeiro recebimento do e-mail pela professora ainda deve ser validado.

## Banco e configuração

As duas migrações foram aplicadas exclusivamente ao projeto dedicado, após autorização. As tabelas têm RLS; leitura e escrita diretas estão revogadas, exceto pelo sinal seguro de atualização. O e-mail autorizado fica somente na tabela privada, nunca no repositório. `config.js` contém apenas URL pública e chave **publishable**, apropriada para frontend. Nunca adicionar chaves secretas/service_role.

Perguntas e gabaritos ficam no servidor. As respostas são únicas por dupla/pergunta; o servidor valida o prazo e calcula os pontos. Snapshots das questões preservam cada partida. O relógio da tela usa o prazo e a hora do servidor. Uma consulta de recuperação complementa Realtime após desconexões ou perda de mensagens.

## Reproduzir

```sh
cd radioquiz
npm ci
npm run build
npm run check
cd tests
npm ci
npm test
```

O bundle do SDK é versionado em `vendor/`, para que a página não dependa de CDN. Versões estão fixadas nos lockfiles.

## Estado e limites

Leia `IMPLEMENTACAO.md` para testes concluídos e pendências. A interface conectada está na branch de desenvolvimento; a página principal do site foi preservada. Não anunciar como plataforma concluída antes dos testes da competição completa por HTTP/Realtime e em dispositivos independentes.

O botão Repetir cria uma nova sala sem apagar a anterior e depende da configuração guardada neste navegador. Em outro computador, prepare a nova partida pela biblioteca. O PIN é exibido a partir do registro local da sessão que criou a sala; não é recuperável do digest armazenado no banco. Preserve a sessão do computador da professora durante a aula.

Recursos especiais (roubo, escudo, bônus e desempate) pertencem à etapa posterior e ainda não foram implementados.
