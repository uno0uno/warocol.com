<script setup lang="ts">
const props = defineProps<{
  item: any
  comandaStatus: string
  comandaId: string | number
}>()

const emit = defineEmits(['refresh'])
const toast = useToast()
const isUpdating = ref(false)

const toggleStatus = async () => {
  if (props.comandaStatus === 'ready' || isUpdating.value) return
  isUpdating.value = true
  const newStatus = props.item.status === 'ready' ? 'pending' : 'ready'
  try {
    await $fetch(`/api/api/comandas/${props.comandaId}/items/${props.item.id}/status`, {
      method: 'PATCH',
      body: { status: newStatus }
    })
    emit('refresh')
  } catch (error: any) {
    toast.error('Error al actualizar ítem')
  } finally {
    isUpdating.value = false
  }
}
</script>

<template>
  <div class="flex items-start gap-2 group">
    <span class="text-sm font-black text-primary bg-primary/10 px-1.5 rounded min-w-[1.5rem] text-center leading-relaxed">
      {{ Math.round(item.quantity) }}
    </span>
    
    <div class="flex-1 min-w-0" :class="item.status === 'cancelled' ? 'opacity-50' : ''">
      <p
        class="text-sm font-bold leading-tight uppercase transition-colors"
        :class="item.status === 'cancelled' ? 'line-through text-text-tertiary' : item.status === 'ready' ? 'text-text-tertiary line-through' : 'text-text-primary'"
      >
        {{ item.kitchen_name }}
      </p>

      <!-- Modifiers -->
      <div v-if="item.modifiers_snapshot?.length" class="mt-1 flex flex-wrap gap-1">
        <span
          v-for="(mod, idx) in item.modifiers_snapshot"
          :key="idx"
          class="text-[10px] font-bold bg-titan-200 text-titan-800 px-1.5 py-0.5 rounded uppercase"
        >
          + {{ mod.name }}
        </span>
      </div>

      <!-- Item Notes -->
      <p v-if="item.notes && item.status !== 'cancelled'" class="text-[10px] italic text-destructive font-bold mt-1 uppercase">
        ⚠️ {{ item.notes }}
      </p>
    </div>

    <!-- Cancelled badge -->
    <span v-if="item.status === 'cancelled'" class="flex-shrink-0 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-tight rounded border bg-destructive/10 text-destructive border-destructive/30">
      ANULADO
    </span>

    <!-- Toggle Button -->
    <template v-else>
      <button
        v-if="comandaStatus !== 'ready'"
        @click="toggleStatus"
        :disabled="isUpdating"
        class="h-7 w-7 rounded-lg flex items-center justify-center transition-all border active:scale-90"
        :class="item.status === 'ready'
          ? 'bg-success border-success text-white shadow-sm shadow-success/30'
          : 'bg-surface border-border text-titan-300 hover:border-primary hover:text-primary'"
      >
        <UiLoadingMatrix v-if="isUpdating" size="4px" />
        <svg v-else class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M20 6 9 17 4 12"/>
        </svg>
      </button>

      <div v-else-if="item.status === 'ready'" class="h-7 w-7 flex items-center justify-center text-success">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <path d="m9 12 2 2 4-4"/>
        </svg>
      </div>
    </template>
  </div>
</template>
