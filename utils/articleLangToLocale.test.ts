import assert from 'node:assert/strict'
import test from 'node:test'

import { articleLangToLocale } from './articleLangToLocale.ts'

test('maps enabled article languages to app locales', () => {
  assert.equal(articleLangToLocale('es'), 'es')
  assert.equal(articleLangToLocale('en'), 'en')
  assert.equal(articleLangToLocale('en-US'), 'en')
  assert.equal(articleLangToLocale('EN_GB'), 'en')
  assert.equal(articleLangToLocale('pt-BR'), 'pt')
})

test('returns null for missing or unsupported article lang', () => {
  assert.equal(articleLangToLocale(null), null)
  assert.equal(articleLangToLocale(undefined), null)
  assert.equal(articleLangToLocale(''), null)
  assert.equal(articleLangToLocale('xx'), null)
  assert.equal(articleLangToLocale('italiano'), null)
})
