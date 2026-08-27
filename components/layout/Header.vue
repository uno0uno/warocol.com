<template>
  <header class="sticky top-0 z-[100] shrink-0 box-border h-[var(--layout-public-header-offset)] bg-surface border-b border-titan-200 w-full">
    <div class="flex h-[var(--layout-public-header-height)] items-center gap-2 px-3 sm:gap-3 sm:px-4 md:gap-4 md:px-6 max-w-[1400px] mx-auto w-full">

      <!-- Logo -->
      <NuxtLink to="/" class="flex items-center gap-2.5 no-underline shrink-0">
        <img :src="logo" alt="WARO" class="h-[22px] max-w-[96px] sm:h-[26px] sm:max-w-none w-auto object-contain" />
        <span v-if="badgeText" class="text-[10px] font-bold tracking-[0.1em] uppercase text-crocus-600 bg-crocus-50 border border-crocus-200 py-[2px] px-2 rounded-xl">{{ badgeText }}</span>
      </NuxtLink>

      <!-- Nav principal (centro) — solo desktop -->
      <nav :aria-label="t('blog.nav.aria')" class="hidden md:flex items-center gap-1 ms-6">
        <NuxtLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="text-[13.5px] font-medium text-ebony-500 hover:text-ebony-900 hover:bg-titan-50 px-3 py-1.5 rounded-xl transition-all no-underline whitespace-nowrap"
          :class="{ 'text-crocus-600 bg-crocus-50 font-semibold': isActive(link.to) }"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>

      <!-- Acciones derecha: auth + locale (locale a la derecha de Crear cuenta) -->
      <div class="flex items-center gap-1 sm:gap-2 shrink-0 ms-auto">
        <NuxtLink
          :to="authStore.isSessionValid ? '/ventas' : '/auth/login'"
          class="inline-flex items-center min-h-9 text-[12px] sm:text-[13px] font-semibold text-ebony-600 hover:text-crocus-600 hover:bg-titan-50 px-2 sm:px-3 py-1.5 rounded-xl transition-all no-underline whitespace-nowrap"
        >
          {{ authStore.isSessionValid ? t('auth.myPanel') : t('auth.signIn') }}
        </NuxtLink>

        <button
          class="min-h-9 text-[12px] sm:text-[13px] font-bold text-white bg-crocus-600 hover:bg-crocus-700 active:scale-[0.97] py-[7px] px-2.5 sm:px-4 rounded-xl cursor-pointer transition-all font-inherit whitespace-nowrap shadow-sm"
          type="button"
          @click="startRegistration"
        >
          {{ t('auth.createAccount') }}
        </button>

        <LayoutPublicLocaleSelect
          id="public-header-locale"
          :compact="isCompactLocaleSelect"
          :model-value="locale"
          @update:model-value="onLocaleChange"
        />
      </div>

    </div>
  </header>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useCityCatalog } from '~/composables/useCityCatalog'
import {
  type AppLocaleCode,
} from '~/utils/appLocales'
import { resolveAnonymousReaderMarket } from '~/utils/articleMarket'
import { activatePublicCta, getPublicCta } from '~/utils/publicCta'
import logo from '~/public/logo_waro_colombia.png'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { t } = useI18n({ useScope: 'global' })
const { locale, applyPersonalLocale } = useAppLocale()
const { cityFromRoute, isCityRoute } = useCityCatalog()

const isCompactLocaleSelect = ref(false)

function syncCompactLocaleSelect() {
  if (!import.meta.client) return
  isCompactLocaleSelect.value = window.matchMedia('(max-width: 639px)').matches
}

async function onLocaleChange(next: AppLocaleCode) {
  await applyPersonalLocale(next)
}

onMounted(() => {
  syncCompactLocaleSelect()
  window.addEventListener('resize', syncCompactLocaleSelect)
})

onBeforeUnmount(() => {
  if (!import.meta.client) return
  window.removeEventListener('resize', syncCompactLocaleSelect)
})

const requestHeaders = useRequestHeaders(['accept-language', 'cf-ipcountry'])
const headerMarket = computed(() => resolveAnonymousReaderMarket({
  acceptLanguage: requestHeaders['accept-language'],
  cfIpCountry: requestHeaders['cf-ipcountry'],
}))
const headerCta = computed(() => getPublicCta('pos', 'header', headerMarket.value))

const startRegistration = () => router.push(activatePublicCta(
  headerCta.value,
  { source: 'public_header', content: 'primary' },
  undefined,
  import.meta.client ? window.sessionStorage : null,
))

const isDocs = computed(() => route.path.startsWith('/docs'))

// Contextual badge next to the logo. Order matters — known literal
// prefixes win before the catalog lookup so future cities can't shadow
// `/docs` or `/blog` accidentally (warocol.com#619).
const badgeText = computed(() => {
  if (route.path.startsWith('/docs')) return t('blog.badge.docs')
  if (route.path.startsWith('/blog')) return t('blog.badge.blog')
  if (route.path === '/ciudades') return t('blog.badge.cities')
  const city = cityFromRoute(route.path)
  return city?.city ?? null
})

const navLinks = computed(() => [
  { to: '/ciudades', label: t('blog.nav.cities') },
  { to: '/blog', label: t('blog.nav.blog') },
  { to: '/docs', label: t('blog.nav.docs') },
])

function isActive(path: string) {
  // The "Ciudades" link highlights on both /ciudades and any /<city_slug>
  // route so the customer always sees where they are in the directory.
  if (path === '/ciudades') {
    return route.path === '/ciudades' || isCityRoute(route.path)
  }
  return route.path.startsWith(path)
}
</script>
