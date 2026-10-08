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
- Marca própria baseada no monograma `D`, usada como favicon e assinatura dos
  ambientes público e autenticado; ícones genéricos não substituem a marca.
- Verde comunica marca, foco, seleção e sucesso. Informação usa azul, atenção
  usa amarelo/laranja e situações críticas usam vermelho. Prioridade nunca deve
  ser representada apenas por uma variação do verde.
- Movimento curto, sutil e respeitando `prefers-reduced-motion`.
- Área negativa generosa com informação densa, porém organizada.
- Identidades complementares: autenticação usa uma cena imersiva; o workspace
  usa uma malha operacional mais silenciosa, orientada ao conteúdo e sem copiar
  as partículas da entrada.
- Aproveitamento útil de toda a superfície disponível; limites de largura só
  devem existir quando beneficiam legibilidade ou foco.

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

Field e Dialog foram introduzidos na primeira fatia de Boards 2.0. Eles já
possuem associação acessível, estados de erro, gerenciamento de foco e testes,
mas permanecem em consolidação até substituírem pelo menos dois usos reais em
features diferentes.

Cards de projeto, métricas do Dashboard, colunas e tarefas Kanban permanecem
componentes de suas features. Não haverá um componente-base abstrato para toda
superfície do produto.

O workspace adota a linguagem **Developer Command Deck**: navegação em rail,
composição editorial assimétrica, trilhos operacionais contínuos e separadores
técnicos. A intenção é evitar tanto a repetição de cartões quanto grandes caixas
esticadas sem hierarquia. Apenas o comportamento transversal de
`workspace-view-modal` vive na fundação global; cada página compõe o próprio
contexto sem criar novos arquivos cosméticos. O shell autenticado possui uma
atmosfera própria, mais contida, para preservar legibilidade em sessões longas.

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

A autenticação estabelece o padrão de acabamento, mas não é um template a ser
copiado. O shell autenticado, Dashboard, Projetos, detalhes e Kanban possuem uma
identidade operacional própria e mais silenciosa, enquanto preservam a mesma
qualidade de tipografia, profundidade, movimento e feedback.

O padrão não deve ser obtido ampliando componentes antigos. Páginas de leitura
usam hierarquia editorial e listas contínuas; páginas operacionais usam HUDs e
trilhos; formulários e detalhes densos usam modais. Bordas, raios e glow são
reduzidos e intencionais para que a interface pareça um sistema, não uma coleção
de cards.

Fluxos densos de criação e detalhes devem priorizar modais ou drawers com foco
contido, Escape, backdrop e rolagem controlada. Estilos reutilizáveis entram na
fundação existente; não devem ser criados novos arquivos apenas para uma rodada
de ajustes cosméticos.

Formulários de criação precisam antecipar o resultado da ação: o composer de
tarefas identifica projeto e quadro de destino, enquanto a criação de projeto
explica o quadro, o fluxo inicial e a governança que serão preparados. Campos de
prioridade usam escolha semântica explícita em vez de um seletor visualmente
neutro. Datas exibidas ao público são formatadas; valores técnicos da API não
devem aparecer diretamente na interface.

Não fazem parte desta fase: Storybook, pacote npm separado, theme switcher ou
gerador genérico de formulários.
