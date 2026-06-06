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
        class="fixed inset-0 z-40 bg-overlay-backdrop/40"
        aria-hidden="true"
        @click="close"
      />
    </Transition>

    <Transition name="panel">
      <div
        v-if="modelValue"
        role="dialog"
        aria-modal="true"
        :aria-label="isEdit ? `Editar turno: ${template?.name}` : 'Crear turno'"
        class="fixed z-50 flex flex-col bg-surface shadow-2xl inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh] md:inset-y-0 md:right-0 md:bottom-auto md:left-auto md:inset-x-auto md:rounded-none md:w-full md:max-w-md md:max-h-none md:h-full"
      >
        <div class="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div class="w-10 h-1 rounded-full bg-sheet-border" aria-hidden="true" />
        </div>

        <div class="flex-shrink-0 bg-surface-secondary/40 border-b border-border px-6 py-4">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary" aria-hidden="true">
                <ClockIcon class="w-5 h-5" />
              </div>
              <div class="min-w-0">
                <h2 class="text-base font-bold text-text-primary leading-tight">
                  {{ isEdit ? 'Editar turno' : 'Nuevo turno' }}
                </h2>
                <p class="text-xs text-text-secondary leading-snug mt-0.5">
                  {{ isEdit ? template?.name : 'Horario reutilizable para arqueos de caja' }}
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Cerrar panel"
              :disabled="saving"
              class="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg text-text-tertiary hover:bg-surface-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary-focus-ring/30 disabled:opacity-50 transition-colors"
              @click="close"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div class="flex flex-col gap-1.5">
            <label :for="nameId" class="text-sm font-medium text-text-primary">
              Nombre <span class="text-destructive">*</span>
            </label>
            <input
              :id="nameId"
              ref="nameInput"
              v-model="form.name"
              type="text"
              maxlength="80"
              placeholder="Ej: Mañana, Tarde, Noche..."
              class="input-base w-full px-4 py-2"
              @input="clearError('name')"
            />
            <p v-if="errors.name" class="text-xs text-destructive">{{ errors.name }}</p>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1.5">
              <label :for="startId" class="text-sm font-medium text-text-primary">Inicio</label>
              <input
                :id="startId"
                v-model="form.start_time"
                type="time"
                class="input-base w-full px-3 py-2"
                @input="clearError('times')"
              />
            </div>
            <div class="flex flex-col gap-1.5">
              <label :for="endId" class="text-sm font-medium text-text-primary">Fin</label>
              <input
                :id="endId"
                v-model="form.end_time"
                type="time"
                class="input-base w-full px-3 py-2"
                @input="clearError('times')"
              />
            </div>
          </div>

          <div class="flex items-start justify-between gap-3 py-1">
            <div>
              <p class="text-sm font-medium text-text-primary">Cruza medianoche</p>
              <p class="text-xs text-text-secondary mt-0.5">
                Actívalo si el turno termina al día siguiente (ej. 22:00 – 06:00).
              </p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-0.5">
              <input v-model="form.crosses_midnight" type="checkbox" class="sr-only peer" />
              <div class="w-10 h-6 bg-control-toggle-track-off rounded-full peer peer-checked:bg-control-toggle-track-on peer-focus:ring-2 peer-focus:ring-control-toggle-focus-ring after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-control-toggle-thumb after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
            </label>
          </div>

          <p v-if="errors.times" class="text-xs text-destructive">{{ errors.times }}</p>
          <p v-if="errors.general" class="text-sm text-destructive">{{ errors.general }}</p>
        </div>

        <div class="flex-shrink-0 border-t border-border bg-surface px-6 py-4">
          <div class="flex flex-col-reverse sm:flex-row gap-2">
            <button
              type="button"
              :disabled="saving"
              class="flex-1 min-h-[44px] py-3 px-4 border-2 border-border rounded-lg text-text-primary font-medium hover:bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              @click="close"
            >
              Cancelar
            </button>
            <button
              type="button"
              :disabled="saving || !form.name.trim()"
              class="flex-1 min-h-[44px] py-3 px-4 bg-action-primary-bg text-action-primary-text rounded-lg font-semibold hover:bg-action-primary-hover-bg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              @click="submit"
            >
              <UiLoadingDots v-if="saving" size="8px" color="currentColor" />
              <span>{{ saving ? 'Guardando...' : (isEdit ? 'Guardar cambios' : 'Crear turno') }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ClockIcon } from '@heroicons/vue/24/outline'

