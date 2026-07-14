import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  ALL_APP_LOCALES,
  APP_LOCALES,
  LOCALE_MESSAGE_FILES,
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

  it('loads the personal profile message domain', () => {
    assert.ok(LOCALE_MESSAGE_FILES.includes('perfil.json'))
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

  it('uses the validated cookie only while authenticated sources load', () => {
    assert.equal(resolveAppLocale({ cookieValue: 'en' }), 'en')
    assert.equal(resolveAppLocale({ cookieValue: 'xx' }), 'es')
    assert.equal(resolveAppLocale({
      profileLoaded: false,
      tenantLoaded: true,
      tenantValue: 'fr',
      cookieValue: 'pt',
    }), 'pt')
  })

  it('makes every supported personal locale authoritative', () => {
    for (const profileValue of APP_LOCALES) {
      assert.equal(resolveAppLocale({
        profileValue,
        tenantValue: 'es',
        cookieValue: 'en',
        profileLoaded: true,
        tenantLoaded: true,
      }), profileValue)
    }
  })

  it('falls back from a null profile to tenant and then Spanish', () => {
    assert.equal(resolveAppLocale({
      profileValue: null,
      tenantValue: 'fr',
      cookieValue: 'en',
      profileLoaded: true,
      tenantLoaded: true,
    }), 'fr')
    assert.equal(resolveAppLocale({
      profileValue: null,
      tenantValue: 'xx',
      cookieValue: 'en',
      profileLoaded: true,
      tenantLoaded: true,
    }), 'es')
  })

  it('keeps a personal locale across tenant changes and rollback snapshots', () => {
    const base = {
      profileValue: 'de',
      cookieValue: 'de',
      profileLoaded: true,
      tenantLoaded: true,
    }
    assert.equal(resolveAppLocale({ ...base, tenantValue: 'es' }), 'de')
    assert.equal(resolveAppLocale({ ...base, tenantValue: 'ar' }), 'de')
    assert.equal(resolveAppLocale({ ...base, profileValue: null, tenantValue: 'ar' }), 'ar')
  })

  it('tracks tenant changes only while the personal preference is inherited', () => {
    const inherited = {
      profileValue: null,
      cookieValue: 'de',
      profileLoaded: true,
      tenantLoaded: true,
    }
    assert.equal(resolveAppLocale({ ...inherited, tenantValue: 'pt' }), 'pt')
    assert.equal(resolveAppLocale({ ...inherited, tenantValue: 'zh' }), 'zh')
    assert.equal(resolveAppLocale({ ...inherited, tenantValue: null }), 'es')

    const personalized = { ...inherited, profileValue: 'fr' }
    assert.equal(resolveAppLocale({ ...personalized, tenantValue: 'pt' }), 'fr')
    assert.equal(resolveAppLocale({ ...personalized, tenantValue: 'ar' }), 'fr')
  })
})
