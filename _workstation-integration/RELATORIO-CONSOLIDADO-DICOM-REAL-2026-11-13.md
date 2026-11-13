# AMARAL RAD — relatório consolidado da validação DICOM real e candidata de publicação

13/11/2026. Continuidade confirmada em `e30960a4723e09ae6810ba50f192209d2245305e`, sem alterações locais pendentes no início. Trabalho de implementação na ramificação `dev/tomossintese-mamaria-20261113`.

## Situação de publicação

**PUBLICADA E VERIFICADA.** Após a nova confirmação do usuário, a candidata foi incorporada à `main` pelo merge `9e84ed65a69df3df8bb9a557cbdc17e5c79f1c21`. A árvore publicada é idêntica à candidata aprovada `ed6b8ef93e5da9328984dd88bda4b2f6c8166040`.

- [Acessar Workstation](https://patriciaamaralcriativa.github.io/amaral-rad.html).
- GitHub Pages: run `43468209630`, build e deploy concluídos com sucesso.
- [Verificação do site real — run 43468503265](https://github.com/patriciaamaralcriativa/patriciaamaralcriativa.github.io/actions/runs/43468503265): **22/22 verificações de publicação e 25/25 do leitor**, zero falhas, computador e viewport pequena. Foram abertas todas as sete amostras e conferidos 21 quadros reais/21 Canvas no site publicado, sem override do manifesto.
- A conferência completa anterior de 423/423 quadros permanece válida; o worker publicado é o mesmo validado. Não houve repetição desnecessária de todo o volume.
- Os hashes de 12 arquivos servidos no site, incluindo HTML, JS, CSS, JSON e WASM, coincidem com o código testado. Scripts da Workstation e Sala de Aulas continuam idênticos aos anteriores.
- A `main` anterior era `3de3a42cd3d28e1f369942c76f996679a1e1c290`; o backup integral foi verificado e preservado antes da publicação.
- As duas recusas automáticas anteriores ficam como registro histórico, não como estado atual. Não há pendência de autorização para esta publicação.

## A. Sete arquivos reais

Todos os arquivos têm SOP Class **Breast Tomosynthesis Image Storage**, UID `1.2.840.10008.5.1.4.1.1.13.1.3`, e Transfer Syntax **JPEG 2000 Lossless**, UID `1.2.840.10008.1.2.4.90` (abreviações DBT / J2K-L abaixo). Confirmados diretamente: **7 arquivos, 7 SOP Instances, 7 séries e 7 estudos diferentes**, sem concatenar volumes ou supor um único exame bilateral. Identificadores completos foram conferidos em anexo privado, não publicados no repositório.

| Arquivo | SOP / Transfer Syntax | Estudo / série | Incidência | Lateralidade | Quadros | Decodificação independente | Renderização Chromium | Orientação / erros |
|---|---|---|---|---|---:|---|---|---|
| 42201806-4db1-48a7-91f3-42cc42e131cb.dcm | DBT / J2K-L | ESTUDO-1 / SERIE-1 | CC declarada | L declarada | 58 | 58/58 | 58/58 | Orientação não confirmada |
| e1d481c4-c8bc-4dc3-81b8-0f17e7890097.dcm | DBT / J2K-L | ESTUDO-7 / SERIE-7 | MLO declarada | L declarada | 29 | 29/29 | 29/29 | Orientação não confirmada |
| 7072b7d9-f5c5-46bb-8edf-3408ff0372e2.dcm | DBT / J2K-L | ESTUDO-3 / SERIE-3 | CC declarada | L declarada | 79 | 79/79 | 79/79 | Orientação não confirmada |
| 4926aab5-60ca-49bc-b0ce-802ee498ed65.dcm | DBT / J2K-L | ESTUDO-2 / SERIE-2 | MLO declarada | L declarada | 72 | 72/72 | 72/72 | Orientação não confirmada |
| 94454ed2-4d2a-4373-bb21-2a6d67fb188b.dcm | DBT / J2K-L | ESTUDO-4 / SERIE-4 | MLO declarada | L declarada | 49 | 49/49 | 49/49 | Orientação não confirmada |
| 99d860ab-68c5-48b8-a54d-4e8e97fa13f9.dcm | DBT / J2K-L | ESTUDO-5 / SERIE-5 | CC declarada | L declarada | 77 | 77/77 | 77/77 | Conflito cabeçalho L × heurística R; sem correção automática |
| dc25caea-491f-4c01-a041-237d6a0d123b.dcm | DBT / J2K-L | ESTUDO-6 / SERIE-6 | CC declarada | L declarada | 59 | 59/59 | 59/59 | Orientação não confirmada |

Os números acima corrigem a associação preliminar entre nomes e quantidades: `e1d481c4…` possui 29 quadros; `4926aab5…` possui 72. O sufixo `(1)` de upload foi omitido apenas na apresentação dos nomes. Os arquivos originais não foram renomeados ou modificados.

### Integridade, bits e pixels

Assinatura Part 10, SOP Class/Instance no File Meta e dataset, tamanhos e SHA-256 foram conferidos. As 7 instâncias têm 2457 linhas; as colunas são 1890 ou 1996. Todas usam Bits Allocated 16, Bits Stored 10, High Bit 9, representação sem sinal, uma amostra por pixel e MONOCHROME2. Os valores decodificados respeitam 10 bits. Há um fragmento encapsulado por quadro, tabela básica de offsets vazia e marcadores JPEG 2000 válidos. A tabela vazia foi tratada explicitamente, sem inventar offsets.

Foram decodificados **423/423 quadros** com Pillow 13.0.0 / OpenJPEG 2.5.4 e comparados, integralmente e sem escalonamento, ao decodificador **nativo jpeg2000 do FFmpeg 7.1.5**, que é independente do OpenJPEG. Todos coincidiram pixel a pixel. O teste do FFmpeg remove somente o byte de preenchimento DICOM depois do EOC; não altera o codestream ou o arquivo original. O preenchimento inicialmente provocava mensagens de pacote extra no harness; esse tratamento foi corrigido antes da execução completa. Todos os quadros usam transformação wavelet reversível, também exigida pelo worker WebAssembly.

### Geometria e apresentação

- Frame Anatomy, VOI e transformação de intensidade foram lidos em grupos funcionais compartilhados; posições/orientações nos grupos por quadro.
- Rescale Slope = 1, Intercept = 0, centro/largura de janela = 512/512, apresentação IDENTITY e janela LINEAR nas sete amostras.
- Pixel Spacing não está disponível nos atributos inspecionados; não há medidas em mm.
- Cada objeto repete a mesma Image Position Patient em todos os seus quadros. Vetores de orientação satisfazem normalização/ortogonalidade matemáticas, o que **não valida anatomia**. Não se calculam profundidade ou direção dos cortes a partir desses dados.
- A documentação TCIA avisa sobre orientação/lateralidade incorretas. A heurística de bordas do código dos autores retorna R para `99d860ab…`, apesar de Frame Laterality L. Ela não prova a mama verdadeira; a orientação correta exige identificação externa da incidência. Não foi aplicada rotação ou espelhamento automático.
- Não houve confronto completo de orientação anatômica em visualizador de referência independente com identificação externa confiável. Essa etapa permanece pendente, claramente sinalizada na interface.

## B. Testes e evidências

| Categoria | Execução / evidência | Aprovados | Falhas finais | Bloqueados ou não executados |
|---|---|---:|---:|---|
| Sintéticos DICOM | GitHub Actions `43442081186`, reconfirmado nos logs; nova regressão `43460533288` | 80/80 | 0 | 0 |
| Canvas sintético | Subconjunto dos 80, não somado de novo | 4/4 | 0 | 0 |
| Integridade e identificação reais | Leitura direta e manifesto SHA-256 | 7/7 | 0 | 0 |
| Descompressão independente | OpenJPEG × FFmpeg nativo, pixels completos | 423/423 quadros | 0 | 0 |
| Decodificação/renderização real | Chromium 141.0.7390.37, Playwright 1.56.1, Ubuntu 22.04 | 423/423 quadros | 0 | 0 |
| Comparação de Canvas real | Primeiro, intermediário e último de cada arquivo | 21/21 hashes RGBA | 0 | 0 |
| Leitor e ferramentas DBT | Teste completo, run `43459406851` | 25/25 | 0 | 0 |
| Regressão dos módulos | Mamografia, pilhas PNG, exercícios, estados e telas pequenas | 21/21 | 0 | 0 |
| Integração pronta para publicar | Scripts existentes preservados, arquivos servidos e páginas em 1280/390 px | 22/22 | 0 | 0 |
| Geometria/orientação anatômica | Valores repetidos e referência anatômica externa insuficiente | — | — | 7 objetos não validados |
| Site real após deploy | Run 43468503265, site público em Chromium real | 47/47 verificações, 21 quadros amostrados | 0 | 0 no escopo publicado |

As contagens de ferramentas são grupos de verificações; os 423 quadros e os 21 Canvas são contagens de dados conferidos, não devem ser somados a elas como se fossem uma única suíte.

A primeira execução de browser (`43458393264`) já aprovou 423 quadros e 21 Canvas, mas teve uma falha no teste de pan: o teste arrastava fora da área visível após rolagem automática. O harness passou a levar a viewport à área visível antes do arraste. A execução completa `43459406851` aprovou 25/25. Depois da aprovação completa foi habilitada somente a allowlist exata; as verificações posteriores usam 21 quadros de amostragem e não repetem os 423 desnecessariamente. Na verificação final não houve override do manifesto: `candidateManifestOverride=false`.

Há um aviso de desempenho Canvas sobre leituras repetidas; nenhum erro JavaScript final foi capturado. O heap WASM máximo observado foi 50 MiB; isso não representa toda a memória residente do navegador. O auditor Python observou pico de 554,7 MiB no seu próprio processo e terminou em 180,59 s. O navegador processa um quadro de cada vez em worker e não mantém o volume inteiro descomprimido. O comportamento de hardware móvel físico não foi ensaiado; telas pequenas foram emuladas por viewport.

### Evidências verificáveis

- [Bateria completa com dados reais — run 43459406851](https://github.com/patriciaamaralcriativa/patriciaamaralcriativa.github.io/actions/runs/43459406851), commit `f45aecf5dce6f13b7392fd964165c8b96cf3a31a`.
- [Candidata e pré-publicação — run 43461944037](https://github.com/patriciaamaralcriativa/patriciaamaralcriativa.github.io/actions/runs/43461944037), commit `e1af1fd592556f06a7c6639a8f6976ebb40b9db8`.
- Artefatos baixados e conferidos por SHA-256: `14056515138` (`f0e91c8e7c8363a567377727538e646f63eaa995f3f679facc37d8c97032dc9a`) e `14056677371` (`050c1a28ef0c4cbb617985a8192557287ea25c49b6e3930e6698f15609f38aa2`).
- JSONs preservados em `evidence/real-dbt-20261113/`. Capturas reais das sete amostras e de telas desktop/pequenas seguem no pacote privado. Não são imagens geradas por IA. Artefatos remotos têm retenção de 14 dias; cópias de entrega preservam as evidências.
- No Actions, as cópias foram obtidas diretamente do IDC público e conferidas contra os SHA-256 dos uploads. Nenhum DICOM foi enviado ao repositório ou incluído nos artefatos; as cópias temporárias do runner foram removidas.

## C. Implementação e preservação

| Arquivo / grupo | Finalidade |
|---|---|
| `dbt-validacao-real.html` | Prévia técnica, avisos permanentes, arquivo local e ferramentas |
| `dbt-real-worker.js` | Parser DICOM, validação conservadora, JPEG 2000 Lossless em WASM, um quadro por vez |
| `dbt-real-viewer.js` | SHA-256 local, allowlist, Canvas, janela, zoom, pan, rotação, espelho, restauração e limpeza |
| `dbt-validation-allowlist.json` | Limita a abertura às sete amostras exatamente auditadas; não libera DBT geral |
| `vendor/` | dicom-parser 1.8.21 e codec-openjpeg 1.3.6, fixados e acompanhados das licenças/hashes |
| `mamografia-education.js` | Acesso à prévia restrita e aviso preciso de bloqueio geral |
| `amaral-rad.html` / `sala-de-aulas.html` | Somente CSS e links externos aos módulos, mantendo os scripts byte a byte |
| `_config.yml` | Inclui os assets de diretório com underscore no Jekyll, sem desabilitar o processamento existente |
| Scripts e workflows de testes | Dados públicos em pasta temporária, comparação de pixels, pré-publicação e verificação futura do site |

A candidata de produção contém **20 arquivos**, 18 novos e somente 2 páginas existentes modificadas para acrescentar navegação/CSS. Todos os scripts dessas páginas são idênticos ao estado oficial anterior, conferidos por hashes. O leitor experimental original permanece bloqueando DBT geral e não foi enfraquecido. A versão oficial recebeu somente os acessos aos módulos e arquivos estáticos aprovados. Biblioteca privada, cadastros, turmas, progresso, jogos, questões, aulas e banco de produção não foram alterados. Login com contas reais, controle de aula e permissões de produção não foram retestados, pois seus scripts não mudaram e não se usaram dados de alunos.

## D. Privacidade e licença

Patient Identity Removed declara YES, Burned In Annotation declara NO. Patient Name/ID contêm pseudônimos DBT-P e existem 3 elementos privados por objeto; isso não equivale a certificação de anonimização. OCR de texto esparso em **423 quadros**, reduzidos para até 900 × 1100, não encontrou texto; inspeção visual de 21 quadros não mostrou informações pessoais aparentes. Textos pequenos ou não reconhecidos podem escapar do OCR. Os originais foram preservados fora do GitHub público; identificadores completos e relatório detalhado ficam apenas no anexo privado.

BCS-DBT é disponibilizada sob **CC BY-NC 4.0**, com atribuição e restrição a uso não comercial. A coleção não está liberada para incorporação à Workstation comercial. O código e a licença dos dados são tratados separadamente; a prévia informa explicitamente as limitações e não distribui exames.

Referência: Buda et al. (2020), *Breast Cancer Screening – Digital Breast Tomosynthesis (BCS-DBT), Version 5*. TCIA. DOI [10.7937/E4WT-CD02](https://doi.org/10.7937/E4WT-CD02). [Documentação TCIA](https://www.cancerimagingarchive.net/collection/breast-cancer-screening-dbt/); [código de orientação dos autores](https://github.com/mazurowski-lab/duke-dbt-data). A heurística não substitui validação anatômica independente.

## E. Versões, backup e reversão

| Commit | Função |
|---|---|
| `e30960a` | Estado inicial desta missão |
| `f3d796f` | Candidata ainda bloqueada, decoder e testes reais |
| `f45aecf` | 423/423 quadros e 25/25 verificações completas |
| `30c765a` | Liberação somente das amostras auditadas, sem override nos testes |
| `043f357` | Integração com scripts originais preservados |
| `e1af1fd` | 22/22 verificações ampliadas de pré-publicação |
| `ed6b8ef` | Candidata exata de 20 arquivos, aplicada pelo merge `9e84ed6` |
| `9e84ed6` | Publicação efetiva na main |
| `4f47b12` | Verificação aprovada do site real |

Backup integral da main: `backup-main-3de3a42.bundle`, histórico completo, verificado com `git bundle verify`, SHA-256 `0cd26493f217181e45c51f782e899c799ce08fa0abcd0a1bce8c3dec0d34e1cc`. O backup foi salvo antes das tentativas de publicação. Os backups experimentais anteriores também foram mantidos.

Para reverter esta publicação sem resetar o histórico, use `git revert -m 1 9e84ed65a69df3df8bb9a557cbdc17e5c79f1c21`. Isso reverte somente o merge publicado, preservando o primeiro pai `3de3a42`. Não restaure o banco de dados: ele não foi modificado. Para recuperação isolada do bundle, crie outro repositório e importe `refs/remotes/origin/main` do arquivo sem sobrescrever o checkout atual.

## F. Pendências e situação final

| Componente | Estado | Limite |
|---|---|---|
| Workstation oficial | APROVADO COM RESTRIÇÕES | Publicada em `9e84ed6`, scripts preservados; login com contas reais não foi retestado |
| Mamografia 2D | APROVADO COM RESTRIÇÕES | Testes sintéticos/Canvas e interface; não houve conjunto real 2D dedicado |
| DBT das sete amostras | APROVADO COM RESTRIÇÕES publicadas | Pixels e ferramentas validados; orientação/lateralidade/profundidade não confirmadas |
| DBT geral | BLOQUEADO | Arquivos fora da allowlist, representações e transformações não auditadas |
| Importação DICOM | APROVADO COM RESTRIÇÕES | Exatos SHA-256, JPEG 2000 Lossless, perfil e dimensões conferidos |
| Ferramentas de visualização | APROVADO COM RESTRIÇÕES | Reversíveis e visuais; sem medidas espaciais ou finalidade diagnóstica |
| Interface educacional | APROVADO | Desktop e viewport pequena; sem ensaio em celular físico |
| Publicação e site atualizado | APROVADO COM RESTRIÇÕES | Deploy e 47/47 verificações no site real; limites técnicos e de orientação preservados |

Publicação e verificação do site real concluídas no escopo aprovado. Para orientação anatômica: obter referência externa da incidência/lateralidade e confrontar em visualizador confiável, mantendo os avisos até então. Não há validação clínica, diagnóstica, de conformidade DICOM integral ou de anonimização certificada.

## Evidências da publicação efetiva

Publicado: `9e84ed65a69df3df8bb9a557cbdc17e5c79f1c21`. Verificações do site: JSONs `live-publication-checks.json` e `live-dbt-checks.json`, capturas reais desktop/390 px e artefato `14059388404`, SHA-256 `6d12b4883722297deb139d27973a372008c0708b6e81e04a11252bf892eae5e7`. Os sete DICOM não foram publicados.
