# RADIOQUIZ — visual alegre e mascotes (15/11/2026)

A nova interface usa violeta, turquesa, rosa e amarelo, mantendo contraste e botões grandes. As quatro alternativas têm cores distintas. O banner original está preparado localmente em `assets/radioquiz-banner-alegre.webp`, com referência para a prévia de compartilhamento do endereço do jogo. Sua publicação no repositório público foi bloqueada pela revisão automática e aguarda autorização explícita da professora. O botão de download entrega esse arquivo. A página principal do site não é alterada.

## Mascotes e efeitos

- Quatro personagens, seis cores e quatro opções de acessório (incluindo sem acessório).
- Editor com prévia, persistência local e restauração ao recarregar.
- Cena 3D original construída em Three.js, com iluminação, flutuação, movimento de braços e resposta ao ponteiro.
- Renderização WebGL quando disponível; alternativa SVG com projeção da mesma cena 3D quando WebGL não está disponível; figura vetorial estática como último recurso.
- Sons sintetizados no navegador, sem arquivos de terceiros. Começam desligados; ativação por clique. Feedback de início, envio, resultado e finalização.
- Movimento pausável e respeito à preferência do sistema por movimento reduzido.
- Confetes em acertos e encerramento, sem modificar pontuação ou cronômetro.
- Renderizadores e geometrias são liberados ao sair de uma tela; a cena é preservada durante atualizações da sala para evitar recriar contextos continuamente.

## Compartilhamento do mascote por dupla

A migração `202611150003_radioquiz_mascots.sql` está preparada e testada **somente localmente**. Ainda não foi aplicada ao Supabase. Ela cria uma tabela privada de aparência e decora a resposta da API com o mascote, preservando o motor de perguntas/pontos.

Apenas a própria sessão da dupla pode definir seu mascote; professora, não participante e dupla bloqueada não podem se passar por ela. O servidor aceita somente opções enumeradas, sem HTML, texto livre ou URLs. O bloqueio de linhas segue a ordem sala → dupla do motor existente. A projeção continua sem ranking ou nomes de integrantes.

Até a aplicação autorizada dessa migração, o editor guarda a aparência neste aparelho. As chamadas opcionais de aparência não interrompem entrada, respostas ou pontuação se o recurso ainda não estiver no servidor. A alteração do banco aguarda autorização da professora, conforme a regra de confirmar mudanças no projeto existente.

## Verificação

- 43 verificações locais de PostgreSQL/PGlite, incluindo cinco novas verificações de aparência/autorização.
- 28 verificações locais da UI administrativa, mantendo a separação entre projetor e ranking.
- 14 verificações de mascote/efeitos em JSDOM, com áudio simulado: opções, persistência, callback de sincronização, controles de som/movimento e fallback.
- Build e sintaxe dos módulos passaram.
- No navegador da prévia: editor abriu, personagem/cor/acessório foram alterados, salvamento local funcionou, controles refletiram som ligado e animação pausada. A cena 3D apareceu pela alternativa SVG porque o navegador na nuvem informou WebGL desabilitado.

Não foi conferida a qualidade sonora em caixas físicas nem o desempenho de WebGL/celulares físicos. A migração nova não foi testada no serviço remoto, pois ainda não foi autorizada/aplicada. Os testes reais de partida da versão básica permanecem documentados em `TESTES.md`; não devem ser reclassificados como testes desta extensão.

## Reprodução

```sh
npm ci
npm run build
cd tests
npm ci
cd ..
npm test
npm run check
```

Three.js é fixado em `0.187.0`; o bundle é servido pelo próprio site. Licença em `vendor/LICENSE-three`.

A atualização visual permanece em rascunho até a autorização do banner pessoal e do armazenamento dos mascotes. O endereço público continua na versão básica anterior. A referência ao banner no rascunho será atendida pelo arquivo após a autorização; nenhum substituto com a imagem pessoal foi publicado.

## Convites por QR e link

A prévia inclui PIN, QR gerado localmente e botão de copiar link na sala de espera da professora/projetor. O link contém apenas o endereço do jogo e PIN; parâmetros de professora, identificador de sala e fragmentos de autenticação são removidos. O aluno recebe o PIN preenchido, mas precisa cadastrar a dupla; a validação de entrada continua no servidor. Se a permissão de copiar falhar, o campo é selecionado e a interface explica como copiar. Sem o PIN guardado neste navegador, o convite não é gerado.

Nove verificações específicas passaram, incluindo leitura dos módulos do SVG por um decodificador independente (jsQR) para dois PINs. A tela de entrada por convite também foi conferida no navegador da nuvem. Não houve leitura por câmera física, nem nova migração remota. Biblioteca qrcode 1.5.4 empacotada no próprio site, com licenças preservadas. Total atual: 43 banco local + 28 interface simulada + 14 mascote/efeitos + 9 convites = 94 verificações locais.
