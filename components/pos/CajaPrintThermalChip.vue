<script setup lang="ts">
/**
 * Compact header control when sticky browser-print is active (#2062/#2064).
 * Clears force-browser so the next caja ticket uses the thermal printer again.
 * Quiet chip — temporary mode, not a primary CTA.
 */
const { t, te } = useI18n({ useScope: 'global' })
const { clearForceBrowser } = useCajaPrintPreference()

const label = computed(() =>
  te('shell.printUseThermalShort')
    ? t('shell.printUseThermalShort')
    : 'Usar térmica',
)
const ariaLabel = computed(() =>
  te('shell.printUseThermal')
    ? t('shell.printUseThermal')
    : 'Usar impresora térmica',
)
const title = computed(() =>
  te('shell.printBrowserStickyBody')
    ? t('shell.printBrowserStickyBody')
    : 'Imprimiendo por el navegador hasta que vuelvas a la térmica.',
)
</script>

<template>
  <button
    type="button"
    class="h-9 max-w-[7.5rem] flex-shrink-0 inline-flex items-center justify-center rounded-lg border border-shell-action-border bg-shell-action-bg px-2 text-xs font-medium text-shell-action-text hover:bg-shell-action-hover-bg focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring transition-colors truncate"
    :title="title"
    :aria-label="ariaLabel"
    @click="clearForceBrowser"
  >
    {{ label }}
  </button>
</template>
