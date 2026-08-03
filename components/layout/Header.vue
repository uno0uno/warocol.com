<template>
  <header class="sticky top-0 z-[100] shrink-0 box-border h-[var(--layout-public-header-offset)] bg-surface border-b border-titan-200 w-full">
    <div class="flex h-[var(--layout-public-header-height)] items-center gap-2 px-3 sm:gap-3 sm:px-4 md:gap-4 md:px-6 max-w-[1400px] mx-auto w-full">

      <!-- Logo -->
      <NuxtLink to="/" class="flex items-center gap-2.5 no-underline shrink-0">
        <img :src="logo" alt="WARO" class="h-[22px] max-w-[96px] sm:h-[26px] sm:max-w-none w-auto object-contain" />
        <span v-if="badgeText" class="text-[10px] font-bold tracking-[0.1em] uppercase text-crocus-600 bg-crocus-50 border border-crocus-200 py-[2px] px-2 rounded-xl">{{ badgeText }}</span>
      </NuxtLink>

      <!-- Nav principal (centro) — solo desktop -->
      <nav aria-label="Navegación principal" class="hidden md:flex items-center gap-1 ms-6">
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

      <!-- Language selector (replaces dead search) -->
      <div class="hidden md:flex ms-auto relative items-center min-w-[7.5rem] max-w-[11rem]">
        <label class="sr-only" for="public-header-locale">{{ t('shell.language') }}</label>
        <select
          id="public-header-locale"
          class="w-full appearance-none rounded-xl border border-titan-200 bg-titan-50 py-[7px] ps-3 pe-8 text-[13px] font-medium text-ebony-600 outline-none transition-colors hover:border-crocus-300 focus:border-crocus-300"
          :value="locale"
          :dir="localeDir"
          @change="onLocaleChange"
        >
          <option
            v-for="definition in localeOptions"
            :key="definition.code"
            :value="definition.code"
            :dir="definition.direction"
          >
            {{ definition.name }}
          </option>
        </select>
        <svg
          class="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ebony-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      <!-- Acciones derecha -->
      <div class="flex items-center gap-1 sm:gap-2 shrink-0 ms-auto md:ms-0">
        <!-- Mobile language selector -->
        <div class="relative md:hidden">
          <label class="sr-only" for="public-header-locale-mobile">{{ t('shell.language') }}</label>
          <select
            id="public-header-locale-mobile"
            class="appearance-none rounded-xl border border-titan-200 bg-titan-50 py-[7px] ps-2 pe-7 text-[12px] font-medium text-ebony-600 outline-none"
            :value="locale"
            :dir="localeDir"
            @change="onLocaleChange"
          >
            <option
              v-for="definition in localeOptions"
              :key="definition.code"
              :value="definition.code"
              :dir="definition.direction"
            >
              {{ definition.code.toUpperCase() }}
            </option>
          </select>
          <svg
            class="pointer-events-none absolute end-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-ebony-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        <!-- Sign in / My Panel — always available, including mobile and tablet -->
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
      </div>

    </div>
  </header>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useCityCatalog } from '~/composables/useCityCatalog'
import {
  APP_LOCALE_DEFINITIONS,
  getLocaleDirection,
  normalizeEnabledAppLocale,
  type AppLocaleCode,
} from '~/utils/appLocales'
import { activatePublicCta, getPublicCta } from '~/utils/publicCta'
import logo from '~/public/logo_waro_colombia.png'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { t } = useI18n({ useScope: 'global' })
const { locale, applyPersonalLocale } = useAppLocale()
const { cityFromRoute, isCityRoute } = useCityCatalog()

const localeOptions = APP_LOCALE_DEFINITIONS.filter(definition => definition.enabled)
const localeDir = computed(() => getLocaleDirection(locale.value))

async function onLocaleChange(event: Event) {
  const next = normalizeEnabledAppLocale((event.target as HTMLSelectElement).value)
  if (!next) return
  await applyPersonalLocale(next as AppLocaleCode)
}

// Default CO market until a dedicated US landing exists (epic #2093 decision).
const headerCta = getPublicCta('pos', 'header', { lang: 'es', country: 'Colombia' })

const startRegistration = () => router.push(activatePublicCta(
  headerCta,
  { source: 'public_header', content: 'primary' },
  undefined,
  import.meta.client ? window.sessionStorage : null,
))

const isDocs = computed(() => route.path.startsWith('/docs'))

// Contextual badge next to the logo. Order matters — known literal
// prefixes win before the catalog lookup so future cities can't shadow
// `/docs` or `/blog` accidentally (warocol.com#619).
const badgeText = computed(() => {
  if (route.path.startsWith('/docs')) return 'Docs'
  if (route.path.startsWith('/blog')) return 'Blog'
  if (route.path === '/ciudades') return 'Ciudades'
  const city = cityFromRoute(route.path)
  return city?.city ?? null
})

const navLinks = [
  { to: '/ciudades', label: 'Ciudades' },
  { to: '/blog', label: 'Blog' },
  { to: '/docs', label: 'Docs' },
]

function isActive(path: string) {
  // The "Ciudades" link highlights on both /ciudades and any /<city_slug>
  // route so the customer always sees where they are in the directory.
  if (path === '/ciudades') {
    return route.path === '/ciudades' || isCityRoute(route.path)
  }
  return route.path.startsWith(path)
}
</script>
