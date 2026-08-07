/**
 * Resolve an in-docs markdown href to a Nuxt path under /docs.
 * Absolute `/docs/...` links must not be prefixed again.
 */
export function resolveDocsNavigatePath(href: string, currentSlug: string): string {
  const raw = href.trim()
  if (!raw || raw.startsWith('http') || raw.startsWith('#')) return raw

  const hashIndex = raw.indexOf('#')
  const pathWithMd = hashIndex >= 0 ? raw.slice(0, hashIndex) : raw
  const hash = hashIndex >= 0 ? raw.slice(hashIndex) : ''
  let path = pathWithMd.replace(/\.md$/i, '')

  if (path === '/docs' || path.startsWith('/docs/')) {
    return `${path.replace(/\/{2,}/g, '/')}${hash}`
  }

  if (path.startsWith('/')) {
    return `${path}${hash}`
  }

  const currentDir = currentSlug.split('/').filter(Boolean).slice(0, -1).join('/')
  if (path.startsWith('./')) path = path.slice(2)

  const joined = currentDir ? `${currentDir}/${path}` : path
  const parts: string[] = []
  for (const segment of joined.split('/')) {
    if (!segment || segment === '.') continue
    if (segment === '..') {
      parts.pop()
      continue
    }
    parts.push(segment)
  }

  return `/docs/${parts.join('/')}${hash}`
}
