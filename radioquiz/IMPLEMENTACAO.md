# RADIOQUIZ — plano e conferência de 14/11/2026

## Ambiente confirmado

- Repositório: `patriciaamaralcriativa/patriciaamaralcriativa.github.io`, branch principal `main`.
- Versão preservada: `9ca09e72f4e11e70448a37d6e9f4b70ca30e9f9c`.
- Backup remoto: `backup/radioquiz-20261114-before-engine`.
- A pasta `/radioquiz/` já continha interface visual e uma migração de fundação. Foram preservadas.
- Supabase exclusivo: projeto exclusivo verificado, nome `RADIOQUIZ - UNITERP`, região São Paulo.
- Organização conferida pela conexão autorizada; plano confirmado `free`.
- Inspeção remota: antes da aplicação: nenhuma tabela pública, nenhuma migração aplicada e nenhuma conta de aplicativo.
- Disponíveis: GitHub, Supabase (SQL, migrações, documentação, verificadores), execução local de Node/PostgreSQL via PGlite e navegador de conferência.
- Nenhuma criação de projeto, contratação ou alteração de plano foi executada.
- Os projetos Minha Sala de Aulas e Homologação Workstation T não foram alterados.

## Arquitetura escolhida

Manter frontend estático no GitHub Pages, em `/radioquiz/`, com Supabase Auth, Postgres e Realtime. Não requer servidor Node permanente ou mudança na página principal.

O e-mail administrativo será provisionado diretamente no banco, sem publicação no repositório. A professora usa conta confirmada de aplicativo; autorização administrativa depende do e-mail confirmado na lista privada, sem confiar em metadados editáveis. Os alunos usam sessões anônimas do Supabase Auth, uma por navegador/dupla. Essas sessões precisam ser habilitadas e testadas no projeto antes da publicação funcional. Não são contas com senha solicitadas aos alunos.

A API autenticada encaminha operações para funções privadas com permissões restritas. O banco valida identidade, sala, pergunta, bloqueio, prazo e unicidade antes de aceitar respostas. O servidor calcula a pontuação: acerto vale entre 50% e 100% dos pontos conforme o tempo de resposta; erro pode gerar penalidade configurada. O cliente não informa pontos ou tempo aceitos pelo banco.

A sala guarda cópia das perguntas e configurações. Editar um questionário já utilizado cria nova versão e preserva o histórico. Excluir questionário vinculado a partidas é impedido. Reiniciar uma competição deverá criar nova sala, preservando a anterior.

Realtime publica somente identificador da sala e revisão. Os clientes autorizados consultam o estado sanitizado; o gabarito só é retornado depois do encerramento da questão. A projeção recebe estado sem ranking ou nomes de integrantes. O futuro cliente deve reconectar e buscar estado após reconexão, com consultas de recuperação quando Realtime falhar.

O servidor define início e prazo. Mesmo sem clientes conectados, respostas tardias são recusadas. A transição visual de expiração é reconciliada na próxima consulta, sem depender de cron pago.

## Etapas e critérios de passagem

| Etapa | Trabalho | Situação atual |
| --- | --- | --- |
| 1 | Analisar, preservar, preparar banco e segurança | Concluída: duas migrações aplicadas após autorização; 9 tabelas com RLS; teste funcional remoto por SQL passou |
| 2 | Criar sala, receber duplas, controlar questões, calcular pontos | Motor implementado e exercitado localmente; interface funcional e validação HTTP pendentes |
| 3 | Sincronização e reconexão | Canal seguro preparado; Auth/Realtime reais e testes em quatro aparelhos pendentes |
| 4 | Biblioteca e histórico | Operações de banco preparadas/testadas localmente; telas de cadastro, seleção e histórico pendentes |
| 5 | Bônus, escudos, roubo, desafios | Não iniciada; depende da aprovação da partida básica |
| 6 | Responsividade, acessibilidade, acabamento e publicação | Pendente; página atual permanece a prévia existente |

## Limites gratuitos verificados

A documentação oficial consultada informa 200 conexões Realtime simultâneas, 100 mensagens por segundo e 2 milhões de mensagens incluídas no plano Free. A implementação inicial limita a sala a 60 duplas e a professora a cinco salas abertas; isso não equivale a um teste de carga ou garantia de capacidade. Haverá aviso de falhas e recuperação de estado. Não fazer upgrade automático.

Referências:
- https://supabase.com/docs/guides/realtime/limits
- https://supabase.com/docs/guides/realtime/pricing
- https://supabase.com/changelog.md

## Verificações feitas

`cd radioquiz/tests && npm ci && npm test`

Resultado: **38 verificações passaram**. A suíte executa as duas migrações sem alterações em PostgreSQL local PGlite 0.5.16, com papéis anon/authenticated e substituição local da tabela/identidade do Supabase Auth. Testa criação e persistência, quatro alternativas, PIN, três sessões independentes, unicidade, autorização, ausência de gabarito antecipado, resposta duplicada, pontuação, penalidade, projeção sem ranking, bloqueio, prazo no servidor, histórico e edição com preservação de versão.

**Limites:** identidades são simuladas localmente. Não houve login real, chamada HTTP ao aplicativo, conexão WebSocket com o serviço Realtime, teste de carga/concor­rência distribuída, interrupção de rede real ou uso simultâneo em celulares físicos. Nenhuma função deve ser anunciada como publicada/pronta com base apenas nesta suíte.

