import { blogSeoRedirectTarget } from '~/utils/blogSeoRedirects.js'

/** Nitro-level 301s — works in `nuxt dev` where routeRules redirects may not run. */
export default defineEventHandler((event) => {
  const target = blogSeoRedirectTarget(event.path)
  if (target) {
    return sendRedirect(event, target, 301)
  }
})
