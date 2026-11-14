# RADIOQUIZ — plano e conferência de 14/11/2026

## Ambiente confirmado

- Repositório: `patriciaamaralcriativa/patriciaamaralcriativa.github.io`, branch principal `main`.
- Versão preservada: `9ca09e72f4e11e70448a37d6e9f4b70ca30e9f9c`.
- Backup remoto: `backup/radioquiz-20261114-before-engine`.
- A pasta `/radioquiz/` já continha interface visual e uma migração de fundação. Foram preservadas.
- Supabase exclusivo: projeto exclusivo verificado, nome `RADIOQUIZ - UNITERP`, região São Paulo.
- Organização conferida pela conexão autorizada; plano confirmado `free`.
- Inspeção remota: nenhuma tabela pública, nenhuma migração aplicada e nenhuma conta de aplicativo.
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
| 1 | Analisar, preservar, preparar banco e segurança | Análise e migração preparadas; testes locais concluídos; aplicação remota aguarda autorização |
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

## Próxima ação concreta que requer autorização

Aplicar exclusivamente em projeto exclusivo verificado, nesta ordem:
1. `202611140001_radioquiz_schema.sql` (fundação existente, preservada).
2. `202611140002_radioquiz_engine.sql` (motor e segurança preparados nesta etapa).

Isso cria as tabelas/funções do RADIOQUIZ e adiciona somente `radioquiz_signals` à publicação Realtime. Não altera outros projetos nem contrata recursos. A professora pediu confirmação antes de alterar um projeto existente; portanto a aplicação remota ficou aguardando autorização, apesar de este ser exclusivo e estar vazio.

Depois: verificar migrações e segurança no serviço real, configurar e testar Auth anônimo e login confirmado da professora, implementar interfaces, executar testes HTTP/Realtime e somente então publicar `/radioquiz/`. Não enviar e-mail automaticamente nem inventar senha.

## Recuperação

Antes de qualquer publicação da interface, preservar a branch de backup. Reverter os arquivos de `/radioquiz/` para o commit inicial recupera a prévia sem tocar no restante do site. Não apagar o banco para reverter uma tela. Se a migração ainda não tiver sido aplicada, basta não aplicá-la. Após aplicação com dados de alunos, qualquer reversão de banco exige plano separado que preserve os registros.
