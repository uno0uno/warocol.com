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
    const fetchHeaders = { 'Origin': siteUrl, 'Referer': `${siteUrl}/` }
    let page = 1
    let hasMore = true
    const allArticles: Array<{ slug: string; updated_at: string | null; created_at: string }> = []

    while (hasMore) {
      const response = await $fetch<{ success: boolean; total: number; data: Array<{ slug: string; updated_at: string | null; created_at: string }> }>(`${apiUrl}/blog`, {
        query: { limit: 50, page },
        headers: fetchHeaders
      })
      if (response.success && response.data?.length > 0) {
        allArticles.push(...response.data)
        hasMore = allArticles.length < response.total
        page++
      } else {
        hasMore = false
      }
    }

    if (allArticles.length > 0) {
      const dates = allArticles.map(a => new Date(a.updated_at || a.created_at))
      latestBlogDate = new Date(Math.max(...dates.map(d => d.getTime()))).toISOString().split('T')[0]
      blogUrls = allArticles.map(article => ({
        loc: `/blog/${article.slug}`,
        lastmod: (article.updated_at || article.created_at || today).split('T')[0],
        changefreq: 'weekly',
        priority: '0.8'
      }))
    }
  } catch (error) {
    console.error('Error fetching blog articles for sitemap:', error)
  }

  // URLs dinámicas de restaurantes activos (is_active = true)
  let restaurantUrls: Array<{ loc: string; lastmod: string; changefreq: string; priority: string }> = []

  try {
    const fetchHeaders = { 'Origin': siteUrl, 'Referer': `${siteUrl}/` }
    const response = await $fetch<{ success: boolean; data: Array<{ slug: string; updated_at: string | null; created_at: string }> }>(
      `${apiUrl}/public/restaurant/list`,
      { headers: fetchHeaders }
    )
    if (response?.data?.length > 0) {
      restaurantUrls = response.data.map(r => ({
        loc: `/${r.slug}`,
        lastmod: (r.updated_at || r.created_at || today).split('T')[0],
        changefreq: 'weekly',
        priority: '0.9'
      }))
    }
  } catch (error) {
    console.error('Error fetching restaurants for sitemap:', error)
  }

  // URLs de directorios por ciudad/municipio (warocol.com#615) — solo
  // entries con tenants activos. Los municipios vacios pueden resolver por
  // ruta directa, pero no se indexan masivamente desde el sitemap.
  let cityUrls: Array<{ loc: string; lastmod: string; changefreq: string; priority: string }> = []
  try {
    const fetchHeaders = { 'Origin': siteUrl, 'Referer': `${siteUrl}/` }
    // Endpoint is under the public_restaurant router (prefix
    // /public/restaurant) — see api-warolabs/app/main.py:196.
    const response = await $fetch<{ success: boolean; data: Array<{ city_slug: string }> }>(
      `${apiUrl}/public/restaurant/cities`,
      { query: { include_empty: 'false' }, headers: fetchHeaders }
    )
    if (response?.data?.length > 0) {
      cityUrls = response.data.map((c) => ({
        loc: `/${c.city_slug}`,
        lastmod: today,
        changefreq: 'weekly',
        priority: '0.85',
      }))
    }
  } catch (error) {
    console.error('Error fetching cities for sitemap:', error)
  }

  // Extra-country magazines (warocol.com#2296) — never emit `/{slug}` for
  // AR/MX/US. Hubs and populated cities live under `/ciudades/{cc}/…`.
  const extraCountryCodes = ['AR', 'MX', 'US'] as const
  for (const code of extraCountryCodes) {
    const cc = code.toLowerCase()
    cityUrls.push({
      loc: `/ciudades/${cc}`,
      lastmod: today,
      changefreq: 'weekly',
      priority: '0.8',
    })
    try {
      const fetchHeaders = { 'Origin': siteUrl, 'Referer': `${siteUrl}/` }
      const response = await $fetch<{ success: boolean; data: Array<{ city_slug: string }> }>(
        `${apiUrl}/public/restaurant/cities`,
        { query: { include_empty: 'false', country_code: code }, headers: fetchHeaders }
      )
      if (response?.data?.length > 0) {
        for (const city of response.data) {
          cityUrls.push({
            loc: `/ciudades/${cc}/${city.city_slug}`,
            lastmod: today,
            changefreq: 'weekly',
            priority: '0.85',
          })
        }
      }
    } catch (error) {
      console.error(`Error fetching ${code} cities for sitemap:`, error)
    }
  }

  // URLs base
  const baseUrls = [
    { loc: '/', lastmod: today, changefreq: 'daily', priority: '1.0' },
    { loc: '/ciudades', lastmod: today, changefreq: 'weekly', priority: '0.95' },
    { loc: '/blog', lastmod: latestBlogDate, changefreq: 'daily', priority: '0.9' }
  ]

  // Combinar todas las URLs
  const allUrls = [...baseUrls, ...cityUrls, ...restaurantUrls, ...blogUrls]

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
