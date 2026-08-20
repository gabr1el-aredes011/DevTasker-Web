# Roadmap de segurança

## SEC-001 — Remover o e-mail da URL de verificação

- **Status:** planejado
- **Prioridade:** alta
- **Área:** cadastro, login e verificação de e-mail

### Problema

O fluxo atual abre a página de verificação com o e-mail em um parâmetro de consulta. Isso expõe um dado pessoal no histórico do navegador, em capturas de tela e, dependendo da infraestrutura, em logs e ferramentas de análise.

### Solução imediata

- Navegar para `/verify-email` sem parâmetros de consulta.
- Transportar temporariamente o e-mail pelo estado de navegação do Angular (`NavigationExtras.state` / `history.state`).
- Usar `replaceUrl` nas transições sensíveis para não manter a rota anterior no histórico.
- Quando o estado não estiver disponível, apresentar uma recuperação explícita do fluxo, sem tentar obter o e-mail pela URL.
- Remover também o e-mail da navegação de retorno para o login.

### Evolução recomendada

Substituir o transporte do e-mail por um contexto opaco, aleatório e de curta duração, associado ao usuário somente no backend. Preferencialmente, manter esse contexto em cookie `HttpOnly`, `Secure` e `SameSite`, de modo que nem o e-mail nem um segredo de verificação apareçam na URL.

### Critérios de aceite

- A barra de endereço mostra somente `/verify-email` durante o fluxo.
- Nenhum e-mail ou segredo de verificação aparece em URLs, histórico ou logs de acesso.
- Cadastro, login de conta ainda não verificada, reenvio e confirmação continuam funcionando.
- Atualização da página e acesso direto recebem um tratamento seguro e compreensível.
- Há testes cobrindo as transições e a ausência de dados sensíveis na URL.
