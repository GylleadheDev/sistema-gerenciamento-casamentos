# 🛡️ Guia Oficial de Arquitetura & Deploy na VPS (`45.159.172.99`)

Este documento define o **Padrão Obrigatório de Engenharia, Segurança e Infraestrutura** para toda e qualquer nova aplicação que for hospedada na VPS.

---

## 1. Regras de Ouro da VPS (Invioláveis)

1. **Localização Única (`/srv/apps/<nome-do-app>`):**
   - Nenhuma aplicação pode ser colocada em `/root`, `/home` ou `/var/www`.
   - Toda aplicação deve viver dentro da sua própria pasta em `/srv/apps/<nome-do-app>`.
2. **Containerização Obrigatória (`Docker Compose`):**
   - Nenhuma aplicação deve ser rodada solta diretamente no sistema operacional da VPS. Tudo roda isolado dentro de containers via `docker-compose.yml`.
3. **Bind de Porta Exclusivo no Loopback (`127.0.0.1:<PORTA_HOST>:<PORTA_CONTAINER>`):**
   - **JAMAIS** exponha portas no formato `"8081:8080"` (que abre a porta para `0.0.0.0` e ignora o firewall UFW!).
   - **SEMPRE** use `"127.0.0.1:<PORTA_HOST>:<PORTA_CONTAINER>"`. Isso garante que o container só possa ser acessado internamente pelo **Caddy Reverse Proxy**.
4. **Um Arquivo Caddy por Aplicação (`/etc/caddy/apps.d/<nome-do-app>.caddy`):**
   - Nunca edite o `/etc/caddy/Caddyfile` principal. Cada aplicação tem seu próprio arquivo isolado dentro de `/etc/caddy/apps.d/`, gerenciado automaticamente pelo comando `vps-app`.
5. **Limite de Memória e Privilégios Mínimos:**
   - Como a VPS possui **1.6 GB de RAM + 4 GB de Swap**, todo serviço no `docker-compose.yml` deve declarar limite de memória (`memory: 256M` ou `512M`) e `security_opt: ["no-new-privileges:true"]`.

---

## 2. Mapa de Portas Internas Reservadas (`127.0.0.1`)

| Porta Interna (`127.0.0.1`) | Aplicação / Serviço | Domínio / Acesso | Status |
| :--- | :--- | :--- | :--- |
| `2019` | Caddy Admin Socket (Reload interno) | Apenas `127.0.0.1` | 🔒 Sistema |
| `3478` | TURN Server | Público (`3478/tcp+udp`) | 🟢 Ativo |
| `8090` | Nexo Server (`/opt/nexo`) | Público (`8090/tcp`) | 🟢 Ativo |
| `8080` | **Wedding SaaS (`wedding-saas`)** | `https://casamentos.numam.app` | 🟢 Ativo |
| `8081` | *Livre para a Próxima Aplicação #2* | `https://app2.numam.app` | ⚪ Disponível |
| `8082` | *Livre para a Próxima Aplicação #3* | `https://app3.numam.app` | ⚪ Disponível |
| `8083` | *Livre para a Próxima Aplicação #4* | `https://app4.numam.app` | ⚪ Disponível |

---

## 3. Template `docker-compose.yml` Obrigatório para Novos Projetos

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: NOME_DO_APP
    restart: unless-stopped
    environment:
      - PORT=8080
      - TZ=America/Sao_Paulo
    ports:
      # OBRIGATÓRIO: Sempre prefixar com 127.0.0.1 para não furar o Firewall UFW!
      - "127.0.0.1:8081:8080"
    volumes:
      - app_data:/srv/app/data
    networks:
      - webproxy
    deploy:
      resources:
        limits:
          memory: 256M
    security_opt:
      - no-new-privileges:true

volumes:
  app_data:

networks:
  webproxy:
    external: true
```

---

## 4. Comandos do Utilitário Global `vps-app`

```bash
# 1. Ver saúde da VPS, RAM, Swap, containers ativos, portas, Firewall e Fail2Ban:
vps-app status

# 2. Fazer deploy de um novo repositório do GitHub + configurar domínio HTTPS no Caddy:
vps-app deploy https://github.com/GylleadheDev/meu-novo-app.git meu-novo-app novoapp.numam.app 8081

# 3. Vincular ou trocar domínio de uma aplicação existente:
vps-app domain meu-novo-app novoapp.numam.app 8081

# 4. Acompanhar logs em tempo real:
vps-app logs meu-novo-app
```
