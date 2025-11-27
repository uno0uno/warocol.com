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
      publicKeyEncrypter: process.env.NUXT_PUBLIC_PUBLIC_KEY_ENCRYPTER || ''
    }
  },
  app: {
    head: {
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'charset', content: 'utf-8' }
      ],
      htmlAttrs: {
        lang: 'es',
        class: 'light'
      }
    }
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
    groups: [
      {
        userAgents: ['GPTBot'],
        disallow: ['/api/*'],
        allow: ['/']
      }
    ]
  },
  head: {
    link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }]
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