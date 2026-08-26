<template>
  <!-- Bottom Navigation - Solo Mobile -->
  <nav class="md:hidden fixed bottom-0 start-0 end-0 bg-shell-mobile-bg border-t border-shell-mobile-border shadow-lg z-50 safe-area-bottom">
    <div class="flex items-center justify-around px-2 py-2">

      <!-- Órdenes de Compra -->
      <NuxtLink
        :to="`/proveedor/${token}`"
        class="flex flex-col items-center gap-0.5 flex-1 group"
      >
        <div
          class="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200"
          :class="activePage === 'purchases'
            ? 'bg-badge-primary-bg'
            : 'hover:bg-shell-icon-hover-bg'"
        >
          <svg
            class="w-5 h-5 transition-colors"
            :class="activePage === 'purchases'
              ? 'text-badge-primary-text'
              : 'text-shell-icon-text'"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        </div>
        <span
          class="text-xs font-medium transition-colors"
          :class="activePage === 'purchases'
            ? 'text-badge-primary-text font-semibold'
            : 'text-text-secondary'"
        >
          {{ t('abastecimiento.portalSheet.orders') }}
        </span>
      </NuxtLink>

      <!-- Facturación -->
      <NuxtLink
        :to="`/proveedor/${token}/facturacion`"
        class="flex flex-col items-center gap-0.5 flex-1 group"
      >
        <div
          class="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200"
          :class="activePage === 'billing'
            ? 'bg-badge-primary-bg'
            : 'hover:bg-shell-icon-hover-bg'"
        >
          <svg
            class="w-5 h-5 transition-colors"
            :class="activePage === 'billing'
              ? 'text-badge-primary-text'
              : 'text-shell-icon-text'"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <span
          class="text-xs font-medium transition-colors"
          :class="activePage === 'billing'
            ? 'text-badge-primary-text font-semibold'
            : 'text-text-secondary'"
        >
          {{ t('abastecimiento.portalSheet.billing') }}
        </span>
      </NuxtLink>

      <!-- Refresh Button (solo si se proporciona onRefresh) -->
      <button
        v-if="onRefresh"
        @click="onRefresh"
        class="flex flex-col items-center gap-0.5 flex-1 group"
      >
        <div class="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 hover:bg-shell-icon-hover-bg">
          <svg class="w-5 h-5 transition-transform group-hover:rotate-180 duration-300 text-shell-icon-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
        </div>
        <span class="text-xs font-medium transition-colors text-text-secondary">
          {{ t('abastecimiento.portalSheet.refresh') }}
        </span>
      </button>

      <!-- Información del Proveedor -->
      <button
        @click="showSupplierModal = true"
        class="flex flex-col items-center gap-0.5 flex-1 group"
      >
        <div class="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 hover:bg-shell-icon-hover-bg">
          <svg class="w-5 h-5 transition-colors text-shell-icon-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <span class="text-xs font-medium transition-colors text-text-secondary">
          {{ t('abastecimiento.portalSheet.info') }}
        </span>
      </button>

    </div>

    <!-- Supplier Info Modal -->
    <UiBottomSheetModal v-model="showSupplierModal" :title="t('abastecimiento.portalSheet.title')" max-height="md">
      <div class="p-4 space-y-6">
        <!-- Supplier Info -->
        <div class="space-y-4">
          <!-- Company Name -->
          <div class="px-4 py-3 bg-badge-primary-bg rounded-lg border border-badge-primary-border">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-shell-account-avatar-bg rounded-full flex items-center justify-center">
                <svg class="w-6 h-6 text-shell-account-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <div class="text-xs text-badge-primary-text font-medium">{{ t('abastecimiento.portalSheet.company') }}</div>
                <div class="font-semibold text-sm text-text-primary">{{ supplierName || t('abastecimiento.portalSheet.supplierFallback') }}</div>
              </div>
            </div>
          </div>

          <!-- Contact Info -->
          <div v-if="supplierEmail || supplierPhone" class="space-y-2">
            <div v-if="supplierEmail" class="flex items-center gap-3 px-4 py-2 bg-surface-secondary rounded-lg">
              <svg class="w-5 h-5 text-shell-icon-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <div>
                <div class="text-xs text-text-secondary">{{ t('abastecimiento.portalSheet.email') }}</div>
                <div class="text-sm text-text-primary">{{ supplierEmail }}</div>
              </div>
            </div>

            <div v-if="supplierPhone" class="flex items-center gap-3 px-4 py-2 bg-surface-secondary rounded-lg">
              <svg class="w-5 h-5 text-shell-icon-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <div>
                <div class="text-xs text-text-secondary">{{ t('abastecimiento.portalSheet.phone') }}</div>
                <div class="text-sm text-text-primary">{{ supplierPhone }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Help -->
        <div class="pt-4 border-t border-border">
          <div class="px-4 py-3 bg-state-info-bg rounded-lg border border-state-info-border">
            <div class="flex items-start gap-3">
              <svg class="w-5 h-5 text-state-info-icon flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <div class="text-sm font-medium text-state-info-text">{{ t('abastecimiento.portalSheet.helpTitle') }}</div>
                <div class="text-xs text-state-info-text mt-1">
                  <i18n-t keypath="abastecimiento.portalSheet.helpBody" tag="span">
                    <template #email>
                      <a href="mailto:hola@warolabs.com" class="font-medium underline">hola@warolabs.com</a>
                    </template>
                  </i18n-t>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UiBottomSheetModal>
  </nav>
</template>

<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })

interface Props {
  token: string
  activePage?: 'purchases' | 'billing'
  supplierName?: string
  supplierEmail?: string
  supplierPhone?: string
  onRefresh?: () => void | Promise<void>
}

const props = withDefaults(defineProps<Props>(), {
  activePage: 'purchases'
})

// Modal state
const showSupplierModal = ref(false)
</script>

<style scoped>
/* Safe area para dispositivos con notch */
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
