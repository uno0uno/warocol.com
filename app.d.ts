import type { Module } from '~/stores/access'

/**
 * TypeScript module augmentation for Nuxt 3 PageMeta.
 *
 * Adds the optional `module` field used by Epic 4 (warocol.com#489):
 * pages tagged with `definePageMeta({ module: 'X' })` get gated by the
 * global middleware `module-access.global.ts` (#557). Untagged pages
 * render unconditionally.
 *
 * The Module union is imported from `stores/access.ts` so misspellings
 * are caught at compile time.
 */
declare module '#app' {
  interface PageMeta {
    /**
     * Backend module required to access this page. When set and the
     * tenant's enforcement_mode is 'enforce', users without this module
     * are redirected to /403. When unset, the page renders for any
     * authenticated user.
     */
    module?: Module
  }
}

// Required for the file to be treated as a module, not a script.
export {}
