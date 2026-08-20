# DevTasker — Roadmap de produto e engenharia

Última atualização: 20 de agosto de 2026.

Este documento é a referência compartilhada para a evolução do DevTasker. Ele
cobre os repositórios [DevTasker Web](https://github.com/gabr1el-aredes011/DevTasker-Web)
e [DevTasker API](https://github.com/gabr1el-aredes011/DevTasker-API).

## Legenda

- ✅ Entregue e validado
- 🚧 Em desenvolvimento
- 🧭 Planejado
- 🔧 Refinamento técnico

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

### Projetos

- ✅ Membership e funções `OWNER`, `ADMIN`, `MEMBER` e `VIEWER`
- ✅ Listagem básica
- 🚧 Gestão profissional de projetos

### Boards

- ✅ Listagem
- ✅ Navegação Projeto → Boards
- 🧭 Administração completa

### Kanban

- ✅ Colunas e categorias
- ✅ Criação, edição, detalhes e arquivamento de tarefas
- ✅ Prioridade e prazo
- ✅ Drag and drop, movimento e reordenação
- ✅ Atualização otimista com rollback em erro
- ✅ Persistência no backend
- ✅ Deep links de projeto, board e tarefa
- ✅ Estado refletido na URL

## Marco atual — Projetos 2.0

O objetivo é transformar projetos em entidades de primeira classe, em vez de
servirem apenas como porta de entrada para o Kanban.

### Entrega 1 — Base de gestão

- 🚧 Auditar e atualizar a branch existente `feature/projects-management`
- 🧭 Criar página própria de projetos
- 🧭 Criar projeto
- 🧭 Editar nome, descrição e demais dados permitidos
- 🧭 Arquivar projeto com confirmação
- 🧭 Pesquisar e filtrar projetos
- 🧭 Exibir cards profissionais, estados vazios, carregamento e erros
- 🧭 Abrir detalhes e navegar de Projeto → Boards

Critérios de aceite:

- Somente usuários autorizados enxergam e modificam um projeto.
- A interface respeita as permissões retornadas pela API.
- Arquivamento não apaga acidentalmente dados relacionados.
- Pesquisa e filtros funcionam de maneira previsível e responsiva.
- Fluxos críticos possuem testes no backend e no frontend.

### Entrega 2 — Membros e permissões

- 🧭 Listar membros
- 🧭 Convidar membro
- 🧭 Alterar função entre `ADMIN`, `MEMBER` e `VIEWER`
- 🧭 Remover membro
- 🧭 Aplicar permissões por função na API e na interface
- 🧭 Impedir ações que deixem um projeto sem `OWNER`

## Próximos marcos

### Boards 2.0

- 🧭 Criar, editar e arquivar boards
- 🧭 Escolher board padrão
- 🧭 Cards e permissões
- 🧭 Base para customizações futuras

### Tasks 2.0

- 🧭 Descrição avançada
- 🧭 Responsável e labels
- 🧭 Subtarefas e checklist
- 🧭 Comentários e histórico
- 🧭 Anexos
- 🧭 Evolução de prioridade, prazo e atividade

### Colaboração

- 🧭 Convites
- 🧭 Membros, funções e permissões
- 🧭 Atividade colaborativa

### Perfil e conta

- 🧭 Nome, e-mail e avatar
- 🧭 Alteração autenticada de senha
- 🧭 Preferências
- 🧭 Segurança da conta

### Notificações

- 🧭 Prazo próximo ou vencido
- 🧭 Tarefa atribuída
- 🧭 Convite para projeto
- 🧭 Alterações importantes

### Pesquisa e produtividade

- 🧭 Busca global e filtros
- 🧭 Atalhos de teclado
- 🧭 Quick actions
- 🧭 Command palette

## Qualidade de engenharia

### Testes

- 🚧 Ampliar testes unitários existentes
- 🧭 Testes de integração da API com PostgreSQL e Flyway reais
- 🧭 Testes de integração do frontend
- 🧭 Fluxos E2E críticos

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
- 🔧 Reduzir os estilos do Kanban e Dashboard que ultrapassam o orçamento atual
  do build, sem alterar a experiência visual.
- 🔧 Revisar o script Maven Wrapper no PowerShell para que a suíte possa ser
  executada diretamente por `mvnw.cmd` em qualquer ambiente Windows.

## Fluxo de entrega

1. Criar ou retomar uma branch `feature/*` a partir de `develop` atualizada.
2. Implementar uma fatia vertical pequena, incluindo API, interface e testes.
3. Executar testes e build antes do commit final.
4. Publicar a feature e revisar o diff contra `develop`.
5. Integrar com merge explícito em `develop` e validar novamente.
6. Promover para `main` somente quando o marco estiver estável e documentado.