O verificador remoto encontrou permissões amplas na função preexistente `public.rls_auto_enable()`, que é um event trigger da plataforma. Nada foi alterado nela; revisar o alerta antes da liberação, distinguindo privilégio listado de possibilidade real de invocação de event trigger.

## Aplicação autorizada e realizada

Após autorização expressa da professora, aplicadas exclusivamente no projeto dedicado, nesta ordem:
1. `202611140001_radioquiz_schema.sql` (fundação existente, preservada).
2. `202611140002_radioquiz_engine.sql` (motor e segurança preparados nesta etapa).

Isso cria as tabelas/funções do RADIOQUIZ e adiciona somente `radioquiz_signals` à publicação Realtime. Não altera outros projetos nem contrata recursos. A professora autorizou a aplicação em 14/11/2026. As duas migrações foram confirmadas no serviço: `20261114210508_radioquiz_schema` e `20261114210545_radioquiz_engine`. O e-mail administrativo foi configurado exclusivamente na tabela privada, sem publicação no código.

Próximo passo: configurar e testar Auth anônimo e login confirmado da professora, implementar interfaces, executar testes HTTP/Realtime e somente então publicar `/radioquiz/`. Não enviar e-mail automaticamente nem inventar senha.

## Recuperação

Antes de qualquer publicação da interface, preservar a branch de backup. Reverter os arquivos de `/radioquiz/` para o commit inicial recupera a prévia sem tocar no restante do site. Não apagar o banco para reverter uma tela. Se a migração ainda não tiver sido aplicada, basta não aplicá-la. Após aplicação com dados de alunos, qualquer reversão de banco exige plano separado que preserve os registros.

## Verificação remota após aplicação

O arquivo `tests/remote-smoke.sql` passou no PostgreSQL do Supabase. Em transação revertida, criou identidades sintéticas, questionário, sala e três duplas; iniciou questão, registrou respostas, recusou duplicatas, impediu leitura de biblioteca por aluno, calculou pontos, verificou projeção sem ranking e encerrou com histórico. As identidades foram simuladas dentro da transação; isso não testa autenticação por token HTTP ou conexões simultâneas.

A conferência posterior confirmou zero salas e zero contas sintéticas remanescentes, uma entrada administrativa privada, nove tabelas com RLS, API inacessível ao papel `anon` e tabela de perguntas sem leitura direta por `authenticated`. Apenas `radioquiz_signals` pertence à publicação Realtime.

Os avisos informativos de RLS sem políticas nas tabelas fechadas são esperados: o acesso direto foi revogado e o acesso ocorre pela API validada. Os dois avisos preexistentes sobre o event trigger `rls_auto_enable` permanecem para revisão; nenhuma permissão foi alterada nessa função da plataforma.

A configuração de provedores Auth exige painel web, pois o conector não oferece essa operação. O navegador não estava autenticado. A opção ChatGPT foi selecionada no formulário seguro, mas a continuação da autenticação foi bloqueada pela revisão automática por exigir autorização específica do método/conta. Não houve mudança nas configurações Auth. Não solicitar senha no chat.

## Interfaces conectadas — 15/11/2026

Implementados na branch de desenvolvimento: entrada das duplas com sessão Auth anônima; login/cadastro separado da professora; editor de questionários com quatro alternativas, gabarito, explicação, tempo/pontos, assunto e imagem HTTPS; importação/exportação JSON; seleção individual de perguntas de vários questionários; configuração de sala; controles de início/encerramento/avanço; projeção sem ranking; confirmação de envio; pontuação e classificação nos celulares; bloqueio e liberação; histórico e exportação de resultados. Repetir sala cria uma sala nova com a seleção guardada no mesmo navegador.

A configuração necessária `Allow anonymous sign-ins` foi confirmada habilitada e salva no dashboard. Nenhuma nova migração foi aplicada nesta etapa.

Conferências concluídas nesta etapa:
- `npm run build` gerou o bundle local do SDK com versões fixadas.
- `npm run check` passou para os módulos da aplicação.
- A suíte das 38 verificações locais de PostgreSQL passou novamente.
- Uma chamada real ao Supabase Auth criou sessão anônima; a API retornou `teacher: false` corretamente.
- No navegador, a entrada dos alunos consultou o serviço real e exibiu `PIN não encontrado` para `000000`, liberando o botão para nova tentativa.
- A tela separada de login da professora abriu sem expor painel ou gabaritos para a sessão de aluno.

Pendências objetivas:
- A revisão automática bloqueou a concessão administrativa de uma identidade sintética para teste completo por HTTP/Realtime. Não houve concessão. O teste parou na confirmação de que a sessão ainda não é professora; isso é bloqueio de preparação, não um teste de partida aprovado.
- `tests/live-session.mjs` contém o roteiro do teste simultâneo, mas exige uma identidade temporária autorizada previamente. Só executar com preparação explícita e limpeza dos registros gerados.
- Os testes criaram sessões anônimas descartáveis. A limpeza deve visar apenas os IDs de teste registrados, nunca contas de alunos ou da professora.
- Cadastro confirmado da professora e redirecionamento de confirmação ainda não foram testados.
- Realtime, reconexão distribuída, testes em celulares reais, responsividade completa e teste de carga ainda não foram validados nesta etapa.
- O fluxo administrativo e a partida completa na interface aguardam o teste com a identidade autorizada.
- O sinal Realtime é emitido por resposta e pode alcançar o limite gratuito em rajadas de muitas duplas; a consulta periódica recupera estado, mas a capacidade real de uma turma ainda deve ser medida.

Nenhuma alteração da página principal. Não foi feita publicação desta interface na branch principal nesta etapa.
