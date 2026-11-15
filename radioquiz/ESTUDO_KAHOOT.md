# RADIOQUIZ — estudo do Kahoot e prioridades de produto

Data: 15/11/2026. Pesquisa documental em páginas oficiais públicas. Não inclui teste de conta paga, medição de desempenho do Kahoot ou reprodução de seus elementos proprietários.

## O que sustenta a experiência

1. Entrada por PIN, link direto ou QR, normalmente sem conta do participante [1].
2. Sala de espera visível, personagens personalizáveis e preparação coletiva [2].
3. Perguntas, alternativas grandes, tempo delimitado, confirmação e revelação do resultado. Perguntas e respostas também podem aparecer nos dispositivos dos participantes [3].
4. Música de entrada, efeitos sonoros opcionais, contraste ajustável e controles do anfitrião [3].
5. Competição com acerto e velocidade no modo Classic; modo Accuracy pontua somente o acerto [4]. Não apresentar precisão como uma exclusividade inexistente do RADIOQUIZ.
6. Equipes em dispositivo compartilhado ou dispositivos pessoais; o primeiro modelo inclui um intervalo de conversa antes das respostas [5].
7. Biblioteca com diferentes tipos de pergunta; disponibilidade varia por assinatura [6].
8. Relatórios por participante e questão, identificação de dificuldades e possibilidade de revisão direcionada [7].

## Decisões para o RADIOQUIZ

| Área | Adaptação proposta | Situação no RADIOQUIZ |
| --- | --- | --- |
| Entrada | Manter PIN e acrescentar QR/link que preencham o PIN, sem incluir credenciais administrativas | PIN na versão básica; QR/link implementados e testados na prévia |
| Duplas | Nome, dois integrantes, um dispositivo autorizado a responder | Base implementada; manter autorização e resposta única no servidor |
| Mascotes | Personagens próprios com cores, acessórios e reações; evitar depender de movimentos para compreender o jogo | Editor e animação em prévia local; sincronização remota ainda pendente |
| Som | Música original de espera e efeitos distintos; controle simples para a professora; evitar uma sala inteira tocando a mesma música em celulares | Efeitos sintetizados opcionais na prévia; trilha de espera a implementar |
| Perguntas | Quatro alternativas com letra e cor; radiografia ampliável sem cortes automáticos nem alterações anatômicas | Múltipla escolha e imagem opcional na base; ampliação e novos tipos precisam desenvolvimento |
| Raciocínio | Intervalo opcional para discutir antes de liberar resposta; pontuação por acerto ou acerto com bônus de rapidez | Bônus de rapidez existente; conversa e modo somente acerto a implementar |
| Projetor | Mostrar pergunta, tempo, participação e distribuição anônima de respostas; explicação ao encerrar | Proibição de ranking já faz parte da base; distribuição anônima a ampliar |
| Ranking | Pontuação e classificação no celular e painel administrativo | Base implementada; não levar ranking/pódio identificado ao projetor |
| Biblioteca | Seleção visível de múltiplos bancos, filtros e importação simples com prévia e validação | Editor/seleção/importação JSON na base; importação CSV e melhorias a implementar |
| Aprendizagem | Percentual de acertos por questão/assunto e revisão das questões difíceis | Histórico básico existente; análise pedagógica e exportação a ampliar |
| Reconexão | Recuperar dupla e estado do servidor, sem perder resposta/pontos | Fluxos básicos testados; falta validar interrupções e carga simultânea em aparelhos físicos |
| Poderes | Escudo, dobro e roubo com limites explícitos e eventos registrados no servidor | Etapa posterior; não misturar os pontos de jogo com a medida de acertos |

Os estados acima se baseiam na documentação e no código do projeto. A versão visual é um rascunho; não está publicada. Testes locais não equivalem a testes de celulares físicos. A publicação do banner pessoal e a migração de aparência continuam sujeitas à autorização específica pendente; esta pesquisa não altera banco nem produção.

## Ordem de implementação recomendada

### Primeiro: uma aula sem obstáculos

- Preparação com resumo de disciplinas, bancos e total de questões.
- Entrada por PIN, QR ou link; status de conexão claro.
- Jornada da professora com uma ação principal por fase: iniciar, encerrar questão, próxima questão.
- Confirmar envio e impedir duplicidade, resposta tardia ou alteração de pontos no servidor.
- Validar partida com professora e três duplas, inclusive queda e retorno de conexão. Registrar separadamente testes automatizados, navegadores independentes e aparelhos físicos.

### Depois: diversão com legibilidade

- Concluir mascotes compartilhados e visual original, com som e animação opcionais.
- Reações curtas entre questões; durante a leitura, preservar o espaço da pergunta e da imagem.
- Acrescentar conversa em dupla e modo de pontuação por acerto.
- Manter o resultado da pergunta acompanhado de explicação, sob controle da professora.

### Em seguida: vantagem para o ensino de Radiologia

- Ampliação de imagens preservando proporção, orientação e marcadores.
- Questões de casos, verdadeiro/falso e ordenação de procedimentos, cada tipo com validação e testes próprios.
- Relatórios de aprendizagem por assunto e preparação de nova rodada com as questões que tiveram mais erros.
- CSV validado com prévia antes de salvar.
- Poderes competitivos separados da avaliação pedagógica; habilitação opcional pela professora.

Não contratar serviços nem prometer capacidade ilimitada. A infraestrutura gratuita precisa de verificação de limites e testes de carga antes de definir o tamanho suportado de uma turma.

## Critério para afirmar que melhorou

Comparar o RADIOQUIZ com as necessidades da professora, sem declarar superioridade geral ao Kahoot: entrar com menos ajuda; conduzir uma aula sem telas confusas; preservar pontuação após reconexão; não projetar rankings; interpretar imagens com legibilidade; recuperar as dificuldades da turma no relatório. Medir esses resultados em testes reais antes de divulgar promessas.

## Fontes oficiais consultadas

1. [Como participar: PIN, link ou QR](https://support.kahoot.com/hc/pt-br/articles/360039890713-Kahoot-participar-Como-participar-de-um-Kahoot-kahoots)
2. [Personagens e personalização](https://support.kahoot.com/hc/pt-br/articles/10712953904147-Como-utilizar-as-personagens-do-jogo)
3. [Configurações de jogos ao vivo](https://support.kahoot.com/hc/pt-br/articles/115016055107-Configura%C3%A7%C3%B5es-de-jogos-ao-vivo)
4. [Classic e Accuracy](https://support.kahoot.com/hc/en-us/articles/39818967108627-Accuracy-experience-How-to-host-a-kahoot)
5. [Jogo em equipes](https://support.kahoot.com/hc/en-us/articles/4408679135891-Team-experience-How-to-play-kahoot-in-groups)
6. [Tipos de perguntas](https://support.kahoot.com/hc/en-us/articles/115002308428-Kahoot-question-types)
7. [Relatórios e análise de dificuldades](https://support.kahoot.com/hc/en-us/articles/360035063054-Kahoot-quiz-reports)
