<script setup lang="ts">
/**
 * Compact header control when sticky browser-print is active (#2062).
 * Clears force-browser so the next caja ticket uses the thermal printer again.
 */
const { t } = useI18n({ useScope: 'global' })
const { clearForceBrowser } = useCajaPrintPreference()
</script>

<template>
  <button
    type="button"
    class="h-9 max-w-[9.5rem] flex-shrink-0 inline-flex items-center justify-center rounded-lg border border-border bg-surface px-2.5 text-xs font-semibold text-text-primary hover:bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring transition-colors truncate"
    :title="t('pos.receipt.printBrowserStickyBody')"
    :aria-label="t('pos.receipt.printUseThermal')"
    @click="clearForceBrowser"
  >
    {{ t('pos.receipt.printUseThermalShort') }}
  </button>
</template>
