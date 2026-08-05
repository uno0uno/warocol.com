import { readFileSync } from 'node:fs'
import { dirname, join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import assert from 'node:assert/strict'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

test('health route responds with ok payload shape (source contract)', () => {
  const routePath = join(root, 'server/routes/health.get.ts')
  const src = readFileSync(routePath, 'utf8')
  assert.match(src, /ok:\s*true/)
  assert.match(src, /warocol-nuxt/)
  // Must be /health, not under server/routes/api/ (proxied)
  assert.ok(!routePath.includes(`${sep}api${sep}`))
})

test('Dockerfile HEALTHCHECK probes /health via bun', () => {
  const df = readFileSync(join(root, 'Dockerfile'), 'utf8')
  assert.match(df, /HEALTHCHECK/)
  assert.match(df, /127\.0\.0\.1:3001\/health/)
  assert.match(df, /interval=30s/)
})

test('prod compose: healthcheck + autoheal label + sidecar', () => {
  const yml = readFileSync(join(root, 'docker-compose.prod.yml'), 'utf8')
  assert.match(yml, /healthcheck:/)
  assert.match(yml, /3001\/health/)
  assert.match(yml, /autoheal:\s*"true"/)
  assert.match(yml, /willfarrell\/autoheal/)
  assert.match(yml, /AUTOHEAL_CONTAINER_LABEL=autoheal/)
})
