<template>
  <UiBaseSidebar>
    <!-- Supplier Selector -->
    <template #selector>
      <div class="px-3 py-2 border border-nav-divider rounded-lg text-sm bg-nav-surface-border">
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 bg-shell-account-indicator-bg rounded-full"></div>
          <span class="font-medium text-nav-icon-active">{{ supplierName || 'Proveedor' }}</span>
        </div>
      </div>
    </template>

    <!-- Navigation Links -->
    <template #navigation>
      <NuxtLink
        :to="`/proveedor/${token}`"
        :class="[
          'flex items-center gap-3 px-3 py-2 rounded-lg transition-all font-medium group',
          activePage === 'purchases'
            ? 'bg-nav-surface-border text-nav-icon-active'
            : 'text-nav-label-idle hover:bg-nav-surface-border hover:text-nav-label-hover'
        ]"
      >
        <svg :class="['w-5 h-5', activePage === 'purchases' ? 'text-nav-icon-active' : 'text-nav-icon-idle group-hover:text-nav-icon-hover']" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span>Órdenes de Compra</span>
      </NuxtLink>

      <NuxtLink
        :to="`/proveedor/${token}/facturacion`"
        :class="[
          'flex items-center gap-3 px-3 py-2 rounded-lg transition-all font-medium group',
          activePage === 'billing'
            ? 'bg-nav-surface-border text-nav-icon-active'
            : 'text-nav-label-idle hover:bg-nav-surface-border hover:text-nav-label-hover'
        ]"
      >
        <svg :class="['w-5 h-5', activePage === 'billing' ? 'text-nav-icon-active' : 'text-nav-icon-idle group-hover:text-nav-icon-hover']" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
        </svg>
        <span>Facturación</span>
      </NuxtLink>
    </template>

    <!-- Supplier Contact Info -->
    <template #footer>
      <div class="flex items-start gap-3 p-3 rounded-lg hover:bg-nav-surface-border cursor-pointer transition-colors">
        <div class="relative flex-shrink-0">
          <div class="w-10 h-10 bg-shell-account-avatar-bg rounded-full flex items-center justify-center font-semibold text-shell-account-text">
            {{ getInitials(supplierName) }}
          </div>
          <span class="absolute bottom-0 end-0 w-2.5 h-2.5 bg-shell-account-indicator-bg border-2 border-nav-surface-bg rounded-full"></span>
        </div>
        <div class="min-w-0 flex-1">
          <div class="font-semibold text-sm text-nav-icon-active truncate">{{ supplierName || 'Proveedor' }}</div>
          <div class="text-xs text-nav-label-idle truncate" v-if="supplierEmail">{{ supplierEmail }}</div>
          <div class="text-xs text-nav-label-idle truncate" v-if="supplierPhone">{{ supplierPhone }}</div>
        </div>
      </div>
    </template>
  </UiBaseSidebar>
</template>

<script setup lang="ts">
const props = defineProps<{
  token: string
  supplierName?: string
  supplierEmail?: string
  supplierPhone?: string
  activePage: 'purchases' | 'billing'
}>()

function getInitials(name?: string): string {
  if (!name) return 'PR'

  const parts = name.trim().split(' ')
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase()
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
</script>
