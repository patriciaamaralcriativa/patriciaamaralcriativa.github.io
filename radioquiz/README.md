# RADIOQUIZ — UNITERP

Plataforma de quiz competitivo para aulas de Radiologia, com partidas em duplas.

## Estado atual
Esta primeira entrega publica a estrutura visual responsiva das telas do professor e dos alunos. **Ainda não cria salas reais nem sincroniza celulares.** Esses recursos dependem da configuração do backend em tempo real e de testes com vários dispositivos.

## Próximas etapas
1. Configurar projeto de backend e políticas de segurança.
2. Implementar criação de sala, PIN, entrada e presença das duplas.
3. Implementar perguntas, temporizador, recebimento de respostas e pontuação no servidor.
4. Testar em vários celulares e no computador do professor.
5. Só então adicionar poderes e recursos especiais.

## Princípios
- Uma resposta por dupla por pergunta.
- O servidor é a fonte oficial de PIN, estado da partida, respostas e pontuação.
- O placar individual das duplas não precisa aparecer na projeção.
- Não armazenar dados pessoais desnecessários dos estudantes.
