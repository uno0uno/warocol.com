import { readFile } from 'fs/promises'
import { resolve } from 'path'

export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, 'path') || 'README'

  // Sanitize: no path traversal
  const sanitized = path.replace(/\.\./g, '').replace(/^\/+/, '').replace(/\.md$/, '')
  const key = `${sanitized}.md`

  // 1. Try serverAssets storage (works in production after build)
  const storage = useStorage('assets:docs')
  const stored = await storage.getItem(key)
  if (stored) {
    return { content: stored as string, path: sanitized }
  }

  // 2. Fallback: read from filesystem (works in dev without restart)
  try {
    const filePath = resolve(process.cwd(), 'docs', `${sanitized}.md`)
    const content = await readFile(filePath, 'utf-8')
    return { content, path: sanitized }
  } catch {
    throw createError({ statusCode: 404, message: 'Documento no encontrado' })
  }
})