export interface ShiftTemplate {
  id: string
  tenant_id: string
  name: string
  start_time: string
  end_time: string
  crosses_midnight: boolean
  sort_order: number
  is_active: boolean
}

interface Props {
  modelValue: boolean
  template?: ShiftTemplate | null
}

const props = withDefaults(defineProps<Props>(), {
  template: null,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved'): void
}>()

const isEdit = computed(() => !!props.template)

const uid = useId()
const nameId = `shift-name-${uid}`
const startId = `shift-start-${uid}`
const endId = `shift-end-${uid}`

const form = ref({
  name: '',
  start_time: '06:00',
  end_time: '14:00',
  crosses_midnight: false,
})

const saving = ref(false)
const errors = ref<Record<string, string>>({})
const nameInput = ref<HTMLInputElement | null>(null)

const timeToInput = (t: string) => (t?.length >= 5 ? t.slice(0, 5) : '06:00')
const inputToApiTime = (t: string) => (t.length === 5 ? `${t}:00` : t)

const parseMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

const clearError = (field: string) => {
  delete errors.value[field]
  delete errors.value.general
}

const resetForm = () => {
  form.value = {
    name: props.template?.name ?? '',
    start_time: timeToInput(props.template?.start_time ?? '06:00:00'),
    end_time: timeToInput(props.template?.end_time ?? '14:00:00'),
    crosses_midnight: props.template?.crosses_midnight ?? false,
  }
  errors.value = {}
}

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return
    resetForm()
    await nextTick()
    nameInput.value?.focus()
  },
)

watch(
  () => props.template,
  () => {
    if (props.modelValue) resetForm()
  },
)

const close = () => {
  if (saving.value) return
  emit('update:modelValue', false)
}

const validate = () => {
  const name = form.value.name.trim()
  if (!name) {
    errors.value = { name: 'El nombre es obligatorio' }
    return false
  }
  if (!form.value.start_time || !form.value.end_time) {
    errors.value = { times: 'Indica hora de inicio y fin' }
    return false
  }
  if (!form.value.crosses_midnight && parseMinutes(form.value.end_time) <= parseMinutes(form.value.start_time)) {
    errors.value = { times: 'La hora de fin debe ser posterior al inicio (o activa "Cruza medianoche")' }
    return false
  }
  return true
}

const submit = async () => {
  if (!validate()) return

  saving.value = true
  errors.value = {}
  const body = {
    name: form.value.name.trim(),
    start_time: inputToApiTime(form.value.start_time),
    end_time: inputToApiTime(form.value.end_time),
    crosses_midnight: form.value.crosses_midnight,
    sort_order: props.template?.sort_order ?? 0,
  }

  try {
    if (isEdit.value) {
      await $fetch(`/api/operaciones/shifts/${props.template!.id}`, {
        method: 'PATCH',
        body,
      })
    } else {
      await $fetch('/api/operaciones/shifts', {
        method: 'POST',
        body,
      })
    }
    emit('saved')
    emit('update:modelValue', false)
  } catch (err: any) {
    if (err?.status === 409) {
      errors.value = {
        name: typeof err?.data?.detail === 'string'
          ? err.data.detail
          : 'Ya existe un turno con ese nombre',
      }
    } else if (err?.status === 422) {
      errors.value = {
        times: typeof err?.data?.detail === 'string'
          ? err.data.detail
          : 'Horario inválido',
      }
    } else {
      errors.value = {
        general: err?.data?.detail || 'No se pudo guardar el turno. Inténtalo de nuevo.',
      }
    }
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.panel-enter-active,
.panel-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(100%);
}
@media (min-width: 768px) {
  .panel-enter-from,
  .panel-leave-to {
    transform: translateX(100%);
  }
}
</style>
