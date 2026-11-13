# AMARAL RAD — validação em navegador e avanço dos módulos mamários

13/11/2026 · Ramificação exclusiva: `dev/tomossintese-mamaria-20261113` · Continuação de `659e87d`.

**Resultado: 80/80 testes DICOM sintéticos, incluindo Canvas 4/4, e 21/21 testes de interface aprovados em Chromium real headless.** Mamografia e tomossíntese receberam recursos didáticos e correções. A renderização DICOM de tomossíntese permanece bloqueada. Não houve publicação oficial, mesclagem ou validação clínica/diagnóstica.

## Execução verificável

- Código testado: `35d063093000dd2dbab33c257fc7b3e2bc427f86`.
- [Execução final no GitHub Actions](https://github.com/patriciaamaralcriativa/patriciaamaralcriativa.github.io/actions/runs/43442081186), job `131941970257`.
- Ambiente: Ubuntu 22.04, Playwright 1.56.1, Chromium **141.0.7390.37**, headless com sandbox habilitado.
- Artefato: `14046335789`; SHA-256 `e31743652970ce3499abcd80b99f8b418b31f264c0df6374ab67aae6c5419341`. ZIP baixado, hash comparado e integridade verificada. Contém JSONs e capturas desktop/celular.
- Artefatos do Actions têm retenção de 14 dias, até 27/11/2026. Os JSONs finais ficam também versionados em `evidence/dicom-browser-real-20261113/`.
- Celular: viewport de 390 × 844 no navegador desktop; **não** é teste em aparelho Android/iOS físico. Desktop: 1280 × 900.

| Bateria | Execução real | Aprovados | Falhas | Não executados |
|---|---|---:|---:|---:|
| Página `testes-dicom-sinteticos.html` | Chromium / GitHub Actions | 80 | 0 | 0 |
| Canvas, subconjunto da bateria acima | Canvas 2D real | 4 | 0 | 0 |
| Módulos e controles | Chromium / GitHub Actions | 21 | 0 | 0 |

Não são 84 testes DICOM: os quatro de Canvas integram os 80. Os antigos 76 testes em VM permanecem identificados como simulação e não são somados aos resultados reais. O texto conservador “navegador real não comprovado” na página de testes refere-se ao autorrelatório do cliente; a evidência externa de execução real é o job, com versão de navegador, exportação JSON e capturas.

### Console

Nenhum erro JavaScript capturado nas duas baterias finais. Há aviso de desempenho do Canvas sobre `willReadFrequently` nas leituras repetidas de pixels. Ele não indica falha da asserção ou validação clínica. Os registros completos coletados estão nos JSONs finais; mensagens de preparação do runner pertencem ao log do Actions.

## Como o bloqueio foi resolvido

Não houve repetição de inicializações do Chromium no ambiente local que nega sockets. A validação foi transferida para um runner independente do GitHub Actions, limitado à mesma ramificação e com permissão `contents: read`, sem credenciais persistidas no checkout e sem acesso a bancos, bibliotecas privadas ou serviços de produção.

A primeira execução de CI (`9813461`, run `43439810206`) falhou na instalação: `ubuntu-latest` selecionou Ubuntu 26.04, incompatível com a versão fixada de Playwright. O commit `d4b4f3a` fixou Ubuntu 22.04; a execução `43440003197` aprovou os 80 testes e os quatro de Canvas. Isso corrige a configuração da CI, não o ambiente local restrito.

A primeira revisão de interface (`0fa7dd0`, run `43441049639`) aprovou 19 verificações e encontrou uma falha de largura no celular. O commit `06a7567` limitou os controles à largura disponível e separou a verificação das duas páginas. A revisão visual adicional reorganizou a tabela de CC/MLO em cartões no celular (`35d0630`). A execução final desse código aprovou as 21 verificações. Os testes foram repetidos por mudanças e falhas concretas.

## Recursos entregues

- Navegação recíproca entre mamografia, tomossíntese, testes DICOM e seção prática, com indicação do módulo ativo.
- Laboratório numérico com quatro quadros sintéticos sem anatomia, anterior/próximo, centro/largura de janela, MONOCHROME1/2 e restauração. Usa o leitor existente e Canvas real. Não representa mama, lesão ou aquisição DBT.
- Roteiros de CC (craniocaudal) e MLO (mediolateral oblíqua), com estruturas e critérios descritos em texto, sem setas ou identificação anatômica automática.
- Checklist docente separado por incidência, contagem de itens e limitações, limpeza e retenção apenas em memória durante a sessão.
- Seis questões de raciocínio com correção comentada e reinício, sem vínculo com contas, notas ou progresso dos alunos.
- Explicações de compressão, aquisição, reconstrução e leitura orientada, com referências primárias. Diferencia percorrer uma pilha pronta de reconstruir imagens.
- Avisos de uso experimental e de bloqueio DBT; apresentação adaptada à largura do celular.

## Correções comprovadas

| Problema | Correção | Evidência |
|---|---|---|
| PNG girado 90° era exportado com dimensões originais, podendo recortar a imagem | Inverte dimensões de saída nas rotações de 90°/270° | PNG sintético 40 × 20 exportado como 20 × 40 |
| Callback DICOM podia recolocar imagem após limpar | Revisão de estado invalida callback antigo | Limpeza durante `toBlob` atrasado mantém viewport vazio |
| Troca/limpeza deixava identificação e deslocamento incoerentes | Troca também o deslocamento; limpeza remove identificações e inspeção | Troca/limpeza e títulos exercitados; revisão do código de deslocamento |
| DBT podia habilitar controles antes de a renderização ser rejeitada | Rejeição antecipada na interface; mantém comandos desabilitados | Arquivo DBT sintético rejeitado nos dois módulos |
| Sem série, comandos PNG e DICOM permaneciam acionáveis | Estado desabilitado inicial e após limpeza; limites de frame atualizados | Verificação de comandos, alternância de pixels e limpeza |
| Substituição de série preservava conferência/identificação anterior | Nova série e remoção reiniciam estado | Ordenação, inversão, referência e remoção conferidas |
| Arquivo com extensão/MIME PNG podia não ser uma imagem decodificável | Decodificação antes de substituir a série; limites de 500 arquivos, 300 MB e 20 milhões de pixels/imagem | PNG inválido rejeitado; limites adicionais revisados em código, sem teste de carga máximo |
| Mensagens afirmavam que nunca havia exibição DICOM | Texto distingue inspeção e prévia limitada de pixels | Revisão textual |
| Controles extrapolavam a largura de celular | Larguras máximas e mínimos de grade corrigidos | Ambas as páginas sem overflow horizontal em 390 px |

O leitor `_workstation-integration/mamografia-dicom-inspector.js` e a bateria original permaneceram idênticos ao commit inicial. Blob do leitor: `fc6751ea3a8e60068353b9c7fdbf2798555a0c9b`.

## Preservação, backup e commits

Foram alteradas somente as duas prévias experimentais e acrescentados arquivos de ensino, testes, evidências e configuração de CI. Workstation oficial, página inicial, sala de aulas, cadastros, estudos, bibliotecas e progresso não foram modificados ou acessados para escrita.

O backup completo inicial continua disponível no pacote anterior. Antes das alterações desta missão foi criado e verificado o complemento `backup-659e87d.bundle`, que contém o commit `659e87d` e exige `6dbe121` como base. SHA-256 do complemento: `754140150f20b4856c04126acbcb9ae51b259482c5788ac1441aea9e88046821`.

| Commit | Entrega |
|---|---|
| `659e87d` | Ponto de partida, scripts e evidências anteriores |
| `9813461` | Configuração inicial de testes em GitHub Actions |
| `d4b4f3a` | Runner Ubuntu compatível; primeira aprovação real 80/80 |
| `0fa7dd0` | Recursos didáticos, correções dos controles e testes de interface |
| `06a7567` | Correção de largura e aprovação 80/80 + 21/21 |
| `35d0630` | Legibilidade de CC/MLO no celular; aprovação final 80/80 + 21/21 |

O commit que acrescenta este relatório e os JSONs finais é apenas documental, filho de `35d0630`; não altera os arquivos de produto testados. Seu SHA consta no histórico do relatório e no manifesto do pacote de entrega.

Para recuperar o estado inicial sem sobrescrever o trabalho atual: use o backup completo anterior para recuperar `6dbe121`, importe o complemento com `git fetch /caminho/backup-659e87d.bundle HEAD` e crie uma ramificação local de recuperação em `659e87d`. Alternativamente, o commit inicial permanece no histórico remoto. Não faça reset nem restaure a versão oficial.

## Limitações e próximo passo

- Aprovou-se comportamento técnico com **dados sintéticos**, não conformidade integral DICOM, compatibilidade com fabricantes ou fidelidade diagnóstica.
- DBT DICOM permanece bloqueado pelo leitor, inclusive quando há Canvas disponível. Contagem, orientação, espaçamento e ordem espacial não foram promovidos a validação geométrica.
- Não foram usados exames clínicos, não foi certificada anonimização e não se testaram aparelhos físicos, monitores diagnósticos, arquivos máximos ou todas as transfer syntaxes.
- Leitura de compressões encapsuladas, Modality LUT, VOI LUT por sequência, Presentation LUT e calibração diagnóstica continuam fora do suporte validado.
- Próximo passo para DBT real: conferir atributos compartilhados/por frame, geometria e apresentação em estudos de referência previamente anonimizados e autorizados, comparando com visualizador confiável. O êxito dos testes sintéticos não autoriza liberar esse bloqueio.
- Publicação oficial e mesclagem não foram executadas e dependem de autorização específica.

## Referências do material didático

- [NHS — Guidance for breast screening mammographers](https://www.gov.uk/government/publications/breast-screening-quality-assurance-for-mammography-and-radiography/guidance-for-breast-screening-mammographers): critérios CC/MLO, compressão e avaliação técnica.
- [FDA — Frequently Asked Questions About Digital Mammography](https://www.fda.gov/radiation-emitting-products/mammography-information-patients/frequently-asked-questions-about-digital-mammography): aquisição digital e princípio de DBT.

Referências consultadas em 13/11/2026; o conteúdo não substitui o protocolo do serviço nem a supervisão docente.
