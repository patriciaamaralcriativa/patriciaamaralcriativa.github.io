# Workstation T — proposta isolada, não publicada

Recuperação: pacote INTEGRACAO_WEB_WORKSTATION_T_2026-10-27.zip e branch local codex/workstation-t-web-prep, base 06919f82ba66446e718de2bef369c03944b27288. O conteúdo protegido e os backups permanecem exclusivamente no pacote local. Não estão no GitHub público.

Alterações propostas:
- sala-de-aulas.html conserva login, cadastro/aprovação existente e oito disciplinas. A ponte valida janela de origem, sessão, geração do iframe e ações permitidas.
- Proposta SQL 001: estado da aula e RPC status/start/end. APIs públicas SECURITY INVOKER chamam funções com autorização explícita em schema privado.
- Proposta SQL 002: progresso por auth.uid(), revisão otimista, bloqueio compartilhado do estado durante gravações, painel de acompanhamento e política RESTRICTIVE apenas para sala_recursos.id=workstation-patricia. Outros recursos mantêm suas políticas.
- Bundle privado mantém todos os textos dos 63 casos/324 tarefas, seis módulos e scripts recuperados. Acrescenta marcação de conclusão e persistência de pacientes fictícios/Worklist pela conta existente. Nenhum backend Python é necessário para o uso web.

Validação em Chrome real no Windows: 11 resultados da regressão de interface, incluindo respostas RPC simuladas; 11 cenários da integração completa da sala com API simulada. O teste de contraste compara o canvas, MPR compara dois pixels com valores físicos conhecidos (134 e 0), e 3D confirma mudança ao ampliar. Dados DICOM de teste sintéticos, sem uso diagnóstico. Os casos incorporados são semanticamente idênticos ao JSON recuperado.

Supabase real: apenas SELECTs de schema, políticas, permissões, recurso protegido e hashes agregados. Backup da linha atual conferido: 221324 bytes, MD5 437e92e6ca282ccfcfc33d6cbe528b3b. Não se trata de teste de login de professora/aluno. As duas tabelas novas ainda não existem em produção. Nenhuma migration foi aplicada. Staging ficou pendente por escolha da professora nesta sessão.

Bloqueio: novas operações de servidor deverão ser negadas após commit de end, conforme o SQL proposto; essa garantia ainda exige teste real do SQL e concorrência em staging. A interface consulta status a cada 15 s; cada pedido tem timeout de 8 s. Em aba ativa, bloqueio esperado em até aproximadamente 23 s quando há falha de rede, mais agendamento/event loop. Abas suspensas podem demorar mais. Conteúdo já carregado não pode ser apagado remotamente, e ferramentas locais no navegador não oferecem revogação contra cliente modificado.

Pendentes: execução das migrations e teste de RLS/RPC/concorrência em staging; login com contas reais de teste; revisão da professora para os novos controles de progresso. Não declarar homologação.

Execução dos testes: Node e Playwright já disponíveis; CHROME_PATH opcional. Defina WORKSTATION_PACKAGE para a pasta extraída do pacote privado e NODE_PATH para o Playwright instalado. Execute os scripts em tests. O teste não instala dependências, não acessa produção e não usa credenciais reais. A matriz staging-acceptance.sql é uma lista de cenários pendentes, não uma suíte SQL executada.

Referências de implementação: https://supabase.com/docs/guides/database/functions e https://supabase.com/docs/guides/database/postgres/row-level-security.
