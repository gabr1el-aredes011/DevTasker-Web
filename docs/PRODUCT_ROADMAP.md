# DevTasker — Roadmap de produto e engenharia

Última atualização: 9 de outubro de 2026.

Este documento é a referência compartilhada para a evolução do DevTasker. Ele
cobre os repositórios [DevTasker Web](https://github.com/gabr1el-aredes011/DevTasker-Web)
e [DevTasker API](https://github.com/gabr1el-aredes011/DevTasker-API).

## Legenda

- ✅ Entregue e validado
- 🚧 Em desenvolvimento
- 🧭 Planejado
- 🔧 Refinamento técnico

## Ordem de execução aprovada

Novas áreas não devem interromper o acabamento das superfícies centrais. O
desenvolvimento atual fica dividido nos portões abaixo, que precisam ser
respeitados nesta ordem.

### Portão 1 — Fechar os três macroblocos existentes

1. **Dashboard**
   - Refinar a hierarquia, iconografia e leitura das métricas.
   - Usar cores semânticas para risco, atenção, progresso e sucesso, evitando que
     toda informação seja representada em verde.
   - Consolidar uma identidade tecnológica própria, com movimento sutil e útil,
     sem copiar a tela de autenticação.
   - Revisar projetos recentes, prioridades, pipeline, estados vazios,
     carregamento, erro e comportamento responsivo.
2. **Projetos**
   - Substituir elementos genéricos como `PROJECT_INDEX` e o hero provisório por
     uma identidade editorial própria do catálogo.
   - Refinar busca, cards, ações, criação e edição em modais profissionais.
   - Evoluir os detalhes do projeto com contexto, indicadores, alertas e leitura
     clara de quadros, labels e pessoas.
   - Preservar o fluxo de convites já aprovado e finalizar a apresentação do
     catálogo de labels sem expor códigos técnicos de cor.
3. **Kanban e tarefas**
   - Consolidar o quadro como central operacional, e não como uma repetição do
     Dashboard geral.
   - Finalizar densidade, microinterações, estados vazios, responsividade e
     acessibilidade das colunas e cartões.
   - Concluir o refinamento dos modais de criação, edição e detalhes, incluindo
     Markdown, prioridades, labels, tecnologias, checklist, anexos, comentários,
     respostas e histórico.
   - Preservar o painel de inteligência do quadro e o filtro em modal já
     entregues, refinando-os após validação de uso.

### Portão 2 — Perfil e identidade pessoal

Somente depois dos três macroblocos será iniciada a página de Perfil. Nome,
foto, informações da conta, idiomas, preferências e segurança serão tratados
como uma entrega completa. A centralização de avatar e iniciais — incluindo a
incongruência histórica `G2`/`GT` — pertence a este portão.

### Portão 3 — Novas experiências

Após Perfil, iniciar Arquivados como uma experiência própria de busca,
restauração e exclusão protegida; depois avançar para Minhas tarefas,
Notificações, Equipe, Relatórios, Atividades, Configurações e Integrações. Essas
páginas devem compartilhar o design system, mas nunca ser cópias estruturais
umas das outras.

## Estado atual

### Autenticação

- ✅ Cadastro e login
- ✅ JWT, Auth Guard e tratamento de `401`/`403`
- ✅ Verificação de e-mail com OTP de seis dígitos
- ✅ Colagem automática, reenvio e cooldown do OTP
- ✅ Bloqueio de login para conta ainda não verificada
- ✅ SMTP real
- ✅ Confirmação visual da verificação
- ✅ Remoção do e-mail da URL e dos armazenamentos persistentes do navegador
- ✅ Recuperação de senha completa
- ✅ Resposta neutra, código temporário e limite de tentativas
- ✅ Token de redefinição temporário e de uso único
- ✅ Invalidação dos JWTs anteriores após a troca de senha
- 🔧 Informar de forma segura quando a nova senha for igual à senha atual

### Workspace

- ✅ App Shell, Sidebar e Topbar
- ✅ Identificação do usuário e avatar por iniciais
- ✅ Logout
- ✅ Menu responsivo
- ✅ Rotas filhas

### Dashboard

- ✅ Endpoint analítico protegido por membership
- ✅ Contagens de projetos, boards e tarefas
- ✅ Estados de tarefa: ativa, em desenvolvimento, concluída e vencida
- ✅ Taxa de conclusão
- ✅ Projetos recentes
- ✅ Workflow real e tarefas que exigem atenção
- ✅ Layout responsivo

### Mini Design System

- ✅ Tokens globais como fonte única para cores, tipografia, espaços e movimento
- ✅ Primitive de botão com variantes, tamanhos, loading e bloqueio acessível
- ✅ Badge semântico reutilizável
- ✅ Estados reutilizáveis de carregamento, vazio e erro
- 🚧 Field com label, hint, erro e associação ARIA, introduzido em Boards 2.0
- 🚧 Dialog com gerenciamento de foco pelo Angular CDK, introduzido em Boards 2.0
- ✅ Toast global acessível, temporário e com encerramento manual
- 🧭 Skeleton

### Profissionalização visual e experiência

- 🧭 Tratar cada superfície como uma experiência de produto própria: compartilhar
  tokens, componentes e regras de acessibilidade, mas nunca reutilizar uma página
  inteira como solução visual genérica para outra funcionalidade.
- 🧭 Garantir que cada página tenha propósito, hierarquia, composição, estados
  vazios, interações e identidade visual coerentes com a informação que apresenta.
- 🧭 Evitar padrões provisórios de “escada/cascata” para criação, edição e filtros;
  usar dialogs, drawers ou páginas dedicadas conforme a profundidade de cada fluxo.
- 🧭 Validar cada superfície em desktop, tablet e celular antes de considerá-la
  pronta para publicação.
- ✅ Criar um sistema global e acessível de feedback para ações, com mensagens
  consistentes de sucesso, erro, alerta e informação, como “Membro removido com
  sucesso”.
- ✅ Padronizar duração, posição, prioridade, animação e comportamento responsivo
  dessas mensagens em toda a plataforma.
- 🧭 Centralizar a geração de iniciais e avatares para que a mesma pessoa seja
  representada de forma idêntica na sidebar, projetos, membros, tarefas e demais
  páginas.
- 🚧 Substituir progressivamente os feedbacks provisórios embutidos nas páginas
  pelos componentes definitivos do design system.

### Arquitetura das 12 experiências principais

As doze superfícies abaixo formam a visão de produto aprovada. Elas compartilham
o design system, mas devem possuir composição e linguagem próprias — Arquivados,
por exemplo, não será uma cópia visual do Kanban.

1. **Dashboard:** visão geral do workspace, riscos, progresso e atalhos relevantes.
2. **Projetos:** catálogo autoral de iniciativas, criação e acesso ao contexto de
   cada projeto.
3. **Kanban:** central operacional dos quadros, tarefas, filtros e indicadores do
   fluxo de trabalho.
4. **Perfil:** identidade pessoal, foto, informações profissionais, idioma,
   preferências e segurança.
5. **Minhas tarefas:** agenda pessoal organizada por prazo, prioridade, projeto e
   situação.
6. **Notificações:** central de convites, menções, comentários, responsabilidades
   e mudanças relevantes.
7. **Equipe:** pessoas, funções, participação, disponibilidade e carga de trabalho.
8. **Relatórios:** análises por período, projeto, responsável, prazo e produtividade,
   com exportação futura.
9. **Arquivados:** experiência própria de preservação, busca, restauração e exclusão
   definitiva protegida de projetos, quadros e tarefas.
10. **Atividades:** trilha auditável das ações realizadas no workspace.
11. **Configurações:** aparência, notificações, idioma, fuso horário, segurança e
    administração do workspace.
12. **Integrações:** conexões com ferramentas externas e automações do fluxo de
    desenvolvimento.

### Estratégia para integrações

- 🧭 Fase 1: vínculos manuais e seguros de repositórios, branches, commits e pull
  requests do GitHub e GitLab.
- 🧭 Fase 2: autenticação com os provedores e sincronização de metadados essenciais.
- 🧭 Fase 3: webhooks para refletir eventos externos em tarefas e atividades.
- 🧭 Fase 4: calendário por feed e, depois, integrações autorizadas com provedores
  de calendário.
- 🧭 Fase 5: avaliar outras ferramentas de desenvolvimento somente quando houver
  caso de uso claro, segurança definida e manutenção sustentável.

### Projetos

- ✅ Membership e funções `OWNER`, `ADMIN`, `MEMBER` e `VIEWER`
- ✅ Página própria e catálogo responsivo
- ✅ Criação, edição e arquivamento lógico
- ✅ Pesquisa por nome e descrição
- ✅ Cards, estados de carregamento, erro e vazio
- ✅ Navegação protegida de Projeto → Kanban
- ✅ Página de detalhes com visão geral e quadros reais
- ✅ Abas acessíveis e deep link do estado da página
- ✅ Diretório de membros com funções e identificação da conta atual
- 🚧 Filtros
- ✅ Convites seguros por e-mail e gestão de membros

### Boards

- ✅ Listagem
- ✅ Navegação Projeto → Boards
- ✅ Criação com fluxo padrão de cinco colunas
- ✅ Renomeação e arquivamento lógico
- ✅ Permissões de gestão para `OWNER` e `ADMIN`
- ✅ Exclusão de quadros arquivados do Projeto, Kanban e Dashboard
- 🚧 Administração completa

### Kanban

- ✅ Colunas e categorias
- ✅ Criação, edição, detalhes e arquivamento de tarefas
- ✅ Prioridade e prazo
- ✅ Drag and drop, movimento e reordenação
- ✅ Atualização otimista com rollback em erro
- ✅ Persistência no backend
- ✅ Deep links de projeto, board e tarefa
- ✅ Estado refletido na URL
- ✅ Atribuição de responsável entre participantes com permissão operacional
- ✅ Limpeza automática da atribuição ao remover ou tornar um membro `VIEWER`
- ✅ Catálogo reutilizável de labels por projeto, com identidade, cores e arquivamento lógico
- ✅ Seleção de labels do catálogo nas tarefas e migração segura dos textos anteriores
- ✅ Filtros do Kanban por uma ou várias labels, com correspondência flexível e estado compartilhável pela URL
- ✅ Filtros combináveis por prioridade, responsável e situação do prazo, com estado compartilhável pela URL
- ✅ Sincronização em tempo real de criação, edição, movimentação e arquivamento de tarefas no quadro aberto
- ✅ Checklist de subtarefas com progresso nos cartões e modo somente leitura para `VIEWER`
- ✅ Comentários persistentes com autoria, edição pelo autor e moderação por `OWNER`/`ADMIN`
- ✅ Histórico das principais ações da tarefa, limitado às 100 atividades mais recentes
- ✅ Consulta de comentários e histórico em modo somente leitura para `VIEWER`
- ✅ Descrições em Markdown com edição, pré-visualização e renderização segura
- ✅ Pulso operacional por quadro com avanço, atrasos, itens sem responsável,
  distribuição por etapa e carga ativa da equipe
- ✅ Filtros avançados em modal dedicado, com resumo persistente no quadro,
  foco controlado, fechamento por `Escape` e estado compartilhável preservado

## Marco atual — Projetos 2.0

O objetivo é transformar projetos em entidades de primeira classe, em vez de
servirem apenas como porta de entrada para o Kanban.

### Entrega 1 — Base de gestão

- ✅ Auditar e atualizar a branch existente `feature/projects-management`
- ✅ Criar página própria de projetos
- ✅ Criar projeto com board e colunas iniciais
- ✅ Editar nome e descrição conforme a função do membro
- ✅ Arquivar projeto com confirmação, sem exclusão física
- ✅ Pesquisar projetos por nome e descrição
- ✅ Ordenar projetos pela atualização mais recente
- ✅ Exibir cards profissionais, estados vazios, carregamento e erros
- ✅ Navegar de Projeto → Kanban preservando o deep link
- 🧭 Adicionar filtros por função e outros critérios
- ✅ Criar a base da página avançada de detalhes do projeto
- ✅ Exibir visão geral e boards sem inventar contratos ainda inexistentes
- ✅ Preservar deep links para o Kanban em cada board

Critérios de aceite:

- ✅ Somente usuários autorizados enxergam e modificam um projeto.
- ✅ A interface respeita as permissões retornadas pela API.
- ✅ Arquivamento não apaga boards, colunas ou tarefas relacionados.
- ✅ Projetos arquivados ficam indisponíveis em Projetos, Dashboard, Boards e Tasks.
- ✅ Pesquisa funciona de maneira previsível e responsiva.
- ✅ Fluxos críticos possuem testes no backend e no frontend.

### Entrega 2 — Membros e permissões

- ✅ Listar membros
- ✅ Convidar contas existentes e verificadas por e-mail
- ✅ Aceitar convite autenticado com token temporário
- ✅ Expirar e revogar convites pendentes
- ✅ Alterar função entre `ADMIN`, `MEMBER` e `VIEWER`
- ✅ Remover membro
- ✅ Aplicar permissões por função na API e na interface
- ✅ Impedir ações que deixem um projeto sem `OWNER`

## Próximos marcos

### Boards 2.0

- ✅ Criar, editar e arquivar boards
- ✅ Escolher board padrão com abertura automática no Kanban
- ✅ Cards e permissões
- ✅ Base para customizações futuras

### Tasks 2.0

- ✅ Descrição avançada em Markdown, limitada a 4.000 caracteres e sem HTML arbitrário
- ✅ Responsável com validação de participação e permissões
- ✅ Catálogo de labels por projeto com nomes únicos, gestão por `OWNER`/`ADMIN`
  e identidade cromática automática, sem configuração manual de cor
- ✅ Uso operacional por `MEMBER` e leitura por `VIEWER`, com histórico preservado após arquivamento
- ✅ Filtros do Kanban por uma ou mais labels, incluindo labels arquivadas presentes no histórico
- ✅ Filtros de produtividade por prioridade, responsável, tarefas sem responsável e situação do prazo
- ✅ Subtarefas e checklist persistentes, com conclusão, remoção e progresso agregado
- ✅ Comentários e histórico persistentes, com autorização por função e linha do tempo prospectiva
- ✅ Respostas contextuais em comentários, organizadas em threads rasas para preservar
  legibilidade sem criar níveis infinitos de aninhamento
- ✅ Anexos persistentes com upload, download, exclusão lógica, limites e permissões por função
- ✅ Seleção, pré-visualização local e confirmação antes do envio de anexos
- ✅ Visualização autenticada de imagens, PDFs e arquivos textuais já anexados
- ✅ Tecnologias da tarefa persistidas e exibidas com ícones oficiais no formulário,
  detalhes e cards do Kanban
- 🧭 Evolução da linha do tempo de atividades e automações baseadas em prazo

### Profissionalização visual — Workspace autenticado

> A autenticação é a referência de identidade do produto. A camada autenticada
> deve manter essa sensação tecnológica, viva e sofisticada em toda a superfície,
> preservando o comportamento funcional já estabilizado.

- ✅ Migrar feedbacks transitórios do Kanban para o sistema global de Toast
- ✅ Migrar feedbacks de quadros, labels e colaboração dos detalhes do projeto para
  notificações temporárias com tons semânticos
- 🚧 Consolidar a linguagem visual do shell, Dashboard, Projetos, detalhes e Kanban
  - ✅ Atmosfera exclusiva do workspace, visualmente relacionada à marca sem
    copiar a cena de partículas da autenticação
  - ✅ Navegação legível com iconografia vetorial consistente e remoção de
    indicadores puramente decorativos
  - ✅ Monograma proprietário aplicado como favicon e assinatura visual do produto
  - ✅ Sidebar compacta em desktop, sem coluna vazia até o rodapé e com perfil
    permanentemente acessível
  - ✅ Paleta semântica para prioridade, aviso, informação, sucesso e risco
  - ✅ Pulso operacional do Dashboard orientado pelos dados reais de prazo,
    prioridade e andamento, com métricas semânticas e acesso direto aos projetos
  - 🚧 Aplicar o conceito Developer Command Deck com navegação em rail, composição
    editorial e trilhos operacionais contínuos
  - 🚧 Aproveitar a superfície disponível com hierarquia, evitando o simples
    esticamento de containers e a repetição excessiva de cards
  - 🧭 Validação visual autenticada e refinamentos finais após testes de uso
- 🚧 Profissionalizar formulários e detalhes com modais de foco contido
  - ✅ Criação e edição de projetos, criação e detalhes de tarefas convertidos para modais
  - ✅ Edição de tarefa isolada em um modal próprio, sem empilhar formulários sobre
    a visualização de detalhes
  - ✅ Rolagem interna controlada nos detalhes da tarefa, mantendo comentários,
    histórico, checklist e anexos acessíveis em qualquer altura de tela
  - ✅ Composer de tarefas dividido entre conteúdo e propriedades, com ações persistentes
  - ✅ Contexto de destino, seletor visual de prioridade, limites de campos e datas
    legíveis no fluxo de tarefas
  - ✅ Criação e edição de projeto com prévia e explicação do resultado da ação
  - ✅ Refinar anexos com prévia, identificação de formato e ações explícitas
  - 🚧 Refinar checklist e comentários dentro da nova composição
- 🧭 Revisar microinterações, estados vazios, carregamento e acessibilidade
- 🧭 Executar validação visual completa em desktop, tablet e dispositivos móveis

### Colaboração

- ✅ Convites
- ✅ Membros, funções e permissões
- ✅ Atividade colaborativa dentro das tarefas
- 🚧 Sincronização em tempo real: tarefas e movimentações entregues; comentários e membros planejados
- ✅ Reconexão resiliente e atualização incremental do quadro sem exigir recarregamento manual

### Perfil e conta

- 🧭 Nome, e-mail e avatar
- 🧭 Alteração autenticada de senha
- 🧭 Preferências
- 🧭 Segurança da conta

### Administração global da plataforma

> Este marco deverá começar após a entrega de **Perfil e conta**. A função
> global `UserRole.ADMIN` é independente das funções `ProjectMemberRole` de
> cada projeto.

- 🧭 Criar uma UX dedicada e preferencial para o administrador global
- 🧭 Criar área administrativa separada, protegida por `ROLE_ADMIN`
- 🧭 Gerenciar o ciclo de vida das contas e oferecer ferramentas de suporte
- 🧭 Exibir métricas operacionais e informações de saúde da plataforma
- 🧭 Registrar ações administrativas críticas em trilha de auditoria
- 🧭 Preservar a privacidade dos projetos, sem conceder acesso implícito ao
  conteúdo privado de usuários
- 🧭 Implementar serviços e endpoints administrativos com autorização explícita

### Notificações

- 🧭 Prazo próximo ou vencido
- 🧭 Tarefa atribuída
- 🧭 Convite para projeto
- 🧭 Alterações importantes

### Pesquisa e produtividade

- 🧭 Busca global e filtros
- 🧭 Atalhos de teclado

### Hardening de anexos para produção

- 🧭 Migrar o armazenamento local para object storage compatível com S3/R2
- 🧭 Adicionar varredura antimalware antes de disponibilizar novos arquivos
- 🧭 Validar a assinatura binária real do arquivo além do tipo informado pelo navegador
- 🧭 Definir retenção, observabilidade e limpeza automatizada de arquivos órfãos
- 🧭 Quick actions
- 🧭 Command palette

### Refinamentos de produto por superfície

- 🧭 Dashboard: reforçar a identidade tecnológica, a leitura visual e a iconografia
  das métricas sem transformar todos os estados em verde
- 🧭 Projetos: criar seção de arquivados, exclusão definitiva com proteção,
  modais refinados e detalhes com gráficos e sinais de atenção por projeto
  - ✅ Substituir o hero genérico e `PROJECT_INDEX` por um registro operacional
    com distribuição entre liderança e colaboração
  - ✅ Remover códigos técnicos de cor do catálogo de labels e comunicar a identidade
    cromática automática em linguagem de produto
- 🧭 Kanban: evoluir a identidade própria do quadro, microinterações e densidade
  informacional sem perder legibilidade
  - ✅ Primeira camada de inteligência operacional encapsulada em componente próprio,
    distinta do Dashboard geral e derivada dos dados reais do quadro
- 🧭 Tarefas: ampliar o catálogo de tecnologias de forma administrável e avaliar
  integração futura com links de pull request, commits e critérios de aceite

## Qualidade de engenharia

### Testes

- 🚧 Ampliar testes unitários existentes
- 🧭 Testes de integração da API com PostgreSQL e Flyway reais
- 🧭 Testes de integração do frontend
- 🧭 Fluxos E2E críticos

### Dependências e segurança

- 🧭 Atualizar o Angular para uma versão corrigida dos avisos de segurança apontados
  pela auditoria de dependências, em uma feature isolada e acompanhada de regressão

### DevOps

- 🧭 Integração contínua
- 🧭 Builds automáticos
- 🧭 Docker
- 🧭 Deploy

### Documentação

- 🚧 Roadmap de produto e segurança
- 🧭 README profissional para Web e API
- 🧭 Visão de arquitetura
- 🧭 Screenshots e demonstração dos fluxos
- 🧭 Referência da API
- 🧭 Setup local completo
- 🧭 Registro de decisões técnicas

## Backlog técnico e de segurança

- 🔧 Manter `PASSWORD_RECOVERY_HMAC_SECRET` separado dos demais segredos.
- 🔧 Migrar o envio assíncrono em memória para uma outbox persistente antes de
  exigir garantia de entrega durante reinícios.
- 🔧 Adicionar proteção de borda, métricas de abuso e CAPTCHA quando necessário.
- 🔧 Monitorar o custo da validação de `credential_version` em cada requisição.
- 🔧 Adicionar controle de concorrência otimista aos projetos antes de ampliar a
  edição colaborativa simultânea.
- 🔧 Manter os estilos de cada componente dentro do orçamento do build enquanto
  a linguagem Developer Command Deck é consolidada.
- 🔧 Revisar o script Maven Wrapper no PowerShell para que a suíte possa ser
  executada diretamente por `mvnw.cmd` em qualquer ambiente Windows.

## Fluxo de entrega

1. Criar ou retomar uma branch `feature/*` a partir de `develop` atualizada.
2. Implementar uma fatia vertical pequena, incluindo API, interface e testes.
3. Executar testes e build antes do commit final.
4. Publicar a feature e revisar o diff contra `develop`.
5. Integrar com merge explícito em `develop` e validar novamente.
6. Promover para `main` somente quando o marco estiver estável e documentado.
