# RADIOQUIZ — implementação e continuidade

## Estado atual

O banco dedicado foi instalado e a interface está conectada a Supabase Auth, Postgres e Realtime. O código está na branch `dev/radioquiz-engine`, em revisão no PR #4. A página principal permanece preservada. A interface conectada ainda não foi publicada em `main`.

## Preservação e arquitetura

- Commit original: `9ca09e72f4e11e70448a37d6e9f4b70ca30e9f9c`.
- Backup remoto: `backup/radioquiz-20261114-before-engine`.
- Somente `/radioquiz/` é modificado.
- Projeto Supabase exclusivo, região São Paulo; plano `free` confirmado.
- Nenhuma mudança em Minha Sala de Aulas ou Homologação Workstation T.
- Migrações aplicadas com autorização: `20261114210508_radioquiz_schema` e `20261114210545_radioquiz_engine`.
- Nove tabelas com RLS. O acesso direto a tabelas administrativas está revogado; operações passam pela API autenticada.
- O e-mail da professora fica na lista privada. Somente e-mail confirmado é autorizado; metadados editáveis do cliente não concedem privilégio.
- Alunos usam sessões Auth anônimas, habilitadas e conferidas no projeto. Uma sessão por dupla/aparelho envia uma resposta por pergunta.
- O servidor valida sala, identidade, bloqueio, pergunta, prazo e duplicidade; calcula pontos por acerto/velocidade e penalidade opcional.
- Snapshots preservam perguntas de cada partida. Editar questionário utilizado cria nova versão; excluir versões ligadas ao histórico é impedido.
- Realtime publica somente a revisão da sala. O cliente consulta o estado sanitizado e recupera estado por consulta periódica após mensagens perdidas ou reconexão.
- O projetor recebe estado sem ranking. Nomes dos integrantes aparecem apenas no painel da professora.
- O SDK é empacotado localmente com versão fixada e lockfile; `config.js` contém apenas chave publishable e URL públicas.

## Funcionalidades implementadas

Entrada por PIN, nome da dupla e dois integrantes; painel da professora; editor de perguntas com quatro alternativas, explicação, tempo/pontos, assunto e imagem HTTPS; importação/exportação JSON; seleção individual de perguntas de vários questionários; configurações da sala; controles de início, fechamento, avanço e encerramento; bloqueio/liberação; tela projetada; registro de respostas; resultado, classificação nos celulares e histórico.

Repetir uma partida cria nova sala usando a configuração preservada no navegador da professora. Em outro navegador, preparar novamente pela biblioteca. O PIN é preservado localmente no navegador criador; no banco fica seu digest. Não é recuperável do digest caso o armazenamento local seja perdido.

O login da professora oferece link por e-mail e, opcionalmente, senha. Não foi enviada mensagem de acesso automaticamente. A entrega do e-mail depende da configuração de retorno ainda pendente e de ação explícita da professora.

## Testes

Ver `TESTES.md` para evidências e limites: 38 verificações locais de banco, teste remoto por SQL, 16 verificações reais por Auth/HTTP/Realtime, 22 verificações de interface com Auth/API simulados e conferência do fluxo da dupla no navegador com banco real. A conta temporária e os registros gerados foram removidos após autorização expressa.

## Próximo passo concreto

A configuração inicial do dashboard Supabase Auth foi substituída, com autorização, pelos endereços exatos:

- Site URL: `https://patriciaamaralcriativa.github.io/radioquiz/`.
- Retorno autorizado exato: `https://patriciaamaralcriativa.github.io/radioquiz/?view=teacher`.

A configuração foi autorizada e salva no projeto exclusivo em 15/11/2026: o retorno exato foi adicionado e o Site URL foi atualizado. Próximo passo: publicar a versão básica somente em `/radioquiz/`, conferir o primeiro acesso por e-mail da professora e validar os alunos em aparelhos reais. Não declarar entrega integral antes dessas validações. Recursos especiais permanecem na etapa posterior.

## Limites do plano

Documentação consultada: 200 conexões simultâneas, 100 mensagens/s e 2 milhões de mensagens Realtime no plano Free. Limites da aplicação: 60 duplas por sala, cinco salas abertas por professora. Esses limites de aplicação não representam teste de carga aprovado. Respostas em rajadas podem exigir otimização do sinal Realtime; consultas periódicas recuperam estado, mas isso não substitui medição de capacidade. Não fazer upgrade automático.

- https://supabase.com/docs/guides/realtime/limits
- https://supabase.com/docs/guides/realtime/pricing

## Segurança e recuperação

O verificador informa RLS sem políticas em tabelas intencionalmente fechadas: esperado, pois acesso direto foi revogado. Os dois avisos preexistentes sobre o event trigger `rls_auto_enable` permanecem para revisão; não foram alteradas permissões dessa função da plataforma.

Para recuperar a prévia antiga, restaurar apenas os arquivos de `/radioquiz/` do backup. Não apagar o banco para reverter uma interface. Qualquer reversão com dados reais deve preservar os registros de alunos.
