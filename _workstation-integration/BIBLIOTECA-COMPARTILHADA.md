# Biblioteca de arquivos compartilhada — AMARAL RAD

## Fluxo de uso

Professora: abrir Biblioteca de arquivos na sala de aulas → Enviar arquivos para a turma → informar modalidade, origem e permissão → confirmar revisão de privacidade → enviar → Liberar para a turma.

Aluno autorizado: abrir o visualizador → Escolher na Biblioteca → escolher um conjunto liberado → escolher o arquivo (ou conjunto de quadros/série, conforme o campo) → usar no visualizador. Não há exportação obrigatória de pacotes nem cópia prévia em IndexedDB. O catálogo é consultado no servidor, separado dos arquivos locais opcionais.

O mesmo cadastro da sala é usado. Dentro do seletor aberto na Workstation, o acesso da aba é reaproveitado. A biblioteca também oferece entrada com o mesmo e-mail/senha para quem a abrir diretamente. Nenhuma função de cadastro, perfil ou progresso foi substituída. Aluno inativo e visitante não têm acesso ao acervo. As regras existentes de abertura da Workstation e de aula continuam independentes e preservadas.

## Armazenamento e controles

Duas tabelas adicionais com RLS: `workstation_biblioteca_v2` e `workstation_biblioteca_arquivos_v2`. Bucket privado independente: `workstation-biblioteca-v2`. Os buckets anteriores não foram tornados públicos nem tiveram políticas substituídas. Os novos arquivos não são enviados ao GitHub.

A autorização usa o papel e o estado ativo de `sala_membros`, por meio das funções existentes `ws_t_educacao.professora()` e `aluno_autorizado()`. Não usa papéis editáveis em user_metadata. Só a autora autorizada administra seus rascunhos; alunos consultam apenas conjuntos publicados. Alterar a identidade/autoria por PATCH é vedado. As mensagens entre seletor e host verificam janela, origem e token.

Arquivos são guardados em partes imutáveis de até 4 MiB, evitando o limite por objeto para DICOM maiores. Limites de aplicação: 300 MiB por arquivo, 1 GiB e 1.000 arquivos por conjunto, sujeitos ao espaço e às cotas do plano existente. Não foi contratado plano, projeto ou recurso pago. Falha de rede conserva o rascunho oculto; a interface permite removê-lo e reenviar, sem anunciar retomada automática de upload.

A liberação verifica no servidor a quantidade de arquivos e a presença/tamanho de todas as partes. As escritas em rascunhos são serializadas com a publicação. Ao abrir, o cliente reconstitui o arquivo, confere tamanho, SHA-256 e assinatura PNG/JPEG/DICOM antes de aplicar o input do visualizador existente. Não se pressupõe que o reconhecimento do arquivo valide seus pixels, geometria ou finalidade clínica.

Não há URL pública ou URL assinada persistente. Alunos não leem objetos diretamente do bucket. A função `workstation-biblioteca-download` verifica o JWT no Auth, consulta catálogo e arquivo sob RLS do usuário, recebe somente a parte autorizada e confere novamente a autorização antes de responder com `private, no-store`. A chave de serviço é usada exclusivamente no servidor, depois da autorização, e nunca é entregue ao cliente. A autenticação é implementada na própria função com o endpoint Auth, inclusive para contas inativas, e não depende da opção de verificação legada do gateway. O upload também usa cache de duração zero. Recolher um conjunto impede novas consultas e downloads dos alunos. Arquivos já recebidos no dispositivo não podem ser apagados à distância. Os materiais devem ser revisados e autorizados antes da liberação. A confirmação da professora não é anonimização automática nem certificação de ausência de dados gravados nos pixels.

## Modalidades e leitores

Raio-X: PNG/JPEG no Canvas existente. TC: DICOM no leitor de séries existente. Mamografia: imagens 2D e inspeção DICOM nas condições já existentes. Tomossíntese: sequência didática PNG/JPEG ou o leitor DICOM restrito às amostras já auditadas. Nenhum consentimento é marcado pelo seletor. Nenhum bloqueio de DBT, aviso de lateralidade ou orientação foi removido. RM permanece expansão indisponível.

Uma classificação de modalidade no acervo é informação declarada pela responsável. Um conjunto não é automaticamente uma série nem um estudo DICOM. Não se infere orientação ou profundidade anatômica da ordem dos arquivos.

## Preservação e reversão

Estado inicial: `main` em `14dc42188d0c1c97f395bae1b7baa5b16cacc406`; experimental em `537457cfdb93cda78a20d37b0e7379ae1df03019`. Bundle completo verificado `backup-before-shared-library.bundle` e snapshot da configuração anterior do banco fora do repositório. A migração é aditiva: cria apenas os objetos com nomes novos, sem atualizar registros reais existentes. Os perfis usados nos testes são sintéticos, temporários e identificados pelo número da execução.

Interface: `git revert <commit-publicacao-compartilhada>` restaura os arquivos anteriores sem apagar o acervo no servidor. Para impedir também os acessos pelo backend, usar `database/recolher-biblioteca-compartilhada.sql`: remove somente as três políticas novas do bucket e revoga o acesso às duas tabelas novas, preservando seus arquivos e dados para recuperação. Não altera login, cadastros, trabalhos, atividades ou progresso reais.

Scripts originais de `amaral-rad.html` e `sala-de-aulas.html` conferidos contra o baseline; as extensões são externas e isoladas. O iframe original continua sem `allow-same-origin`.

## Evidências

Os testes do módulo compartilhado usam Chromium, Auth, PostgREST e Storage reais, com conta docente, aluno ativo e conta inativa independentes. Dados de teste: PNG com ruído sintético, padrões geométricos e o volume DICOM sintético já incluído na Workstation. Os sete DICOM científicos reais não são enviados ao acervo ou ao GitHub por esses testes. Não se trata de validação clínica nem de nova validação de geometria DICOM.

A saída ou troca de conta pelo seletor recarrega o host para invalidar a identidade e limpar imagens da sessão anterior, sem reutilizar o estado autenticado de outra conta.
