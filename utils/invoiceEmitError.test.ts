import assert from 'node:assert/strict'
import test from 'node:test'

import { isFacturadorInfrastructureError, publicInvoiceErrorMessage } from './invoiceEmitError.ts'

const SQL_DUMP = (
  "Matias API 500: Error interno del servidor. SQLSTATE[42S22]: "
  + "Column not found: 1054 Unknown column 'company_id' in 'WHERE' "
  + "(Connection: mysql, SQL: select * from `file_managers` where (`company_id` = 821) limit 1)"
)
const FALLBACK = 'No se pudo emitir. Puedes reintentar.'

test('replaces Matias SQL dumps', () => {
  assert.equal(isFacturadorInfrastructureError(SQL_DUMP), true)
  assert.equal(publicInvoiceErrorMessage(SQL_DUMP, FALLBACK), FALLBACK)
})

test('replaces generic Matias 500', () => {
  assert.equal(publicInvoiceErrorMessage('Matias API 500: Error interno del servidor', FALLBACK), FALLBACK)
})

test('keeps DIAN business errors', () => {
  assert.equal(publicInvoiceErrorMessage('Matias API 400: Falta NIT del cliente', FALLBACK), 'Matias API 400: Falta NIT del cliente')
  assert.equal(publicInvoiceErrorMessage('ya se encuentra validado', FALLBACK), 'ya se encuentra validado')
})

test('empty uses fallback', () => {
  assert.equal(publicInvoiceErrorMessage('', FALLBACK), FALLBACK)
  assert.equal(publicInvoiceErrorMessage(null, FALLBACK), FALLBACK)
})
