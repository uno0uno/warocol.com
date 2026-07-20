import { APP_LOCALE_DEFINITIONS, localeMessageFiles } from './utils/appLocales'

export default defineNuxtConfig({
  ssr: true,
  routeRules: {
    // Blog — prerender estático en build time para SEO óptimo
    '/blog': { prerender: true },
    // SEO: consolidate cannibalized blog slugs (warocol.com#953)
    '/blog/software-pos-restaurantes-colombia': {
      redirect: { to: '/blog/mejores-software-restaurantes-colombia', statusCode: 301 },
      prerender: false
    },
    '/blog/sistema-pos-colombia': {
      redirect: { to: '/blog/mejores-software-restaurantes-colombia', statusCode: 301 },
      prerender: false
    },
    '/blog/software-para-restaurante': {
      redirect: { to: '/blog/mejores-software-restaurantes-colombia', statusCode: 301 },
      prerender: false
    },
    '/blog/software-restaurantes-gratis-colombia': {
      redirect: { to: '/blog/software-para-restaurante-gratis', statusCode: 301 },
      prerender: false
    },
    '/blog/software-open-source-restaurantes': {
      redirect: { to: '/blog/software-para-restaurante-gratis', statusCode: 301 },
      prerender: false
    },
    '/blog/software-contable-restaurantes-gratis': {
      redirect: { to: '/blog/software-para-restaurante-gratis', statusCode: 301 },
      prerender: false
    },
    '/blog/**': { prerender: true },
    // Homepage pública
    '/': { prerender: true },
    // App privada — SPA (no necesita SSR ni indexación)
    '/dashboard/**': { ssr: false },
    '/pos': { ssr: false },
    '/pos/**': { ssr: false },
    '/mesas': { redirect: '/operaciones/mesas' },
    '/operaciones': { ssr: false },
    '/operaciones/**': { ssr: false },
    '/menu/**': { ssr: false },
    '/inventario/**': { ssr: false },
    '/abastecimiento/**': { ssr: false },
    '/ventas': { ssr: false },
    '/ventas/**': { ssr: false },
    '/equipo/**': { ssr: false },
    '/finanzas/pagos/**': { ssr: false },
    '/financiero/**': { ssr: false },
    '/auth/**': { ssr: false },
    '/analitica/**': { ssr: false },
    '/onboarding': { ssr: false },
    '/analitica/**': { ssr: false },
    '/asistente/**': { ssr: false },
    '/gestion/**': { ssr: false },
    '/terminos-y-condiciones': { ssr: false },
    '/domicilios/**': { ssr: false },
    '/finanzas/**': { ssr: false },
    '/facturacion': { ssr: false },
    '/facturacion/**': { ssr: false },
    '/negocio': { ssr: false },
    '/cocina': { ssr: false },
    '/cocina/**': { ssr: false },
    '/despacho/**': { ssr: false },
    '/integraciones': { ssr: false },
    '/perfil': { ssr: false },
    // Legacy redirect: stale link `/billing/renovar` 404'd. Send anyone
    // who lands there (bookmarks, old emails, Wompi callbacks) to the real
    // billing portal. Must come BEFORE the wildcard `/billing/**` so the
    // more-specific rule wins.
    '/billing/renovar': { redirect: { to: '/gestion/billing', statusCode: 301 } },
    '/billing/**': { ssr: false },
    '/mis-pedidos/**': { ssr: false },
    '/proveedor/**': { ssr: false },
    '/docs/**': { ssr: false },
    // Mesa QR — client-only (matrix loader + Pinia Colada, no SSR fetch)
    '/**/mesa/**': { ssr: false },
  },
  experimental: {
    payloadExtraction: false
  },
  devServer: {
    port: parseInt(process.env.PORT || '8080')
  },
  nitro: {
    compatibilityDate: '2026-05-22',
    serverAssets: [{
      baseName: 'docs',
      dir: './docs'
    }],
    routeRules: {
      // Chunks — content-hashed, safe to cache forever (filename changes on every build)
      '/_nuxt/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
      '/favicon.ico': { headers: { 'cache-control': 'public, max-age=86400' } },
      // HTML pages — never cache in CDN: each deploy generates new chunk hashes.
      // Caching HTML in CloudFront causes "Failed to fetch dynamically imported module"
      // because users get stale HTML referencing old (deleted) chunk filenames.
      '/': { headers: { 'cache-control': 'public, max-age=0, must-revalidate' } },
      '/blog': { headers: { 'cache-control': 'public, max-age=0, must-revalidate' } },
      '/blog/**': { headers: { 'cache-control': 'public, max-age=0, must-revalidate' } },
      '/terminos-y-condiciones': { headers: { 'cache-control': 'public, max-age=0, must-revalidate' } },
      // Client-only pages (no SSR)
      '/api/auth/**': {
        proxy: {
          to: process.env.NODE_ENV === 'development'
            ? `${process.env.NUXT_PUBLIC_WAROLABS_API_URL || 'http://localhost:9999'}/auth/**`
            : 'https://api.warolabs.com/auth/**',
          changeOrigin: true,
          followRedirects: true,
          ...(process.env.NODE_ENV === 'development' && {
            headers: {
              'X-Forwarded-Host': `localhost:${process.env.PORT || '8080'}`
            }
          })
        },
        cors: true,
        headers: {
          'Access-Control-Allow-Credentials': 'true'
        }
      },
      '/api/**': {
        proxy: {
          to: process.env.NODE_ENV === 'development'
            ? `${process.env.NUXT_PUBLIC_WAROLABS_API_URL || 'http://localhost:9999'}/**`
            : 'https://api.warolabs.com/**',
          changeOrigin: true,
          followRedirects: true,
          headers: process.env.NODE_ENV === 'development'
            ? {
                'X-Forwarded-Host': `localhost:${process.env.PORT || '8080'}`,
                'Origin': `http://localhost:${process.env.PORT || '8080'}`,
                'Referer': `http://localhost:${process.env.PORT || '8080'}/`
              }
            : {
                'Origin': 'https://warocol.com',
                'Referer': 'https://warocol.com/'
              }
        },
        cors: true,
        headers: {
          'Access-Control-Allow-Credentials': 'true'
        }
      }
    }
  },
  runtimeConfig: {
    apiKey: process.env.NUXT_API_KEY || '',
    public: {
      baseUrl: process.env.NUXT_BASE_URL || '',
      warolabsApiUrl: process.env.NUXT_PUBLIC_WAROLABS_API_URL || 'http://localhost:9999',
      organizationName: process.env.NUXT_PUBLIC_ORGANIZATION_NAME || '',
      defaultRedirectUrl: process.env.NUXT_PUBLIC_DEFAULT_REDIRECT_URL || '/dashboard',
      publicKeyEncrypter: process.env.NUXT_PUBLIC_PUBLIC_KEY_ENCRYPTER || '',
      // SEO Configuration
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://warocol.com',
      canonicalUrl: process.env.NUXT_PUBLIC_CANONICAL_URL || 'https://warocol.com',
      siteName: process.env.NUXT_PUBLIC_SITE_NAME || 'Waro Colombia',
      siteDescription: process.env.NUXT_PUBLIC_SITE_DESCRIPTION || '',
      siteAuthor: process.env.NUXT_PUBLIC_SITE_AUTHOR || 'Waro Colombia',
      siteLang: process.env.NUXT_PUBLIC_SITE_LANG || 'es',
      siteLocale: process.env.NUXT_PUBLIC_SITE_LOCALE || 'es_CO',
      seoTitle: process.env.NUXT_PUBLIC_SEO_TITLE || '',
      seoDescription: process.env.NUXT_PUBLIC_SEO_DESCRIPTION || '',
      ogTitle: process.env.NUXT_PUBLIC_OG_TITLE || '',
      ogDescription: process.env.NUXT_PUBLIC_OG_DESCRIPTION || '',
      ogUrl: process.env.NUXT_PUBLIC_OG_URL || '',
      ogImage: process.env.NUXT_PUBLIC_OG_IMAGE || '',
      ogImageWidth: process.env.NUXT_PUBLIC_OG_IMAGE_WIDTH || '1200',
      ogImageHeight: process.env.NUXT_PUBLIC_OG_IMAGE_HEIGHT || '630',
      twitterTitle: process.env.NUXT_PUBLIC_TWITTER_TITLE || '',
      twitterDescription: process.env.NUXT_PUBLIC_TWITTER_DESCRIPTION || '',
      twitterImage: process.env.NUXT_PUBLIC_TWITTER_IMAGE || '',
      twitterSite: process.env.NUXT_PUBLIC_TWITTER_SITE || '',
      twitterCreator: process.env.NUXT_PUBLIC_TWITTER_CREATOR || '',
      logoUrl: process.env.NUXT_PUBLIC_LOGO_URL || '',
      instagramUrl: process.env.NUXT_PUBLIC_INSTAGRAM_URL || '',
      schemaDescription: process.env.NUXT_PUBLIC_SCHEMA_DESCRIPTION || '',
      // Google Tag Manager
      gtmContainerId: process.env.NUXT_PUBLIC_GTM_CONTAINER_ID || ''
    }
  },
  app: {
    head: {
      titleTemplate: '%s',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { charset: 'utf-8' },
        { name: 'google-site-verification', content: '72HLw9bf8y_WNtXn8pstDJGYAAQAPZ6bkPNZsbXcCok' },
        { name: 'description', content: process.env.NUXT_PUBLIC_SITE_DESCRIPTION },
        { name: 'author', content: process.env.NUXT_PUBLIC_SITE_AUTHOR },
        { name: 'robots', content: 'index, follow' },
        // Open Graph
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: process.env.NUXT_PUBLIC_SITE_NAME },
        { property: 'og:locale', content: process.env.NUXT_PUBLIC_SITE_LOCALE },
        { property: 'og:image', content: process.env.NUXT_PUBLIC_OG_IMAGE },
        { property: 'og:image:width', content: process.env.NUXT_PUBLIC_OG_IMAGE_WIDTH },
        { property: 'og:image:height', content: process.env.NUXT_PUBLIC_OG_IMAGE_HEIGHT },
        // Twitter Cards
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:site', content: process.env.NUXT_PUBLIC_TWITTER_SITE },
        { name: 'twitter:creator', content: process.env.NUXT_PUBLIC_TWITTER_CREATOR },
        { name: 'twitter:image', content: process.env.NUXT_PUBLIC_TWITTER_IMAGE }
      ],
      htmlAttrs: {
        lang: process.env.NUXT_PUBLIC_SITE_LANG || 'es',
        class: 'light'
      },
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ],
      script: [
        // Figma MCP capture script (dev only)
        ...(process.env.NODE_ENV === 'development' ? [{
          src: 'https://mcp.figma.com/mcp/html-to-design/capture.js',
          async: true
        }] : []),
        // JSON-LD Schema.org Organization
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: process.env.NUXT_PUBLIC_SITE_NAME,
            url: process.env.NUXT_PUBLIC_SITE_URL,
            logo: process.env.NUXT_PUBLIC_LOGO_URL,
            description: process.env.NUXT_PUBLIC_SCHEMA_DESCRIPTION,
            sameAs: [
              process.env.NUXT_PUBLIC_INSTAGRAM_URL
            ].filter(Boolean)
          })
        },
        // JSON-LD Schema.org WebSite
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: process.env.NUXT_PUBLIC_SITE_NAME,
            url: process.env.NUXT_PUBLIC_SITE_URL,
            description: process.env.NUXT_PUBLIC_SITE_DESCRIPTION,
            inLanguage: process.env.NUXT_PUBLIC_SITE_LANG
          })
        }
      ]
    },
  },
  modules: [
    ['@nuxtjs/google-fonts', {
      families: {
        Lato: [400, 700, 900]
      }
    }],
    '@nuxtjs/robots',
    '@pinia/nuxt',
    '@pinia/colada-nuxt',
    'nuxt-icon',
    '@nuxtjs/i18n',
  ],
  i18n: {
    // Product UI locales; no URL prefix so
    // product routes (/pos, /ventas, …) stay stable. Files live under i18n/ (v9).
    restructureDir: 'i18n',
    locales: APP_LOCALE_DEFINITIONS
      .filter(({ enabled }) => enabled)
      .map(({ code, language, name }) => ({
        code,
        language,
        name,
        files: localeMessageFiles(code),
      })),
    lazy: true,
    langDir: 'locales',
    defaultLocale: 'es',
    strategy: 'no_prefix',
    vueI18n: 'i18n.config.ts',
    detectBrowserLanguage: false,
    bundle: {
      optimizeTranslationDirective: false,
    },
  },
  site: {
    url: 'https://warocol.com'
  },
  robots: {
    credits: false,
    sitemap: 'https://warocol.com/sitemap.xml',
    groups: [
      {
        userAgents: ['*'],
        allow: ['/'],
        disallow: ['/api/*', '/dashboard/*', '/pos/*', '/menu/*', '/inventario/*', '/abastecimiento/*', '/ventas/*', '/equipo', '/finanzas/*', '/financiero/*', '/auth/*']
      }
    ]
  },
  devtools: {
    enabled: false
  },
  vite: {
    optimizeDeps: {
      // Pre-bundle on dev startup — avoids 500 on first /pos/checkout visit after QR import.
      include: ['qrcode'],
    },
    server: {
      // Node walks up to ~/node_modules (home package.json); vite-node 403s without this in dev
      fs: {
        allow: [
          process.cwd(),
          `${process.env.HOME}/node_modules`
        ]
      }
    },
    vue: {
      script: {
        defineModel: true,
        propsDestructure: true
      }
    }
  },
  css: ['~/assets/css/main.scss', '~/assets/css/design-system.css', '~/assets/css/design-tokens.css', '~/assets/css/fonts.css'],
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {}
    }
  }
})
