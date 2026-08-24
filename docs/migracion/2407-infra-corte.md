# 2407 — Infra, salud y corte/rollback (ceñido a #2402)

## Healthcheck #2402→#2403
- `docker-compose.prod.yml:14` `healthcheck.test` = `wget -q -T 3 -O- http://127.0.0.1:3001/health` (era bun fetch roto)
- `interval:15s, timeout:3s, retries:3, start_period:40s` → unhealthy → `warocol-autoheal` reinicia ~60s
- Risk bajo, rollback `git revert` o ajustar test a valor previo (#2403)

## DB túnel
- `64.23.134.78:5432 postresWaroLabs` — verificar `psql` túnel antes de corte; `api_facturacion` usa mismo pool.

## Plan corte (orden merge)

1. #2403 infra
2. #2336+#857 bitácora pair
3. #2340+#859 landing pair
4. #2264→#2266→#2268 stack carga masiva
5. #2221 paddle, #2283 Crear lock
6. API #820, #840, #897, #899

Ventana: sin tráfico facturación; tags rollback `warocol-nuxt:rollback-*`

## Checklist post-migración

- `docker ps` health `healthy`, `autoheal` no loop
- FEV R2 uploads (27677B)
- Bitácora #N links, landing /food-cost & /ia-factura, carga masiva dropzone
