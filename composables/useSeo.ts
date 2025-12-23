export const useSeo = () => {
    const { public: config } = useRuntimeConfig()

    const siteUrl = config.siteUrl
    const canonical = config.canonicalUrl
    const siteName = config.siteName
    const title = config.seoTitle
    const description = config.seoDescription
    const ogTitle = config.ogTitle || title
    const ogDescription = config.ogDescription || description
    const ogUrl = config.ogUrl || siteUrl
    const ogImage = config.ogImage
    const twitterTitle = config.twitterTitle || title
    const twitterDescription = config.twitterDescription || description
    const twitterImage = config.twitterImage || ogImage

    // JSON-LD for WebPage
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: title,
        description,
        url: canonical,
        inLanguage: config.siteLang || 'es',
        isPartOf: {
            '@type': 'WebSite',
            name: siteName,
            url: siteUrl
        }
    }

    // Helper to set page-specific SEO
    const setPageSeo = (options: {
        title?: string
        description?: string
        image?: string
        url?: string
    }) => {
        const pageTitle = options.title || title
        const pageDescription = options.description || description
        const pageImage = options.image || ogImage
        const pageUrl = options.url || canonical

        useHead({
            title: pageTitle,
            meta: [
                { name: 'description', content: pageDescription },
                { property: 'og:title', content: pageTitle },
                { property: 'og:description', content: pageDescription },
                { property: 'og:image', content: pageImage },
                { property: 'og:url', content: pageUrl },
                { name: 'twitter:title', content: pageTitle },
                { name: 'twitter:description', content: pageDescription },
                { name: 'twitter:image', content: pageImage }
            ],
            link: [
                { rel: 'canonical', href: pageUrl }
            ]
        })
    }

    return {
        siteUrl,
        canonical,
        siteName,
        title,
        description,
        ogTitle,
        ogDescription,
        ogUrl,
        ogImage,
        twitterTitle,
        twitterDescription,
        twitterImage,
        jsonLd,
        setPageSeo
    }
}
