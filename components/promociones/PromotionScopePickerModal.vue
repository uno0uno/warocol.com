<template>
  <UiModal v-model="open" title="Productos seleccionados">
    <div class="px-6 pb-6 space-y-4" role="document">
      <input
        ref="searchInputRef"
        v-model="searchTerm"
        type="search"
        placeholder="Buscar producto…"
        class="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm text-text-primary bg-surface min-h-[44px]"
        aria-label="Buscar producto"
      />

      <div class="flex items-center justify-between gap-2">
        <p class="text-xs text-text-secondary">
          {{ products.length }} producto{{ products.length === 1 ? '' : 's' }} en alcance
        </p>
        <button
          v-if="products.length"
          type="button"
          class="text-xs font-medium text-destructive min-h-[44px] px-2"
          @click="emit('clear-all')"
        >
          Limpiar todo
        </button>
      </div>

      <p v-if="filteredProducts.length === 0" class="text-sm text-text-secondary text-center py-8">
        {{ searchTerm.trim() ? 'Sin resultados para esta búsqueda.' : 'No hay productos seleccionados.' }}
      </p>

      <ul v-else class="divide-y divide-border max-h-[50vh] overflow-y-auto">
        <li
          v-for="p in filteredProducts"
          :key="p.id"
          class="py-2.5 text-sm text-text-primary min-h-[44px] flex items-center justify-between gap-3"
        >
          <span class="min-w-0 truncate">{{ p.name }}</span>
          <button
            type="button"
            class="flex-shrink-0 text-destructive hover:opacity-70 min-h-[44px] min-w-[44px] flex items-center justify-center"
            :aria-label="`Quitar ${p.name}`"
            @click="emit('remove', p.id)"
          >
            ×
          </button>
        </li>
      </ul>
    </div>
  </UiModal>

  <UiBottomSheetModal v-model="open" title="Productos seleccionados" max-height="lg">
    <div class="px-4 pb-4 space-y-4" role="document">
      <input
        v-model="searchTerm"
        type="search"
        placeholder="Buscar producto…"
        class="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm text-text-primary bg-surface min-h-[44px]"
        aria-label="Buscar producto"
      />

      <div class="flex items-center justify-between gap-2">
        <p class="text-xs text-text-secondary">
          {{ products.length }} producto{{ products.length === 1 ? '' : 's' }} en alcance
        </p>
        <button
          v-if="products.length"
          type="button"
          class="text-xs font-medium text-destructive min-h-[44px] px-2"
          @click="emit('clear-all')"
        >
          Limpiar todo
        </button>
      </div>

      <p v-if="filteredProducts.length === 0" class="text-sm text-text-secondary text-center py-8">
        {{ searchTerm.trim() ? 'Sin resultados para esta búsqueda.' : 'No hay productos seleccionados.' }}
      </p>

      <ul v-else class="divide-y divide-border max-h-[50vh] overflow-y-auto">
        <li
          v-for="p in filteredProducts"
          :key="p.id"
          class="py-2.5 text-sm text-text-primary min-h-[44px] flex items-center justify-between gap-3"
        >
          <span class="min-w-0 truncate">{{ p.name }}</span>
          <button
            type="button"
            class="flex-shrink-0 text-destructive hover:opacity-70 min-h-[44px] min-w-[44px] flex items-center justify-center"
            :aria-label="`Quitar ${p.name}`"
            @click="emit('remove', p.id)"
          >
            ×
          </button>
        </li>
      </ul>
    </div>
  </UiBottomSheetModal>
</template>

<script setup lang="ts">
interface ScopeProduct {
  id: string
  name: string
}

const props = defineProps<{
  modelValue: boolean
  products: ScopeProduct[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'remove', id: string): void
  (e: 'clear-all'): void
}>()

const open = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

const searchTerm = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)

const filteredProducts = computed(() => {
  const q = searchTerm.value.trim().toLowerCase()
  if (!q) return props.products
  return props.products.filter((p) => p.name.toLowerCase().includes(q))
})

watch(open, (isOpen) => {
  if (!isOpen) {
    searchTerm.value = ''
    return
  }
  nextTick(() => searchInputRef.value?.focus())
})
</script>
