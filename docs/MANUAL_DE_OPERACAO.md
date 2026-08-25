# Manual de Operação e Guia de Customização — openGym

Este documento detalha como operar, atualizar, fazer backup e customizar o seu servidor **openGym**.

---

## 1. Arquitetura da Solução

- **Frontend:** React 19 + Vite com PWA (instalável na tela de início do iOS/Android com Face ID via WebAuthn).
- **Backend:** Node.js (`api/server.js`) com persistência em arquivos JSON atômicos (`./data/db.json` e `./data/state-<uid>.json`).
- **Proxy Reverso & SSL:** Caddy 2 com emissão e renovação automática de certificados HTTPS Let's Encrypt / ZeroSSL.
- **Mídia dos Exercícios:** Container de inicialização única que baixa ~1.300 imagens e animações de exercícios (`./media`).

---

## 2. Scripts Utilitários Disponíveis

Todos os scripts estão localizados na pasta `scripts/`:

### 🔹 Backup Automático (`scripts/backup.sh`)
Cria um arquivo compactado `.tar.gz` da pasta `./data` com timestamp e remove backups com mais de 14 dias:
```bash
./scripts/backup.sh
```

### 🔹 Instalação de Backup Diário no Cron (`scripts/setup-cron-backup.sh`)
Agenda o script de backup para rodar automaticamente todos os dias às 03:00 da manhã no servidor:
```bash
./scripts/setup-cron-backup.sh
```

### 🔹 Restauração de Backup (`scripts/restore.sh`)
Restaura os dados com criação prévia de snapshot de segurança:
```bash
./scripts/restore.sh backups/opengym_data_YYYYMMDD_HHMMSS.tar.gz
```

### 🔹 Atualização e Deploy (`scripts/deploy.sh`)
Faz backup prévio, baixa as imagens Docker mais recentes e reinicia os serviços:
```bash
./scripts/deploy.sh
```

---

## 3. Segurança e Administração

### Definir Usuário Administrador
1. Acesse o app no iPhone pelo Safari e crie sua conta com Face ID.
2. No servidor, verifique o seu ID de usuário em `./data/db.json` (no array `"users"`).
3. No arquivo `.env`, adicione:
   ```env
   ADMIN_UIDS=seu_user_id_aqui
   ```
4. Reinicie a aplicação:
   ```bash
   docker compose up -d
   ```
5. Agora na aba **Settings (Configurações)** do app você terá acesso ao **Admin Dashboard**.

### Fechar o Acesso Público (Apenas Convidados)
Para que pessoas aleatórias não consigam criar contas no seu servidor:
No arquivo `.env`:
```env
INVITE_ONLY=1
ALLOW_GUEST=0
```
Com isso, apenas contas autorizadas ou que utilizem códigos de convite gerados no seu painel de Admin poderão se registrar.

---

## 4. Model Context Protocol (MCP) — Integração com IA

O openGym possui um servidor MCP integrado na pasta `mcp/` que permite a assistentes de IA (Claude Desktop, Cursor, etc.) consultarem diretamente:
- Histórico de treinos e cargas.
- 1RM estimado por exercício.
- Balanço muscular e recuperação.
- Sugestões de sobrecarga progressiva.

### Configuração no Claude Desktop (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "opengym": {
      "command": "node",
      "args": ["/caminho/para/opengym/mcp/src/index.js"],
      "env": {
        "DATA_DIR": "/caminho/para/opengym/data"
      }
    }
  }
}
```

---

## 5. Dicas de Uso no iPhone

1. **Notificações de Timer de Descanso:** No iOS 16.4+, abra o app pela Tela de Início e ative as notificações nas configurações para receber alertas quando o descanso entre séries terminar.
2. **Uso Offline:** O app armazena os treinos localmente no cache do navegador antes de sincronizar, funcionando mesmo se o sinal 4G/5G oscilar na academia.
