import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  ALL_APP_LOCALES,
  APP_LOCALES,
  getLocaleDirection,
  normalizeAppLocale,
  normalizeEnabledAppLocale,
  resolveAppLocale,
  toLocaleTag,
  toNumberLocaleTag,
} from './appLocales.ts'

describe('app locale catalog', () => {
  it('normalizes all supported short and regional codes', () => {
    const cases = {
      es: 'es', 'es-CO': 'es', en: 'en', 'en_US': 'en',
      'pt-BR': 'pt', 'fr-FR': 'fr', 'de-DE': 'de', ar: 'ar',
      'hi-IN': 'hi', 'zh-CN': 'zh',
    } as const
    for (const [input, expected] of Object.entries(cases)) {
      assert.equal(normalizeAppLocale(input), expected)
    }
    assert.deepEqual(ALL_APP_LOCALES, ['es', 'en', 'pt', 'fr', 'de', 'hi', 'zh', 'ar'])
  })

  it('enables every translated product locale', () => {
    assert.deepEqual(APP_LOCALES, ['es', 'en', 'pt', 'fr', 'de', 'hi', 'zh', 'ar'])
    assert.equal(normalizeEnabledAppLocale('fr'), 'fr')
    assert.equal(normalizeEnabledAppLocale('ar'), 'ar')
    assert.equal(normalizeEnabledAppLocale('en-US'), 'en')
  })

  it('maps language, numeric tags, and RTL direction', () => {
    assert.equal(toLocaleTag('pt'), 'pt-BR')
    assert.equal(toLocaleTag('zh'), 'zh-CN')
    assert.equal(toNumberLocaleTag('ar'), 'ar-u-nu-latn')
    assert.equal(getLocaleDirection('ar'), 'rtl')
    assert.equal(getLocaleDirection('hi'), 'ltr')
  })

  it('rejects invalid values and defaults tag helpers safely', () => {
    assert.equal(normalizeAppLocale('xx'), null)
    assert.equal(normalizeAppLocale(null), null)
    assert.equal(toLocaleTag('xx'), 'es-CO')
  })

  it('treats tenant locale as authoritative after tenant load', () => {
    assert.equal(resolveAppLocale(undefined, 'en', false), 'en')
    assert.equal(resolveAppLocale('es', 'en', true), 'es')
    assert.equal(resolveAppLocale('en', 'es', true), 'en')
    assert.equal(resolveAppLocale('fr', 'en', true), 'fr')
    assert.equal(resolveAppLocale('xx', 'en', true), 'es')
  })
})
