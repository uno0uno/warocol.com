export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  // Determinar la URL de la API según el entorno
  const apiUrl = process.env.NODE_ENV === 'production'
    ? 'https://api.warolabs.com'
    : (config.public.warolabsApiUrl || 'http://localhost:9999')

  const siteUrl = config.public.siteUrl || 'https://warocol.com'
  const today = new Date().toISOString().split('T')[0]

  // URLs dinámicas del blog
  let blogUrls: Array<{ loc: string; lastmod: string; changefreq: string; priority: string }> = []
  let latestBlogDate = today

  try {
    const response = await $fetch<{ success: boolean; data: Array<{ slug: string; updated_at: string | null; created_at: string }> }>(`${apiUrl}/blog`, {
      query: { limit: 1000 },
      headers: {
        'Origin': siteUrl,
        'Referer': `${siteUrl}/`
      }
    })

    if (response.success && response.data && response.data.length > 0) {
      // Obtener la fecha más reciente de todos los artículos
      const dates = response.data.map(a => new Date(a.updated_at || a.created_at))
      latestBlogDate = new Date(Math.max(...dates.map(d => d.getTime()))).toISOString().split('T')[0]

      blogUrls = response.data.map(article => ({
        loc: `/blog/${article.slug}`,
        lastmod: (article.updated_at || article.created_at || today).split('T')[0],
        changefreq: 'weekly',
        priority: '0.8'
      }))
    }
  } catch (error) {
    console.error('Error fetching blog articles for sitemap:', error)
  }

  // URLs base (home es estática, blog es dinámica basada en el último artículo)
  const baseUrls = [
    { loc: '/', lastmod: today, changefreq: 'daily', priority: '1.0' },
    { loc: '/blog', lastmod: latestBlogDate, changefreq: 'daily', priority: '0.9' }
  ]

  // Combinar todas las URLs
  const allUrls = [...baseUrls, ...blogUrls]

  // Generar XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(url => `  <url>
    <loc>${siteUrl}${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`

  // Establecer headers y devolver XML
  setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setResponseHeader(event, 'Cache-Control', 'max-age=3600, s-maxage=3600')

  return xml
})
