# Publicação e reversão — exige autorização expressa

Antes de publicar: validar as propostas SQL 001/002 em staging com a matriz de autorização, concorrência e revisão; renovar o backup do recurso e conferir que o main não mudou. Apenas os arquivos deste PR e o conteúdo HTML do recurso workstation-patricia estão no escopo. Os dados de alunos não serão alterados.

Sequência proposta após autorização:
1. Salvar a linha completa atual de sala_recursos.id=workstation-patricia e as definições/políticas relevantes em armazenamento privado; comparar MD5 com o esperado antes da troca. Os backups desta sessão já estão no pacote local e devem ser renovados na execução.
2. Aplicar as propostas 001 e 002 aprovadas. Criam estado/progresso e funções; 002 acrescenta política restritiva apenas para esse recurso. Aula começa encerrada.
3. Usar integration/update-resource.REQUIRES-APPROVAL.sql do pacote privado. O script condiciona a troca ao MD5 anterior e devolve o id/hash. Exigir exatamente uma linha; não continuar se o hash divergir.
4. Mesclar o PR para atualizar somente a sala e o código de integração. O bundle privado nunca deve ser copiado para GitHub Pages. Testar professora/aluno/encerramento na produção autorizada.

Riscos: incompatibilidade SQL não detectada pelos mocks; bloqueio temporário de acesso durante a troca coordenada; conflitos de progresso entre abas (a segunda gravação é recusada, exigindo reabertura); latência de bloqueio visual. O progresso é autodeclarado pelo aluno, não uma nota validada pelo servidor.

Reversão:
1. Restaurar sala-de-aulas.html do commit 06919f82ba66446e718de2bef369c03944b27288 (ou backup renovado antes de publicar).
2. Restaurar somente conteudo_html do recurso com backups/restore-resource.REQUIRES-APPROVAL.sql, condicionado ao hash da versão nova. Não alterar titulo/liberado nem outras linhas.
3. Executar primeiro rollback 002, depois 001: removem a política nova/revogam execução das RPCs. Preservam tabelas e todo progresso para exportação e eventual recuperação. Não executar DROP TABLE/CASCADE.
4. Conferir hashes de membros/aulas e do recurso restaurado. Não usar backup para sobrescrever cadastros ou desfazer alterações legítimas posteriores de alunos.

Não há backup de dados pessoais de alunos neste pacote. Há somente contagens e hashes de integridade, suficientes para comparar ausência de alterações nesta sessão. O snapshot privado do recurso tem MD5 437e92e6ca282ccfcfc33d6cbe528b3b e 221324 bytes.
