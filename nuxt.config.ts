export default defineNuxtConfig({
  ssr: true,
  devServer: {
    port: parseInt(process.env.PORT || '8080')
  },
  nitro: {
    preset: 'node-server',
    routeRules: {
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
    pageTransition: { name: 'page', mode: 'out-in' }
  },
  modules: [
    ['@nuxtjs/google-fonts', {
      families: {
        Lato: [400, 700, 900]
      }
    }],
    '@nuxtjs/robots',
    '@pinia/nuxt',
    'nuxt-icon'
  ],
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
        disallow: ['/api/*', '/dashboard/*', '/pos/*', '/menu/*', '/inventario/*', '/abastecimiento/*', '/ventas/*', '/equipo', '/pagos/*', '/financiero/*', '/auth/*']
      }
    ]
  },
  devtools: { 
    enabled: true,
    port: 8080
  },
  css: ['~/assets/css/main.scss', '~/assets/css/design-system.css', '~/assets/css/design-tokens.css', '~/assets/css/fonts.css'],
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {}
    }
  }
})