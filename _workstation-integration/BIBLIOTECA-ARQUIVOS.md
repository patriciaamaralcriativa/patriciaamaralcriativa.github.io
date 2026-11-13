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
