<template>
  <div class="relative w-44 sm:w-52 flex-shrink-0">
    <UiIngredientSearchInput
      :key="inputKey"
      :initial-value="displayValue"
      placeholder="Ingrediente..."
      @select="onSelect"
    />
    <button
      v-if="modelValue"
      type="button"
      aria-label="Quitar filtro de ingrediente"
      class="absolute right-2 top-1/2 -translate-y-1/2 min-h-[28px] min-w-[28px] inline-flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      @mousedown.prevent
      @click="clear"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const selectedName = ref('')
const inputKey = ref(0)

const displayValue = computed(() =>
  props.modelValue && selectedName.value ? selectedName.value : '',
)

async function resolveIngredientName(id: string): Promise<string> {
  try {
    const res = await $fetch<{ data?: { name?: string }; name?: string }>(
      `/api/suppliers/ingredients/${id}`,
    )
    return res?.data?.name ?? res?.name ?? ''
  } catch {
    return ''
  }
}

watch(
  () => props.modelValue,
  async (id) => {
    if (!id) {
      selectedName.value = ''
      return
    }
    if (!selectedName.value) {
      selectedName.value = await resolveIngredientName(id)
    }
  },
  { immediate: true },
)

function onSelect(ingredient: { id: string; name: string }) {
  selectedName.value = ingredient.name
  emit('update:modelValue', ingredient.id)
}

function clear() {
  selectedName.value = ''
  emit('update:modelValue', '')
  inputKey.value++
}

defineExpose({ clear })
</script>
