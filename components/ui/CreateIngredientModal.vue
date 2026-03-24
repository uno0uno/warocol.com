<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    @click.self="close"
  >
    <div class="bg-surface rounded-xl max-w-md w-full shadow-xl">
      <!-- Header -->
      <div class="p-6 border-b border-border flex items-center justify-between">
        <h3 class="text-lg font-semibold text-text-primary">Crear ingrediente</h3>
        <button
          @click="close"
          :disabled="isSaving"
          aria-label="Cerrar modal"
          class="p-2 rounded-md hover:bg-surface-secondary transition-colors disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <svg class="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="p-6 space-y-5">
        <!-- Similar ingredients warning (from fuzzy check) -->
        <div v-if="similarIngredients.length && !forceConfirmed" class="p-3 bg-warning/10 border border-warning/30 rounded-lg">
          <p class="text-sm font-semibold text-warning mb-2 flex items-center gap-1.5">
            <svg class="w-4 h-4 flex-shrink-0" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Ya existen ingredientes similares:
          </p>
          <ul class="space-y-1 mb-3">
            <li
              v-for="s in similarIngredients"
              :key="s.id"
              class="flex items-center justify-between text-sm"
            >
              <span class="text-text-primary">{{ s.name }}</span>
              <button
                @click="selectExisting(s)"
                class="text-xs text-primary hover:underline font-medium ml-2 flex-shrink-0 min-h-[32px] flex items-center"
              >
                Usar este
              </button>
            </li>
          </ul>
          <button
            @click="forceConfirmed = true"
            class="w-full px-3 py-2 border border-warning/40 rounded-lg text-sm font-medium text-warning hover:bg-warning/10 transition-colors min-h-[40px]"
          >
            Crear nuevo de todas formas
          </button>
        </div>

        <!-- Form (shown when no similar warning OR user confirmed force) -->
        <template v-if="!similarIngredients.length || forceConfirmed">
          <!-- Nombre -->
          <div>
            <label for="ci-name" class="block text-sm font-medium text-text-primary mb-2">
              Nombre <span class="text-destructive">*</span>
            </label>
            <input
              id="ci-name"
              v-model="form.name"
              type="text"
              required
              class="input-base w-full px-4 py-2"
              placeholder="Nombre del ingrediente"
            />
          </div>

          <!-- Base -->
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">
              Base <span class="text-destructive">*</span>
            </label>
            <UiIngredientSearchInput
              :initial-value="''"
              placeholder="Buscar ingrediente base..."
              :allow-create="true"
              @select="onBaseSelected"
              @create="onBaseCreateRequest"
            />
            <p v-if="isResolvingBase" class="mt-1.5 text-xs text-text-secondary flex items-center gap-1.5">
              <CommonsTheCustomLoader size="small" />
              Buscando base...
            </p>
            <p v-else-if="form.base" class="mt-1.5 text-xs text-success flex items-center gap-1">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              Base seleccionada: <strong class="ml-0.5">{{ form.base.name }}</strong>
            </p>
            <p v-else class="mt-1 text-xs text-text-secondary">Selecciona la base para heredar la unidad</p>
          </div>

          <!-- Unidad (read-only, from base) -->
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">Unidad</label>
            <div class="px-4 py-3 border border-border rounded-lg bg-surface-secondary text-sm"
                 :class="form.base ? 'text-text-primary' : 'text-text-secondary/60'">
              {{ form.base?.unit ?? '— se hereda del base —' }}
              <span v-if="form.base" class="text-xs ml-2 text-text-secondary/60">(heredada del base — no editable)</span>
            </div>
          </div>
        </template>

        <!-- API error -->
        <div v-if="apiError" class="flex items-center gap-2 text-destructive text-sm">
          <svg class="w-4 h-4 flex-shrink-0" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ apiError }}</span>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-2">
          <button
            type="button"
            @click="close"
            :disabled="isSaving"
            class="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-surface-secondary transition-colors disabled:opacity-50 min-h-[44px]"
          >
            Cancelar
          </button>
          <button
            v-if="!similarIngredients.length || forceConfirmed"
            type="button"
            @click="handleSave"
            :disabled="isSaving || !form.name.trim() || !form.base"
            class="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity min-h-[44px] flex items-center gap-2"
          >
            <CommonsTheCustomLoader v-if="isSaving" size="small" />
            <span>{{ isSaving ? 'Guardando...' : 'Crear ingrediente' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface SimilarIngredient {
  id: string
  name: string
  score: number
}

interface BaseIngredient {
  id: string
  name: string
  unit: string
  [key: string]: any
}

interface Props {
  modelValue: boolean
  initialName?: string
}

interface Emits {
  (e: 'update:modelValue', v: boolean): void
  (e: 'created', ingredient: any): void
  (e: 'select', ingredient: any): void
}

const props = withDefaults(defineProps<Props>(), {
  initialName: ''
})

const emit = defineEmits<Emits>()

const form = ref({
  name: '',
  base: null as BaseIngredient | null,
})
const similarIngredients = ref<SimilarIngredient[]>([])
const forceConfirmed = ref(false)
const isSaving = ref(false)
const isResolvingBase = ref(false)
const apiError = ref('')


// Reset state when modal opens
watch(() => props.modelValue, (open) => {
  if (open) {
    form.value = { name: props.initialName || '', base: null }
    similarIngredients.value = []
    forceConfirmed.value = false
    apiError.value = ''
    if (props.initialName) {
      checkFuzzy(props.initialName)
    }
  }
})

async function checkFuzzy(name: string) {
  if (!name.trim()) return
  try {
    const res = await $fetch<any>('/api/admin/ingredients', {
      query: { search: name, limit: 5 }
    })
    // Show as similar if any results come back for the search term
    const candidates = (res?.data || []).filter((item: any) =>
      item.name.toLowerCase() !== name.toLowerCase()
    )
    similarIngredients.value = candidates.slice(0, 5).map((item: any) => ({
      id: item.id,
      name: item.name,
      score: 1,
    }))
  } catch {
    // Non-critical — fuzzy check failure doesn't block creation
  }
}

function onBaseSelected(base: BaseIngredient) {
  form.value.base = base
  apiError.value = ''
}

async function onBaseCreateRequest(name: string) {
  isResolvingBase.value = true
  apiError.value = ''
  try {
    const res = await $fetch<any>('/api/admin/ingredients/validate-base', {
      method: 'POST',
      body: { name },
    })
    if (res.verdict === 'suggest' && res.suggested) {
      // Gemini found a semantic duplicate — use it silently
      form.value.base = res.suggested
    } else {
      // No duplicate — create the base
      const created = await $fetch<any>('/api/admin/ingredients', {
        method: 'POST',
        body: { name, force: true },
      })
      form.value.base = created.data
    }
  } catch (err: any) {
    apiError.value = err?.data?.detail || 'Error al resolver el ingrediente base.'
  } finally {
    isResolvingBase.value = false
  }
}

function selectExisting(ingredient: SimilarIngredient) {
  emit('select', ingredient)
  emit('update:modelValue', false)
}

async function handleSave() {
  if (!form.value.name.trim() || !form.value.base) return
  isSaving.value = true
  apiError.value = ''

  try {
    const body: any = {
      name: form.value.name.trim(),
      unit: form.value.base.unit,
      base_id: form.value.base.id,
      force: forceConfirmed.value,
    }

    const res = await $fetch<any>('/api/admin/ingredients', {
      method: 'POST',
      body,
    })

    emit('created', res.data)
    emit('update:modelValue', false)
  } catch (err: any) {
    const status = err?.status || err?.statusCode
    if (status === 409) {
      const detail = err?.data?.detail
      if (detail?.similar) {
        similarIngredients.value = detail.similar
        forceConfirmed.value = false
      } else {
        apiError.value = detail?.message || 'Ingrediente similar ya existe.'
      }
    } else {
      apiError.value = err?.data?.detail || 'Error al crear el ingrediente.'
    }
  } finally {
    isSaving.value = false
  }
}

function close() {
  if (isSaving.value) return
  emit('update:modelValue', false)
}
</script>
