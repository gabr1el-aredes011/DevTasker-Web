# DevTasker — Direção visual e Design System

Este documento registra a linguagem visual que deve orientar toda nova feature
do DevTasker. O objetivo não é criar uma biblioteca independente, mas manter a
aplicação coerente enquanto Projects, Boards, Tasks e as áreas de conta evoluem.

## Identidade do produto

- Deep black como canvas principal.
- Verde neon controlado para marca, foco e ações relevantes.
- Tipografia de produto combinada com acentos de linguagem developer.
- Bordas discretas e superfícies em camadas.
- Glow somente quando comunica foco, seleção, carregamento ou mudança de estado.
- Cores semânticas estáveis para sucesso, alerta, perigo e informação.
- Movimento curto, sutil e respeitando `prefers-reduced-motion`.
- Área negativa generosa com informação densa, porém organizada.

## Fonte de verdade

Os tokens `--dt-*` definidos em `src/styles.scss` são a fonte de verdade para
cores, tipografia, espaçamentos, raios, sombras, movimento, layout e camadas.
Uma feature nova não deve criar uma segunda paleta local.

Exceções para cores literais precisam representar dados que não pertençam à
paleta semântica e devem ser documentadas no próprio componente.

## Arquitetura incremental

As primitives ficam em `src/app/shared/ui`, são standalone e não conhecem
conceitos de domínio como `OWNER`, `BACKLOG` ou `URGENT`. Cada feature traduz o
seu domínio para variantes visuais neutras, por exemplo `brand`, `warning` ou
`danger`.

Primeira sequência de consolidação:

1. Button sobre elementos nativos, com variantes, tamanhos e loading.
2. Badge semântico para roles, prioridades, categorias e estados.
3. Feedback state para loading, vazio, erro e retry.
4. Field para label, hint, erro e associação ARIA.
5. Dialog/Drawer usando Angular CDK para foco, Escape, backdrop e scroll lock.
6. Skeleton para carregamentos estruturais.
7. Toast para feedback global que pode sobreviver à navegação.

Cards de projeto, métricas do Dashboard, colunas e tarefas Kanban permanecem
componentes de suas features. Não haverá um componente-base abstrato para toda
superfície do produto.

## Critérios de pronto

- Estados default, hover, focus-visible e disabled estão definidos.
- Loading impede ações duplicadas e informa `aria-busy`.
- Alvos interativos possuem pelo menos 44 px quando usados como ação principal.
- Texto e controles mantêm contraste AA.
- Status não depende somente de cor.
- Labels, hints e erros estão programaticamente associados ao campo.
- Dialogs prendem e restauram o foco e bloqueiam interação com o fundo.
- Movimento utiliza os tokens globais e possui alternativa reduzida.
- Layouts são verificados em 320, 768, 1024 e 1440 px.
- Cada primitive possui testes de comportamento e acessibilidade essenciais.
- Uma primitive só é considerada consolidada após substituir pelo menos dois
  usos reais e remover o CSS duplicado correspondente.
- O build permanece abaixo do limite de estilos por componente.

## Estratégia de adoção

Auth e Dashboard não serão redesenhados agora. Novas telas nascem usando as
primitives e telas existentes migram somente quando forem naturalmente tocadas.
O Kanban terá uma etapa própria de unificação visual, preservando seu backend,
deep links e drag and drop atuais.

Não fazem parte desta fase: Storybook, pacote npm separado, theme switcher,
gerador genérico de formulários ou uma migração visual massiva.
