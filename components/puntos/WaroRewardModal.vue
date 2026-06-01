<template>
  <UiModal v-model="open" :title="isEdit ? 'Editar recompensa' : 'Nueva recompensa'">
    <div class="px-6 py-5 space-y-4">
      <div class="flex flex-col gap-1.5">
        <label for="reward-name" class="text-sm font-medium text-text-primary">Nombre</label>
        <input
          id="reward-name"
          v-model="form.name"
          type="text"
          placeholder="Ej. Café gratis"
          class="h-10 px-3 text-sm border-2 border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          :disabled="isSaving"
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="reward-type" class="text-sm font-medium text-text-primary">Tipo</label>
        <select
          id="reward-type"
          v-model="form.reward_type"
          class="h-10 px-3 text-sm border-2 border-border rounded-lg bg-background"
          :disabled="isSaving || isEdit"
        >
          <option value="fixed_cop_off">Descuento fijo (COP)</option>
          <option value="free_product">Producto gratis</option>
        </select>
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="reward-cost" class="text-sm font-medium text-text-primary">Costo en Waros</label>
        <input
          id="reward-cost"
          v-model.number="form.waros_cost"
          type="number"
          min="1"
          step="1"
          class="h-10 px-3 text-sm border-2 border-border rounded-lg bg-background"
          :disabled="isSaving"
        />
      </div>

      <div v-if="form.reward_type === 'fixed_cop_off'" class="flex flex-col gap-1.5">
        <label for="reward-cop" class="text-sm font-medium text-text-primary">Descuento (COP)</label>
        <input
          id="reward-cop"
          v-model.number="form.fixed_cop_off"
          type="number"
          min="1"
          step="1000"
          class="h-10 px-3 text-sm border-2 border-border rounded-lg bg-background"
          :disabled="isSaving"
        />
      </div>

      <div v-else class="flex flex-col gap-1.5">
        <label class="text-sm font-medium text-text-primary">Producto</label>
        <UiProductSearchInput
          v-if="!selectedProduct"
          placeholder="Buscar producto del menú..."
          @select="onProductSelect"
        />
        <div
          v-else
          class="flex items-center justify-between gap-2 px-3 py-2 border border-border rounded-lg bg-surface-secondary"
        >
          <span class="text-sm font-medium text-text-primary truncate">{{ selectedProduct.name }}</span>
          <button
            type="button"
            class="text-xs text-text-secondary hover:text-text-primary"
            @click="clearProduct"
          >
            Cambiar
          </button>
        </div>
      </div>

      <label class="flex items-center gap-2 cursor-pointer">
        <input
          v-model="form.is_active"
          type="checkbox"
          class="rounded border-border text-primary focus:ring-primary"
          :disabled="isSaving"
        />
        <span class="text-sm text-text-primary">Recompensa activa</span>
      </label>

      <p v-if="apiError" role="alert" class="text-sm text-red-600">{{ apiError }}</p>
    </div>
    <template #footer>
      <div class="flex items-center justify-end gap-3 px-6 py-4">
        <button
          type="button"
          @click="open = false"
          class="min-h-[44px] px-4 text-sm font-medium border-2 border-border rounded-lg"
        >
          Cancelar
        </button>
        <button
          type="button"
          :disabled="isSaving || !canSubmit"
          @click="handleSubmit"
          class="min-h-[44px] px-5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
        >
          <UiLoadingDots v-if="isSaving" size="9px" />
          <span v-else>{{ isEdit ? 'Guardar' : 'Crear' }}</span>
        </button>
      </div>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { reactive, computed, watch, ref } from 'vue'
import type { WaroReward, WaroRewardType } from '~/composables/useWaroRewards'
import type { ProductRow } from '~/composables/useProductSearch'

interface Props {
  modelValue: boolean
  reward?: WaroReward | null
  isSaving: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'save', payload: {
    name: string
    reward_type: WaroRewardType
    waros_cost: number
    fixed_cop_off?: number | null
    product_id?: string | null
    is_active: boolean
  }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const isEdit = computed(() => !!props.reward?.id)
const apiError = ref<string | null>(null)
const selectedProduct = ref<ProductRow | null>(null)

const form = reactive({
  name: '',
  reward_type: 'fixed_cop_off' as WaroRewardType,
  waros_cost: 100,
  fixed_cop_off: 5000 as number | null,
  is_active: true,
})

watch(() => props.modelValue, async (v) => {
  if (!v) return
  apiError.value = null
  if (props.reward) {
    form.name = props.reward.name
    form.reward_type = props.reward.reward_type
    form.waros_cost = props.reward.waros_cost
    form.fixed_cop_off = props.reward.fixed_cop_off
    form.is_active = props.reward.is_active
    if (props.reward.product_id) {
      try {
        const res = await $fetch<{ data?: { name?: string } }>(
          `/api/menu/products/${props.reward.product_id}`
        )
        selectedProduct.value = {
          id: props.reward.product_id,
          name: res.data?.name || 'Producto',
        }
      } catch {
        selectedProduct.value = {
          id: props.reward.product_id,
          name: 'Producto',
        }
      }
    } else {
      selectedProduct.value = null
    }
  } else {
    form.name = ''
    form.reward_type = 'fixed_cop_off'
    form.waros_cost = 100
    form.fixed_cop_off = 5000
    form.is_active = true
    selectedProduct.value = null
  }
})

const onProductSelect = (product: ProductRow) => {
  selectedProduct.value = product
}

const clearProduct = () => {
  selectedProduct.value = null
}

const canSubmit = computed(() => {
  if (!form.name.trim() || form.waros_cost < 1) return false
  if (form.reward_type === 'fixed_cop_off') {
    return !!form.fixed_cop_off && form.fixed_cop_off > 0
  }
  return !!selectedProduct.value?.id
})

const handleSubmit = () => {
  if (!canSubmit.value) return
  emit('save', {
    name: form.name.trim(),
    reward_type: form.reward_type,
    waros_cost: form.waros_cost,
    fixed_cop_off:
      form.reward_type === 'fixed_cop_off' ? form.fixed_cop_off : null,
    product_id:
      form.reward_type === 'free_product' ? selectedProduct.value?.id ?? null : null,
    is_active: form.is_active,
  })
}
</script>
