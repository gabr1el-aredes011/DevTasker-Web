# Roadmap de segurança

## SEC-001 — Remover dados pessoais da navegação de verificação

- **Status:** implementado na branch `feature/password-recovery`
- **Prioridade:** alta
- **Área:** cadastro, login e verificação de e-mail

### Problema

O fluxo anterior abria a página de verificação com o e-mail em um parâmetro de
consulta. Isso expunha um dado pessoal no histórico do navegador, em capturas de
tela e, dependendo da infraestrutura, em logs e ferramentas de análise.

### Decisão implementada

- A rota de verificação é sempre `/verify-email`, sem parâmetros de consulta.
- O e-mail é mantido somente em memória durante a transição entre as telas.
- O dado não é gravado em `history.state`, `localStorage` ou `sessionStorage`.
- As transições sensíveis substituem a entrada anterior do histórico.
- Após recarregar a página ou acessar a rota diretamente, a interface solicita
  que o fluxo seja reiniciado, sem tentar recuperar o e-mail de uma URL ou de um
  armazenamento persistente.

### Critérios de aceite

- Nenhum e-mail ou segredo aparece na URL, no histórico ou em logs de acesso.
- Cadastro, login de conta ainda não verificada, reenvio e confirmação continuam
  funcionando durante a navegação corrente.
- Atualização da página e acesso direto recebem um tratamento seguro e claro.
- Testes cobrem as transições e a ausência de dados pessoais na navegação.

## SEC-002 — Recuperação de senha

- **Status:** implementado na branch `feature/password-recovery`
- **Prioridade:** alta
- **Área:** autenticação

### Controles adotados

- Resposta neutra ao solicitar ou reenviar um código, exista ou não uma conta.
- Código numérico temporário armazenado somente como HMAC, com limite de
  tentativas e intervalo de reenvio.
- Token de redefinição aleatório, temporário, de uso único e mantido apenas em
  memória no navegador.
- Senha armazenada com BCrypt e rejeição da senha atual.
- Incremento da versão de credencial para invalidar sessões JWT anteriores.
- Segredo HMAC exclusivo para recuperação, fornecido pela variável de ambiente
  `PASSWORD_RECOVERY_HMAC_SECRET`.
- E-mail enviado fora da transação que cria o desafio, sem expor falhas de
  entrega na resposta pública.
- Limitação de requisições por origem e identificador sem registrar o e-mail em
  texto puro.

### Antes de produção

- Configurar um segredo Base64 exclusivo e forte em
  `PASSWORD_RECOVERY_HMAC_SECRET`.
- Operar atrás de HTTPS e de um proxy com política confiável de endereço de
  origem.
- Monitorar abuso e considerar CAPTCHA ou proteção equivalente em ambiente
  público.
- Evoluir o envio assíncrono em memória para uma outbox persistente caso a
  garantia de entrega após reinícios seja necessária.
