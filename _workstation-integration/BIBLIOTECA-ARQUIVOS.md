# Biblioteca de arquivos — primeira versão local

## Escopo e uso

`biblioteca-arquivos.html`: categorias Raio-X, Tomografia, Mamografia e Tomossíntese; Ressonância apenas como expansão indisponível. A categoria indica a organização escolhida pelo usuário, não um resultado de inspeção da modalidade DICOM.

O armazenamento IndexedDB `amaral-rad-arquivos-v1` pertence à origem e ao perfil do navegador. **Não sincroniza entre contas, computadores ou alunos.** Não equivale ao acervo privado nem cria compartilhamento remoto. A professora pode exportar um pacote `.arlib` e distribuí-lo por um canal autorizado; o aluno importa esse pacote uma vez no seu navegador e escolhe o arquivo nos visualizadores. Para um catálogo central sem essa transferência, permanece necessária uma integração com armazenamento privado e permissões docentes, fora desta etapa que preserva o banco de produção.

A página informa claramente o alcance local, risco de perda ao limpar dados e que não existe separação por conta dentro do mesmo navegador. Em computador compartilhado não guardar material privado. Pacotes contêm os arquivos originais e não são criptografados.

## Funções

- Guardar PNG/JPEG ou DICOM com preâmbulo e assinatura compatível. Até 300 MB/arquivo e 1 GB/conjunto. Um conjunto não é automaticamente uma série ou estudo.
- Título, origem e licença/autorização obrigatórios; confirmação do responsável sobre metadados e identificadores nos pixels. Não é anonimização automática nem certificação de privacidade.
- Buscar, selecionar arquivos individualmente, baixar originais e remover somente cópias do acervo local.
- Exportar e receber pacotes; validar cabeçalho, tamanhos, formatos e limites antes de transação atômica. O pacote não tem assinatura criptográfica nem identifica remetente.
- Aplicar arquivos ao input já existente usando `DataTransfer` e seu evento `change`. Os renderizadores existentes continuam responsáveis pelas restrições, erros e geometria.
- RX: PNG/JPEG no Canvas existente; TC: conjuntos DICOM no leitor de séries existente; mamografia: PNG/JPEG ou inspeção DICOM; tomossíntese: conjuntos de PNG/JPEG ou leitor DICOM restrito à lista já validada. A seleção da biblioteca nunca marca o consentimento DBT.

## Preservação

Nenhuma escrita no Supabase. Nenhuma leitura de dados de alunos, perfis, exames privados ou progresso. Nenhum arquivo DICOM real ou radiografia foi incluído no GitHub. O acervo começa vazio. Os testes usam um padrão geométrico explicitamente sintético, sem anatomia.

Os scripts originais de `amaral-rad.html` e `sala-de-aulas.html` permanecem byte a byte iguais ao baseline. Um script externo independente acrescenta botões e um adaptador ao srcdoc da Workstation; mensagens aceitas apenas da janela conhecida, e o seletor usa origem, janela e token. O iframe da Workstation continua sem `allow-same-origin`.

## Arquivos

- `file-library-store.js`: IndexedDB e pacotes binários ARLIB v1 (7 bytes de assinatura, 4 bytes little-endian para tamanho do JSON, catálogo JSON e blobs concatenados).
- `file-library-page.js`: catálogo local, formulários, busca, download e seleção.
- `file-library-host.js`: integração isolada com inputs dos módulos e srcdoc existente.
- `file-library.css` e `biblioteca-arquivos.html`: página responsiva.
- `tests/file-library-browser.cjs` e workflow `file-library.yml`: Chromium real no GitHub Actions, evidências PNG/JSON sem dados médicos.

## Backup e reversão

Antes das alterações: HEAD experimental `1fec2c7070a333a664766fe32add684b1baff59c`; produção `9e84ed65a69df3df8bb9a557cbdc17e5c79f1c21`. Bundle completo verificado: `backup-before-file-library.bundle`, fora do repositório público.

Reverter o commit de publicação por `git revert <commit-publicacao>` e republicar pelo GitHub Pages. Isso remove a interface nova e restaura os HTMLs anteriores, sem excluir o banco IndexedDB local e sem modificar o backend. Exporte os pacotes antes de limpar dados do navegador. O banco local contém somente cópias, e originais escolhidos pelo usuário nunca são modificados.

## Resultado em 13/11/2026

- Implementação: `cbbe80e`; revisão de testes e avisos: `bb8d283`; teste de TC: `c600105`.
- Candidata em Chromium 141.0.7390.37: **23/23** testes da biblioteca e **21/21** regressões educacionais aprovados, execução [43474340717](https://github.com/patriciaamaralcriativa/patriciaamaralcriativa.github.io/actions/runs/43474340717).
- Primeira execução: 21/22, pois o teste esperava que o input de tomossíntese preservasse a seleção; o módulo intencionalmente limpa esse campo. A asserção foi substituída por verificação das dimensões da imagem efetivamente exibida. Não foi alterado o leitor para acomodar o teste.
- Publicação: `14dc42188d0c1c97f395bae1b7baa5b16cacc406`, somente dez arquivos de produto sobre `9e84ed6`, sem mesclar o restante da ramificação experimental. Pages [43474597592](https://github.com/patriciaamaralcriativa/patriciaamaralcriativa.github.io/actions/runs/43474597592) concluído com sucesso.
- No endereço público, Chromium real: **23/23** testes aprovados; dez arquivos servidos com SHA-256 idêntico ao código testado; zero exceções JavaScript. Execução [43474739936](https://github.com/patriciaamaralcriativa/patriciaamaralcriativa.github.io/actions/runs/43474739936). Capturas desktop e 390 px nos artefatos dessa execução. JSONs persistidos em `evidence/library-2026-11-13/`.
- Os testes usam padrões sintéticos, inclusive o volume sintético já existente na Workstation. Isso não constitui nova validação de exames reais, geometria ou diagnóstico. O leitor DBT manteve consentimento obrigatório e rejeitou arquivo fora das sete amostras auditadas.
- Nenhuma escrita no banco de produção; nenhuma utilização de dados de alunos; nenhum arquivo médico real publicado. Teste autenticado com professora/aluno reais não executado nesta etapa. Preservação dos scripts originais conferida por hashes.
- Backup imediatamente anterior à publicação: `backup-main-before-library.bundle`, história completa de `9e84ed6`, verificado. SHA-256 `319941ee08ed052d7d594e915fa6b58e0d172a66aada7458ab88508cae737b31`. A revisão anterior permanece na história pública de `main`.
- Reversão da publicação: `git revert 14dc42188d0c1c97f395bae1b7baa5b16cacc406` seguido do fluxo normal de publicação do Pages. O banco local não é apagado por essa reversão.

Pendências: armazenamento privado central e compartilhamento automático por turma; revisão individual dos materiais que futuramente serão inseridos; testes com grandes acervos e cotas reais dos dispositivos. Para pacotes, manter no máximo 1.000 arquivos e 1 GB; dividir acervos maiores. RM não implementada. Nenhum bloqueio DICOM ou aviso de orientação foi relaxado.
