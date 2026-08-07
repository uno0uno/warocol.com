import { readFile } from 'fs/promises'
import { resolve } from 'path'
import { ALL_APP_LOCALES, DEFAULT_APP_LOCALE, type AppLocaleCode } from '~/utils/appLocales'


function normalizeDocsLocale(raw: unknown): AppLocaleCode {
  const code = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  return (ALL_APP_LOCALES as readonly string[]).includes(code)
    ? (code as AppLocaleCode)
    : DEFAULT_APP_LOCALE
}

async function readDocsMarkdown(
  storage: ReturnType<typeof useStorage>,
  relativeKey: string,
): Promise<string | null> {
  const stored = await storage.getItem(relativeKey)
  if (typeof stored === 'string' && stored.length > 0) return stored
  if (stored != null) return String(stored)

  try {
    const filePath = resolve(process.cwd(), 'docs', relativeKey)
    return await readFile(filePath, 'utf-8')
  } catch {
    return null
  }
}

export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, 'path') || 'README'
  const query = getQuery(event)
  const locale = normalizeDocsLocale(query.locale)

  // Sanitize: no path traversal
  const sanitized = path.replace(/\.\./g, '').replace(/^\/+/, '').replace(/\.md$/, '')
  const storage = useStorage('assets:docs')

  const candidates: Array<{ key: string; locale: AppLocaleCode | 'legacy' }> = [
    { key: `${locale}/${sanitized}.md`, locale },
  ]
  if (locale !== DEFAULT_APP_LOCALE) {
    candidates.push({ key: `${DEFAULT_APP_LOCALE}/${sanitized}.md`, locale: DEFAULT_APP_LOCALE })
  }
  candidates.push({ key: `${sanitized}.md`, locale: 'legacy' })

  for (const candidate of candidates) {
    const content = await readDocsMarkdown(storage, candidate.key)
    if (content != null) {
      const resolvedLocale = candidate.locale === 'legacy' ? DEFAULT_APP_LOCALE : candidate.locale
      return {
        content,
        path: sanitized,
        locale: resolvedLocale,
        fallback: resolvedLocale !== locale,
      }
    }
  }

  throw createError({ statusCode: 404, message: 'Document not found' })
})
