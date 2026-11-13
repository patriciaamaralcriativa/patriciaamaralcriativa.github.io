# Validação técnica DICOM experimental — AMARAL RAD

> Registro histórico do ponto de partida `659e87d`. A pendência de navegador foi resolvida posteriormente: 80/80 DICOM e 21/21 interface em Chromium real. Consulte [o relatório de avanço](AVANCO-MAMOGRAFIA-TOMOSSINTESE-2026-11-13.md) e seus JSONs para o resultado atual. As seções abaixo preservam o registro inicial.

Data: 13/11/2026. Ramificação exclusiva: `dev/tomossintese-mamaria-20261113`.

**Resultado: validação em navegador pendente por bloqueios do ambiente.** Não há aprovação clínica ou diagnóstica. Nenhum dado de paciente foi utilizado.

## Identificação e preservação

- Commit de origem testado: `6dbe1218ce5b360ae08782cfca4a3cb2e0157d2f`.
- Backup criado antes de qualquer edição: `backup-before-validation.bundle`, com histórico completo até HEAD; integridade conferida por `git bundle verify`.
- SHA-256 do backup: `2ee02db666dee1f2c665d604e9b8db4006d9f556fa0b520a25ae343355145992`.
- Nenhuma alteração no leitor, nas prévias existentes, na Workstation oficial, nos cadastros, nas bibliotecas ou nos estudos originais. Não foram acessados serviços de autenticação ou dados privados.
- Esta entrega acrescenta somente relatório, scripts de reprodução e JSONs de evidência na ramificação solicitada. O commit desta entrega é identificável pelo histórico do próprio relatório; seu pai é o commit de origem acima.

## Matriz de resultados

A página contém **80 verificações no total, incluindo quatro de Canvas**. Portanto, não são 80 mais quatro.

| Grupo | Ambiente efetivamente utilizado | Aprovados | Falhas | Pendentes |
|---|---|---:|---:|---:|
| 76 verificações sem Canvas real | Node.js v24.22.1, VM com DOM mínimo simulado | 76 | 0 | 0 |
| Quatro verificações de Canvas | Não executadas | 0 | 0 | 4 |
| Bateria integral no Chromium | Página não carregada | 0 | 0 | 80 |

Os 76 resultados isolados não substituem a execução integral em navegador. A contagem de falhas zero significa somente que nenhuma asserção executada falhou; não significa aprovação dos testes pendentes.

## Investigação do Chromium

Versão informada pelo executável: **Chromium 156.0.8078.79**, Debian GNU/Linux 13 (trixie).

O teste mínimo com Playwright e o binário direto `/usr/lib/chromium/chromium` encerrou com SIGABRT antes da criação da página. Mensagem principal:

```
FATAL:chrome/browser/process_singleton_posix.cc:297] Check failed: . socket() failed: Operation not permitted (1)
```

Depois ocorreu `ptrace: Operation not permitted (1)` no tratamento da falha. A evidência aponta para restrição do ambiente à criação do socket de singleton; não demonstra defeito DICOM. O wrapper `/usr/bin/chromium` também imprime `unexpected operator` ao avaliar espaço de memória compartilhada. Esse aviso não explica sozinho o bloqueio, pois o binário direto também aborta.

A tentativa de navegador remoto para `http://127.0.0.1:42727/testes-dicom-sinteticos.html` recebeu `ERR_CONNECTION_REFUSED`. A tentativa de arquivo local foi rejeitada pela política do navegador, que admite apenas HTTP/HTTPS. Não houve tentativa de contornar a política após a negativa.

**Console da página DICOM: não coletado**, pois ela não abriu. As mensagens acima são stderr de inicialização do processo, não erros de console da aplicação. Não foi produzido screenshot ou JSON de execução real da suíte.

## Conferências efetivamente realizadas

Por inspeção de código e execução isolada dos 76 casos:

