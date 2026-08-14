<script setup lang="ts">
import DirectoryView from '~/components/directory/DirectoryView.vue'
import type { PublicCity } from '~/composables/useCityCatalog'

/**
 * Extra-country per-city magazine (warocol.com#2296).
 * URL is always `/ciudades/{cc}/{city_slug}` — never `/{slug}`.
 */
definePageMeta({
  layout: 'default',
  publicAccess: true,
})

const EXTRA_DIRECTORY_COUNTRIES = new Set(['ar', 'mx', 'us'])

const route = useRoute()
const ccParam = Array.isArray(route.params.cc) ? route.params.cc[0] : route.params.cc
const cityParam = Array.isArray(route.params.city) ? route.params.city[0] : route.params.city
const cc = String(ccParam || '').toLowerCase()
const citySlug = String(cityParam || '').toLowerCase()

if (cc === 'co') {
  await navigateTo(citySlug ? `/${citySlug}` : '/ciudades', { redirectCode: 301 })
  return
}
if (!EXTRA_DIRECTORY_COUNTRIES.has(cc) || !citySlug) {
  throw createError({ statusCode: 404, statusMessage: 'Not Found' })
}

const { data: responseData } = await useAsyncData(
  () => `extra-city-entry-${cc}-${citySlug}`,
  () => $fetch<{ data?: PublicCity[] }>('/api/public/restaurant/cities', {
    params: { country_code: cc.toUpperCase(), include_empty: true },
  }),
  { server: true },
)

const catalogEntry = (responseData.value?.data ?? []).find((city) => city.city_slug === citySlug)
if (!catalogEntry) {
  throw createError({ statusCode: 404, statusMessage: 'Not Found' })
}
</script>

<template>
  <DirectoryView
    :city-slug="citySlug"
    :country-code="cc"
    :city-name="catalogEntry.city"
  />
</template>
