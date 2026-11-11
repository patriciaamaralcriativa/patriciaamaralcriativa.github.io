# AMARAL CLASS

Aplicação de avaliações individuais com Cloudflare Workers + D1. Código e infraestrutura independentes da Workstation, Sala de Aulas e jogos. Não há integração com Supabase nem alteração da página inicial.

## Infraestrutura autorizada

- Worker: amaral-class
- Conta: 980c2621cb5f440dd490be78123a9650
- D1: amaral-class-db
- ID D1: 7a9597a6-d0cc-4250-a081-66992b45cd07
- Binding: DB
- Endereço pretendido: https://amaral-class.pattyamaral1.workers.dev

Não confunda endereço configurado com publicação comprovada. Veja o relatório de entrega e a resposta real de /api/health.

## Executar localmente

Node 24 e npm. Instale com npm ci. Dependências de desenvolvimento fixadas no package-lock.json; o código da aplicação não depende de frameworks no navegador.

1. Crie .dev.vars, ignorado pelo Git, com AUTH_PEPPER e SETUP_TOKEN fictícios de pelo menos 32 caracteres cada. Nunca use segredos reais em testes.
2. npx wrangler d1 migrations apply DB --local
3. npx wrangler dev --local
4. Na entrada inicial, abra /#setup=CODIGO_FICTICIO para criar uma professora fictícia. O fragmento é removido da barra e não vai nos logs HTTP. Não copie códigos reais para arquivos ou mensagens públicas.

Em sandbox Windows, esbuild pode precisar de autorização para ler diretórios ancestrais. Isso não exige alterar permissões de bancos ou publicar o Worker. Logs locais podem ser direcionados por WRANGLER_LOG_PATH para .wrangler/logs.

## Testes

- npm test: API executada com adaptador D1 sobre SQLite real em memória, com dados fictícios. Não equivale a D1 remoto.
- tests/browser.cjs recebe: caminho do pacote Playwright, URL do Wrangler local e diretório de evidências. Usa Chrome instalado, sem mocks da API: Worker workerd e D1 emulado.
- A bateria de navegador cria 20 contextos independentes, entrando pela interface em lotes de quatro. Três páginas permanecem abertas e 17 participações continuam por HTTP para testar envio concorrente sem saturar a máquina. Não representa 20 computadores físicos.
- Testa criação/edição, importação, sala, painel, respostas, recuperação offline, recarga, encerramento, liberação de resultados, CSV e logout. API também cobre duas professoras, expiração, CSRF, gabaritos privados, duplicidade, todos os modos e reuso de questões.
- Os testes de navegador são destrutivos somente em relação aos seus próprios dados fictícios no ambiente local. Não aponte a bateria automaticamente para produção.

## Publicação segura

1. npx wrangler login --device (autorize no navegador; nunca compartilhe senha ou token).
2. Confirme a conta e o binding com os guardas de scripts/cloudflare.mjs.
3. Execute os testes e registre o hash de fonte em test-results/validated-source.json. O deploy exige API e navegador aprovados no mesmo conteúdo de src/, public/ e migrations/.
4. node scripts/backup.mjs salva a versão anterior do Worker e exporta o D1. A exportação é restaurada em SQLite local e submetida a integrity_check antes de aceitar o backup.
5. Primeira instalação, somente banco remoto vazio confirmado: node scripts/deploy.mjs --first-install. O script aplica migração, gera segredos em memória, envia por stdin ao Wrangler e publica. Segredos nunca são gravados no repositório ou nos argumentos de shell.
6. A ponte de instalação fica em http://127.0.0.1:8799/setup por no máximo 15 minutos e redireciona ao Worker com código temporário. Crie o acesso da professora na página. Nome, e-mail e senha são escolhidos pela responsável. A ponte fecha quando a instalação é confirmada. Não é parte do serviço de produção.
7. Em atualizações, use node scripts/deploy.mjs sem --first-install. Nunca regenere AUTH_PEPPER: isso invalidaria os verificadores das senhas já existentes.

O Worker não oferece cadastro aberto de professoras. A instalação exige SETUP_TOKEN secreto, é limitada por requisições e é consumida uma única vez no banco. A operação simultânea é protegida por chave única transacional.

## Operação em aula

Professora: entrar → criar/importar questionário → criar sala → vincular avaliação → divulgar código → iniciar. Pode pausar, retomar e encerrar. Encerre antes de liberar resultados. Relatórios e detalhes ficam no painel e no histórico.

