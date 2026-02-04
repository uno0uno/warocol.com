<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4"
        @click="$emit('update:modelValue', false)"
      >
        <Transition
          enter-active-class="transition-all duration-300"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition-all duration-300"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="modelValue"
            class="bg-white rounded-2xl w-full max-w-md shadow-xl"
            @click.stop
          >
            <!-- Header -->
            <div class="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 class="text-lg font-semibold text-gray-900">
                {{ isEditing ? 'Editar Gasto' : 'Registrar Nuevo Gasto' }}
              </h3>
              <button
                @click="$emit('update:modelValue', false)"
                class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Content -->
            <form @submit.prevent="handleSubmit" class="p-6 space-y-4">
              <!-- Date -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                <input 
                  type="date" 
                  v-model="form.transactionDate" 
                  required 
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crocus-500 focus:border-crocus-500"
                />
              </div>

              <!-- Category -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <select 
                  v-model="form.expenseCategoryId" 
                  required 
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crocus-500 focus:border-crocus-500"
                >
                  <option value="" disabled>Seleccionar...</option>
                  <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                    {{ cat.categoryName }}
                  </option>
                </select>
              </div>

              <!-- Description -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <input 
                  type="text" 
                  v-model="form.description" 
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crocus-500 focus:border-crocus-500" 
                  placeholder="Ej: Arreglo de tubería"
                />
              </div>

              <!-- Amount -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Monto</label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <span class="text-gray-500 text-sm">$</span>
                  </div>
                  <input 
                    type="number" 
                    v-model.number="form.amount" 
                    required 
                    min="0" 
                    step="100" 
                    class="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crocus-500 focus:border-crocus-500" 
                    placeholder="0"
                  />
                </div>
              </div>

              <!-- Actions -->
              <div class="flex justify-end gap-3 pt-4">
                <button 
                  type="button" 
                  @click="$emit('update:modelValue', false)" 
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  :disabled="loading" 
                  class="px-4 py-2 text-sm font-medium text-white bg-crocus-600 rounded-lg hover:bg-crocus-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {{ loading ? 'Guardando...' : 'Guardar' }}
                </button>
              </div>
            </form>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps({
  modelValue: Boolean,
  expenseToEdit: {
    type: Object,
    default: null
  },
  categories: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const loading = ref(false)

const form = reactive({
  transactionDate: new Date().toISOString().split('T')[0],
  expenseCategoryId: '',
  description: '',
  amount: null as number | null
})

const isEditing = computed(() => !!props.expenseToEdit)

// Watch for edit mode
watch(() => props.expenseToEdit, (newVal) => {
  if (newVal) {
    form.transactionDate = newVal.transactionDate
    form.expenseCategoryId = newVal.expenseCategoryId
    form.description = newVal.description
    form.amount = newVal.amount
  } else {
    // Reset
    form.transactionDate = new Date().toISOString().split('T')[0]
    form.expenseCategoryId = ''
    form.description = ''
    form.amount = null
  }
}, { immediate: true })

const handleSubmit = async () => {
  if (!form.amount || !form.expenseCategoryId) return
  
  loading.value = true
  try {
    if (isEditing.value) {
      await $fetch(`/api/finance/expenses/${props.expenseToEdit.id}`, {
        method: 'PUT',
        body: {
          ...form,
          amount: Number(form.amount)
        }
      })
    } else {
      await $fetch('/api/finance/expenses', {
        method: 'POST',
        body: {
          ...form,
          amount: Number(form.amount)
        }
      })
    }
    emit('saved')
    emit('update:modelValue', false)
  } catch (e) {
    alert('Error guardando el gasto')
  } finally {
    loading.value = false
  }
}
</script>
