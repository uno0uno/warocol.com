import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveDocsNavigatePath } from './docsLinks.ts'

test('absolute /docs links are not double-prefixed', () => {
  assert.equal(
    resolveDocsNavigatePath('/docs/usuarios/menu', 'usuarios/primeros-pasos'),
    '/docs/usuarios/menu',
  )
  assert.equal(
    resolveDocsNavigatePath('/docs/usuarios/operaciones/mesas#pedido-por-qr-en-mesa', 'usuarios/menu/productos'),
    '/docs/usuarios/operaciones/mesas#pedido-por-qr-en-mesa',
  )
})

test('relative ./ and bare paths resolve under current slug dir', () => {
  assert.equal(
    resolveDocsNavigatePath('./menu/recetas', 'usuarios/menu'),
    '/docs/usuarios/menu/recetas',
  )
  assert.equal(
    resolveDocsNavigatePath('./recetas.md', 'usuarios/menu/productos'),
    '/docs/usuarios/menu/recetas',
  )
  assert.equal(
    resolveDocsNavigatePath('registrar-venta.md', 'usuarios/ventas/propinas'),
    '/docs/usuarios/ventas/registrar-venta',
  )
})

test('parent ../ segments normalize', () => {
  assert.equal(
    resolveDocsNavigatePath('../despacho#pedidos-en-mesa-qr', 'usuarios/operaciones/mesas'),
    '/docs/usuarios/despacho#pedidos-en-mesa-qr',
  )
  // From usuarios/menu/productos, ../../ climbs out of usuarios/ (same as browser path normalize)
  assert.equal(
    resolveDocsNavigatePath('../../operaciones/mesas', 'usuarios/menu/productos'),
    '/docs/operaciones/mesas',
  )
  assert.equal(
    resolveDocsNavigatePath('../operaciones/mesas', 'usuarios/menu/productos'),
    '/docs/usuarios/operaciones/mesas',
  )
})
