# 2417 — Paddle LIVE + deploy bin (sin WOMPI)

**WOMPI deprecado como env:** dejar `WOMPI_*` en `.env` no rompe (Optional) pero se deja así por ahora. Paddle reemplaza.

**Paddle LIVE (de PADDLE_KEYS.txt:3,8):**
- Front `~/frontWaroColombia/.env`: `NUXT_PUBLIC_PADDLE_CLIENT_TOKEN=live_bdd5e1eb709b6d785ec7677d00b`, `NUXT_PUBLIC_PADDLE_ENVIRONMENT=production`
- API `~/api-warocol.com/.env`: `PADDLE_ENVIRONMENT=production`, `PADDLE_API_KEY_LIVE=pdl_live_...`, `PADDLE_WEBHOOK_SECRET_LIVE=pdl_ntfset_...`, `PADDLE_PRICE_USD_9/30` `pri_01m...`, `PADDLE_PRICE_EUR_30` — copiar de txt, no pegar en git. Mantener `OPENBAO_ADDR=http://openbao:8200` de #904.

**Deploy bin:**
```bash
warolabs-server-infra/bin/deploy-warocol-api-prod.sh deploy
warolabs-server-infra/bin/deploy-warocol-front-prod.sh deploy
# ambos usan env_file secret + waro-network, no --build
```
Verify `docker ps` warocol-nuxt 3001 / api 5001 healthy, `curl /health`.
