/** Permanent blog slug consolidations (warocol.com#953, #2313). */
export const BLOG_SEO_REDIRECTS = {
  '/blog/software-pos-restaurantes-colombia': '/blog/mejores-software-restaurantes-colombia',
  '/blog/sistema-pos-colombia': '/blog/mejores-software-restaurantes-colombia',
  '/blog/software-para-restaurante': '/blog/mejores-software-restaurantes-colombia',
  '/blog/software-para-restaurantes': '/blog/mejores-software-restaurantes-colombia',
  '/blog/best-pos-for-restaurant': '/blog/best-pos-system-for-restaurant',
  '/blog/software-restaurantes-gratis-colombia': '/blog/software-para-restaurante-gratis',
  '/blog/software-open-source-restaurantes': '/blog/software-para-restaurante-gratis',
  '/blog/software-contable-restaurantes-gratis': '/blog/software-para-restaurante-gratis',
}

export function blogSeoRedirectTarget(path) {
  return BLOG_SEO_REDIRECTS[path.split('?')[0]]
}
