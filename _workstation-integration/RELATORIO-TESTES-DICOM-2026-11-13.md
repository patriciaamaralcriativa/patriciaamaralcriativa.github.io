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