Aluno: acessar o endereço da plataforma → código → nome completo → aguardar início → responder. Não precisa de conta. Cada participação recebe token opaco de 256 bits em cookie HttpOnly. Nome não é credencial técnica.

Uma resposta confirmada é imutável. Reenvio idêntico não duplica resposta; conteúdo divergente é recusado. O resultado só é disponibilizado ao próprio aluno depois do encerramento e da liberação pela professora. O arquivo original do questionário não é entregue ao aluno.

Se a conexão cair após confirmar, a resposta pendente fica no sessionStorage e é reenviada. O aviso distingue aguardando confirmação de recebida pelo servidor. Recuperação exige conservar os dados do navegador. Nomes iguais em dispositivos diferentes são recusados para evitar impersonação: use o dispositivo original ou orientação da professora para identificar homônimos.

## Modalidades

- Ritmo do aluno: avanço individual sequencial.
- Ritmo da professora: questão ativa controlada pela docente; respostas de etapas não liberadas são recusadas no servidor.
- Equipes: atribuição automática balanceada por ordem de entrada e classificação por pontos recebidos. Alunos veem agregados de equipe, não nomes/respostas dos outros participantes.
- Saída rápida: usa até as três primeiras questões do questionário escolhido, mostrado como modalidade específica.

## Importação e imagens

Modelos públicos: public/modelo.csv e public/modelo.json, apenas questões sintéticas. CSV aceita vírgula ou ponto e vírgula, UTF-8/BOM, aspas e campos multilinha. CSV usa resposta correta MC de 1 a 6; JSON usa índice de 0 a 5. Verdadeiro/falso exige booleano explícito; curta exige lista de respostas aceitas. Não são inventados gabaritos.

Até 100 questões por questionário/importação; enunciado até 5.000 caracteres; 2–6 alternativas; texto curto com critérios de caixa/acentos; imagens PNG/JPEG/WebP até cerca de 130 KB. SVG e URLs remotas de imagem não são aceitos. O payload tem limite global para respeitar D1 e Workers. Use somente imagens autorizadas e sem dados pessoais desnecessários.

O banco de questões permite vincular uma questão a diferentes questionários. Editar questionário cria novas versões de conteúdo; avaliações já iniciadas conservam snapshot e gabarito originais. Arquivar não apaga histórico.

## Segurança

Autorização de proprietária em cada recurso docente; consultas parametrizadas; cookies HttpOnly/SameSite=Strict/Secure em HTTPS; origem obrigatória para mutações; CSP sem scripts externos ou inline; sem CORS amplo. Senhas usam salt, PBKDF2-SHA256 de 100.000 iterações e HMAC com pepper secreto no Worker. Esse custo respeita o limite atual de workerd; não é uma declaração de conformidade com recomendações de custo maiores de outros ambientes.

Sessão da professora de oito horas; logout revoga o registro; participação de aluno por até 24 horas. Limites persistentes de login/entrada/requisições; alunos não enviam nota confiável, não escolhem outra participação e não recebem gabaritos antecipados. CSV neutraliza prefixos de fórmulas. Auditoria registra ações docentes sem senhas ou IP em texto claro.

Não há declaração de invulnerabilidade ou certificação LGPD. A instituição deve definir base legal, retenção e atendimento dos titulares. O operador controla os históricos e deve usar somente os dados necessários. Não execute limpeza ou restauração de banco automaticamente em produção.

## Atualização automática e limites

Polling de cinco segundos com redução em abas ocultas. Não é WebSocket. Foi escolhido para operar com Workers/D1, sem Durable Objects, KV ou serviço adicional pago. Vinte alunos ativos fazem aproximadamente 14.400 consultas HTTP de estado por hora, mais painel e envios; acompanhe limites diários de Workers e operações do D1 no plano efetivo. Não há promessa de uso ilimitado.

Referências verificadas: https://developers.cloudflare.com/workers/platform/limits/ e https://developers.cloudflare.com/d1/platform/limits/ .

## Backup e reversão

Backups ficam em backups/, ignorado pelo Git, com versão anterior do Worker, SQL do D1, hash SHA-256 e resultado da restauração local. Reverta o Worker para workerVersion registrado pelo comando de rollback do manifesto; isso preserva o banco e as respostas recebidas depois da publicação.

Restaurar D1 pode descartar dados posteriores: não é uma etapa automática de rollback do código. Só restaure com motivo concreto, novo backup do estado atual e autorização de quem responde pelos dados. A migração 0001_rollback.sql.disabled documenta reversão apenas de uma instalação vazia de teste e nunca é executada automaticamente. Em produção, prefira correção progressiva e preservação dos dados.
