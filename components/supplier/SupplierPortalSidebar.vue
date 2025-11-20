<template>
  <UiBaseSidebar>
    <!-- Supplier Selector -->
    <template #selector>
      <label class="text-xs text-titan-600 font-medium mb-2 block">Proveedor</label>
      <div class="px-3 py-2 bg-ebony-700 border border-ebony-600 rounded-lg text-sm text-white">
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 bg-crocus-600 rounded-full"></div>
          <span>{{ supplierName || 'Proveedor' }}</span>
        </div>
      </div>
    </template>

    <!-- Navigation Links -->
    <template #navigation>
      <NuxtLink
        :to="`/proveedor/${token}`"
        :class="[
          'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
          activePage === 'purchases'
            ? 'bg-ebony-600 text-white'
            : 'text-titan-600 hover:bg-ebony-600 hover:text-white'
        ]"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span>Órdenes de Compra</span>
      </NuxtLink>

      <NuxtLink
        :to="`/proveedor/${token}/facturacion`"
        :class="[
          'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
          activePage === 'billing'
            ? 'bg-ebony-600 text-white'
            : 'text-titan-600 hover:bg-ebony-600 hover:text-white'
        ]"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
        </svg>
        <span>Facturación</span>
      </NuxtLink>
    </template>

    <!-- Supplier Contact Info -->
    <template #footer>
      <div class="flex items-start gap-3 rounded-lg hover:bg-ebony-600 cursor-pointer p-2">
        <div class="w-10 h-10 bg-ebony-900 rounded-full flex items-center justify-center font-bold flex-shrink-0">
          {{ getInitials(supplierName) }}
        </div>
        <div class="min-w-0 flex-1">
          <div class="font-semibold text-sm truncate">{{ supplierName || 'Proveedor' }}</div>
          <div class="text-xs text-titan-600 truncate" v-if="supplierEmail">{{ supplierEmail }}</div>
          <div class="text-xs text-titan-600 truncate" v-if="supplierPhone">{{ supplierPhone }}</div>
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
