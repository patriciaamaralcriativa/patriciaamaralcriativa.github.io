# RADIOQUIZ — verificação de 15/11/2026

## Resultado desta etapa

| Ambiente | Resultado | Limite |
| --- | --- | --- |
| PostgreSQL local (PGlite) | 38 verificações aprovadas | Auth simulado; não representa o serviço HTTP |
| Supabase real por SQL | Fluxo com três duplas aprovado e revertido | Identidades sintéticas dentro de transação; não testa login |
| Supabase Auth/PostgREST/Realtime reais | 16 verificações aprovadas | Uma identidade temporária recebeu permissão de professora, com autorização expressa; não testa a senha ou caixa de e-mail da professora |
| Interface local com JSDOM | 22 verificações aprovadas | Auth/API simulados; não representa aparelhos físicos |
| Navegador, interface conectada ao Supabase real | Entrada por PIN, espera, pergunta, envio, bloqueio de novos envios, resultado, pontos, retomada após recarga e encerramento conferidos | Um navegador; não equivale a três celulares físicos |

## Integração real: 16 verificações

1. API reconhece identidade administrativa temporária explicitamente autorizada.
2. Questionário e três perguntas persistem pelo cliente HTTP.
3. Criação de sala gera PIN de seis dígitos.
4. Três sessões Auth independentes entram como duplas.
5. PIN inválido é recusado.
6. As três sessões recebem a mesma pergunta, sem gabarito antecipado.
7. As três respostas enviadas simultaneamente são aceitas uma vez.
8. Três tentativas concorrentes de duplicar a resposta da primeira dupla são recusadas.
9. Pontuação e feedback ficam ocultos até o encerramento.
10. Pontos por acerto e penalidade por erro são calculados no servidor.
11. O payload da projeção não contém ranking nem lista de integrantes.
12. Uma mudança do servidor é entregue pelo WebSocket do Realtime.
13. Um novo cliente retoma a sessão existente e recupera a resposta registrada.
14. Resposta tardia é recusada. O prazo da sala de teste foi antecipado por administrador para esta verificação.
15. O servidor reconcilia o encerramento por tempo.
16. A partida encerrada conserva as três respostas no histórico.

## Conferência visual

Na sala descartável da interface, a dupla de teste entrou pelo PIN e respondeu à primeira pergunta pelo botão. O servidor atribuiu a pontuação de acordo com o tempo de resposta. Recarregar a página e usar Retomar minha última sala preservou a resposta e os pontos. A competição foi encerrada. A captura da conferência foi mantida apenas para revisão local e não foi publicada no repositório.

Durante a conferência foi identificada uma mensagem de espera ainda visível após a revelação; o texto foi corrigido para indicar resposta registrada naquela pergunta. As verificações de sintaxe e da interface foram executadas após a correção.

## Limpeza autorizada

As duas salas e o questionário da professora temporária foram removidos, assim como a entrada administrativa de teste. As sessões e as identidades Auth explicitamente registradas como testes foram removidas. Não foram removidos alunos, contas pessoais, tabelas, migrações ou a autorização da professora real. A conferência do banco confirmou zero salas/questionários de teste e zero professoras temporárias, com uma autorização real preservada.

## Pendências reais

- Salvar a URL pública e o retorno exato da professora no Supabase Auth, que ainda aponta para o endereço local inicial. A configuração está preparada sem salvar; exige confirmação da professora antes da mudança.
- Testar o recebimento e uso do link por e-mail pela professora, sem inventar credenciais ou enviar mensagem automaticamente.
- Publicar a interface de desenvolvimento em `/radioquiz/` após o ajuste e as verificações finais.
- Validar em computador e celulares físicos distintos, incluindo perda real de internet e capacidade da turma.
- Medir/corrigir eventual excesso de mensagens em rajadas de muitas respostas no plano Free. A consulta periódica complementa o WebSocket, mas não equivale a um teste de carga.
- Implementar os recursos especiais somente após a validação da competição básica pela professora.

Nenhuma cobrança ou mudança nos demais projetos foi realizada nesta etapa.