- Alternância entre frames 0 e 1 mantém a ordem dos pixels sintéticos; seleção padrão do primeiro frame e limite inclusivo de 500 frames passaram.
- Reconhecimento de janela numérica, limiar de largura 1 e extremos de largura 2 passaram no contexto simulado. O leitor implementa janela linear limitada; não inclui todas as transformações de apresentação DICOM.
- MONOCHROME1 inverte a escala nos casos sintéticos isolados. A confirmação de pixels no Canvas real permanece pendente.
- Índices inválidos, Pixel Data incompleto, ausência de Transfer Syntax, sintaxes não suportadas e limites previstos nos casos executados foram rejeitados.
- O leitor bloqueia objetos reconhecidos pela SOP Class DBT e objetos com grupos funcionais antes de acessar o Canvas. Os testes isolados correspondentes passaram.
- `geometryValidated`, `frameOrderValidated` e os indicadores de ordem espacial continuam falsos. Observações matemáticas de orientação, projeção e espaçamento não validam reconstrução ou geometria clínica.

Os quatro testes pendentes de Canvas verificam: pixels e alfa conhecidos; dimensões e alternância de frames; preservação do Canvas ao rejeitar índice; inversão MONOCHROME1. Esses testes já existem na página e não foram substituídos por mocks nesta execução.

## Alterações e correções

Nenhuma falha do leitor foi comprovada nesta execução; por isso, seu código foi preservado. Não foi feita correção no Chromium, pois os bloqueios observados pertencem ao ambiente de execução e às permissões do navegador.

Foram acrescentados dois scripts: um reproduz a execução isolada, explicitamente sem Canvas real; outro prepara a execução em Chromium com servidor local restrito aos dois arquivos necessários, captura erros de console, versão, exportação JSON e screenshot, e exige 80 aprovações e quatro testes de Canvas para retornar sucesso. O script de navegador passou na checagem de sintaxe, **mas ainda não foi executado com sucesso em navegador**. Não deve ser descrito como homologado.

## Reprodução e pendências

Na raiz da mesma ramificação, com Node.js e Playwright disponíveis:

```bash
node _workstation-integration/tests/dicom-isolated-validation.cjs
node _workstation-integration/tests/dicom-browser-validation.cjs
```

`DICOM_BROWSER_PATH` pode indicar um Chromium instalado. O script mantém o sandbox do Chromium habilitado; um ambiente com suporte normal a sandbox e sockets é necessário. Não altera configuração de segurança do sistema. Resultados do navegador serão gravados em `_workstation-integration/evidence/dicom-browser-run/`; só uma execução bem-sucedida produzirá evidência de aprovação em navegador real.

Pendências para concluir a missão:

1. Executar a página integral em ambiente de navegador funcional; confirmar 80/80 e Canvas 4/4, salvar JSON exportado, screenshot e console.
2. Conferir também os controles das prévias de mamografia e multiframe em navegador, com arquivos sintéticos ou referências previamente anonimizadas. A suíte unitária não comprova sozinha o fluxo da interface.
3. Validar atributos e geometria DBT e comparar referências anonimizadas com visualizador DICOM confiável antes de qualquer liberação futura. **Renderização DBT permanece bloqueada.**
4. Qualquer publicação na versão oficial exige autorização específica; esta entrega não publica nem mescla a ramificação.

## Recuperação

Para recuperar uma cópia independente do estado anterior, sem sobrescrever o trabalho atual:

```bash
git clone -b HEAD backup-before-validation.bundle amaral-rad-recuperada
```

O backup contém a referência HEAD para o commit de origem. Se necessário, pode-se criar uma ramificação local de recuperação dentro dessa cópia. Para retirar somente esta entrega, reverta seu commit na ramificação de desenvolvimento, preservando o histórico. Não restaure nem faça reset da versão oficial.

## Evidências

- `evidence/dicom-20261113/isolated-results.json`: todos os 76 registros executados, ambiente, contagens e indicação explícita de simulação.
- `evidence/dicom-20261113/browser-blockers.json`: versão, mensagens principais, tentativas de inicialização e ausência de console/Canvas real.
- Backup completo entregue separadamente no pacote recuperável.
