# AMARAL RAD — execução de testes DICOM sintéticos

Data: 2026-11-13

## Escopo
Leitor: `_workstation-integration/mamografia-dicom-inspector.js`
Bateria: `testes-dicom-sinteticos.html`

Execução do código JavaScript real obtido da ramificação de desenvolvimento, em runtime JavaScript isolado com substitutos mínimos para `document`, `TextEncoder` e `TextDecoder`. **Não foi um teste no navegador.** Nenhum arquivo clínico foi utilizado.

## Resultado
**10 passaram; 0 falharam**.

1. API disponível
2. Identifica dois frames e modalidade MG
3. Frames distintos preservam ordem de pixels
4. Rejeita frame fora do intervalo
5. Rejeita Pixel Data incompleto
6. Rejeita High Bit incompatível
7. Rejeita Samples per Pixel diferente de 1
8. Rejeita Transfer Syntax ausente
9. Rejeita sintaxe comprimida não suportada
10. Rejeita arquivo sem preâmbulo Part 10

## Limitações
- Testes sintéticos cobrem somente uma pequena parte do padrão DICOM e do pipeline de pixels.
- Não foram executados testes no Chrome, com canvas real, arquivos DICOM clínicos, sequências funcionais, VOI LUT, Presentation LUT, transferência encapsulada/comprimida ou calibração de monitor.
- Não comprova fidelidade diagnóstica, anonimização, compatibilidade DBT nem aptidão para uso clínico.
- O leitor permanece experimental, em branch isolada. A versão oficial da Workstation não foi modificada.

## Próximas verificações
Executar no navegador, adicionar testes de MONOCHROME1, pixels assinados de 16 bits, janela DICOM e limites de memória; validar estudos de referência anonimizados com software DICOM confiável antes de integração.

## Ampliação da bateria — execução subsequente

Foram adicionados cinco casos sintéticos: MONOCHROME1, 16 bits assinados, janela DICOM, índice de frame negativo e limite de 500 frames. Execução em runtime JavaScript isolado, com substitutos de APIs do navegador: **15 passaram; 0 falharam**. Ainda não houve execução no Chrome ou validação com estudos DICOM reais. O algoritmo de janela permanece simplificado e não implementa integralmente a apresentação DICOM.


## Consolidação de validação geométrica — 60 testes sintéticos (13/11/2026)

**Execução atual:** 60 aprovados, 0 falhas. O código JavaScript do leitor e o script da página de testes foram obtidos diretamente da ramificação `dev/tomossintese-mamaria-20261113` e executados em runtime JavaScript isolado com implementações simuladas de APIs de navegador. Este resultado **não** comprova funcionamento no Chrome, renderização com canvas real ou compatibilidade com estudos clínicos.

### Evidências confirmadas apenas pelos testes sintéticos
- Identificação de metadados DICOM Part 10, transfer syntax não comprimida suportada e SOP Class de tomossíntese mamária.
- Identificação e contagem estrutural de itens de sequências funcionais com comprimentos definidos; rejeição conservadora de truncamentos.
- Extração limitada de posição e orientação DICOM de itens aninhados e associação observacional aos índices dos frames.
- Consolidação preliminar de atributos compartilhados e por frame, preservando sua proveniência.
- Detecção de diferenças entre atributos, componentes ausentes, vetores de orientação não unitários ou não ortogonais.
- Cálculo exploratório de normais dos planos, projeções assinadas, distâncias consecutivas, projeções repetidas e desvios da mediana.

### Observações exploratórias — não equivalem a validação geométrica
- Índice do frame representa a ordem no arquivo, **não** a ordem anatômica dos cortes.
- Comparações de orientação e espaçamento utilizam tolerâncias preliminares; diferenças podem ser legítimas conforme a aquisição.
- O resumo de regularidade considera a ordem de armazenamento e usa tolerância relativa experimental de 5%, não um critério clínico.
- O cálculo de projeções não valida reconstrução, espessura dos cortes, direção de aquisição ou correspondência anatômica.

### Limitações e bloqueios preservados
- O leitor não interpreta todos os tipos de sequência DICOM, incluindo sequências de comprimento indefinido e estruturas aninhadas mais complexas.
- Não há suporte validado para todas as transfer syntaxes, compressões, VOI LUT/Presentation LUT e regras completas de apresentação.
- Não houve teste real em Chrome/Firefox, com canvas real, dados de referência ou comparação com visualizador DICOM validado.
- Não houve validação clínica, diagnóstica, de anonimização ou de conformidade completa com DICOM.
- **A renderização de objetos DBT continua bloqueada** até validação apropriada; a versão oficial da Workstation não foi alterada.

### Próximas ações recomendadas
1. Executar a bateria em Chrome e Firefox reais e registrar ambiente, console e resultados.
2. Testar casos sintéticos com sequências de comprimento indefinido, dados malformados e limites de recursos, sem abrir a renderização DBT.
3. Conferir a interpretação de atributos específicos da modalidade com documentação DICOM e estudos de referência devidamente anonimizados.
4. Comparar metadados e geometria com software DICOM de referência antes de considerar qualquer integração à Workstation.


## Atualização de execução — 78 testes sintéticos e bloqueio do Chromium (13/11/2026)

- A bateria ampliada em `testes-dicom-sinteticos.html` alcançou **78 testes sintéticos aprovados, 0 falhas**, executados em runtime JavaScript isolado, incluindo quatro verificações com **Canvas simulado**. A expressão “Canvas 2D disponível” na página não prova, isoladamente, execução em navegador real.
- Foram adicionadas verificações de rejeição antecipada para índices de frame inválidos (negativo, fracionário, textual, `NaN`, `Infinity`, `null` e booleano), limite de frames, ausência de Transfer Syntax UID, Pixel Data incompleto, ausência de contexto 2D, DBT e grupos funcionais multiframe.
- **Tentativa real de navegador neste ambiente:** Chromium disponível em `/usr/bin/chromium`; comando headless com `--no-sandbox --disable-gpu --disable-dev-shm-usage --disable-background-networking --dump-dom` sobre uma página HTML local mínima não retornou documento em 12 segundos (encerramento por timeout, status 124). Isso **não é resultado de teste DICOM** e não prova falha do leitor.
- **Bloqueio de homologação:** a suíte integrada de 78 testes **não foi executada no Chromium real**; não houve conferência visual ou de pixels em browser integrado ao leitor. Não declarar validação de navegador, compatibilidade DBT, anonimização ou uso diagnóstico.
- **Próximo passo obrigatório:** executar a suíte integral em navegador funcional, salvar JSON de resultados, registrar versão do navegador e console, conferir os quatro testes Canvas reais e comparar imagens DICOM de referência devidamente anonimizadas com visualizador validado.
- **Preservação:** nenhuma mudança na branch principal; renderização de tomossíntese continua bloqueada.
