# 2417 — legacy Paddle LIVE notes (superseded by Lemon Squeezy — epic #941 / #944)

**Status:** historical. SaaS MoR is Lemon Squeezy hosted checkout. Do not configure `NUXT_PUBLIC_PADDLE_*` or API `PADDLE_*` for new deploys.

See API `docs/payments/saas-mor-pricing.md` and env `LEMON_SQUEEZY_*` / `BILLING_SANDBOX_TENANT_SLUGS`.

**Deploy bin (unchanged):**
```bash
warolabs-server-infra/bin/deploy-warocol-api-prod.sh deploy
warolabs-server-infra/bin/deploy-warocol-front-prod.sh deploy
```
Verify `docker ps` warocol-nuxt 3001 / api 5001 healthy, `curl /health`.
