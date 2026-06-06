<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="modelValue" class="fixed inset-0 z-40 bg-overlay-backdrop/40" aria-hidden="true" @click="close" />
    </Transition>

    <!-- Panel: bottom sheet on mobile, slide-over on desktop -->
    <Transition name="panel">
      <div
        v-if="modelValue"
        role="dialog"
        aria-modal="true"
        :aria-label="isEdit ? `Editar ${tableSingularLower}: ${table?.name}` : `Crear nueva ${tableSingularLower}`"
        class="fixed z-50 flex flex-col bg-surface shadow-2xl
               inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
               md:inset-y-0 md:right-0 md:bottom-auto md:left-auto md:inset-x-auto md:rounded-none md:w-full md:max-w-md md:max-h-none md:h-full"
      >
        <!-- Mobile drag handle -->
        <div class="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div class="w-10 h-1 rounded-full bg-sheet-border" aria-hidden="true" />
        </div>

        <!-- Header -->
        <div class="flex-shrink-0 bg-surface-secondary/40 border-b border-border px-6 py-4">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary" aria-hidden="true">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 10h18M3 14h18M10 10V6m4 4V6m-9 8v4m14-4v4M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
                </svg>
              </div>
              <div class="min-w-0">
                <h2 class="text-base font-bold text-text-primary leading-tight">
                  {{ isEdit ? `Editar ${tableSingularLower}` : `Nueva ${tableSingularLower}` }}
                </h2>
                <p class="text-xs text-text-secondary leading-snug mt-0.5">
                  {{ isEdit ? table?.name : 'Configura el nombre y capacidad' }}
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Cerrar panel"
              class="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg text-text-tertiary hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-action-primary-focus-ring/30"
              @click="close"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Scrollable body -->
        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <!-- Nombre -->
          <div class="flex flex-col gap-1.5">
            <label for="mesa-name" class="text-sm font-medium text-text-primary">
              Nombre <span class="text-destructive" aria-label="obligatorio">*</span>
            </label>
            <input
              id="mesa-name"
              v-model="form.name"
              type="text"
              :placeholder="`Ej: ${tableSingular} 1, Terraza VIP`"
              maxlength="50"
              :class="inputClass"
              @input="clearError('name')"
            />
            <p v-if="errors.name" class="text-xs text-destructive">{{ errors.name }}</p>
          </div>

          <!-- Código POS -->
          <div v-if="!table?.is_bar" class="flex flex-col gap-1.5">
            <label for="mesa-code" class="text-sm font-medium text-text-primary">
              Código POS
              <span class="text-xs font-normal text-text-tertiary ml-1">(opcional, máx. 4 — ej. 12, T1)</span>
            </label>
            <input
              id="mesa-code"
              v-model="form.code"
              type="text"
              maxlength="4"
              placeholder="Si vacío, se infiere del nombre"
              :class="inputClass"
              @input="clearError('code')"
            />
            <p v-if="errors.code" class="text-xs text-destructive">{{ errors.code }}</p>
            <p v-else class="text-[11px] text-text-tertiary leading-snug">
              Se muestra en el plano del POS. Si no lo defines, usamos el número o iniciales del nombre.
            </p>
          </div>

          <!-- Capacidad -->
          <div class="flex flex-col gap-1.5">
            <label for="mesa-capacity" class="text-sm font-medium text-text-primary">
              Capacidad <span class="text-xs font-normal text-text-tertiary ml-1">(opcional — número de sillas)</span>
            </label>
            <input
              id="mesa-capacity"
              v-model.number="form.capacity"
              type="number"
              min="1"
              placeholder="Ej: 4"
              :class="inputClass"
              @input="clearError('capacity')"
            />
            <p v-if="errors.capacity" class="text-xs text-destructive">{{ errors.capacity }}</p>
          </div>

          <!-- Mesero asignado (issue #573, only when feature flag ON) -->
          <div v-if="showMeseroField" class="flex flex-col gap-1.5">
            <label for="mesa-mesero" class="text-sm font-medium text-text-primary">
              Mesero por defecto <span class="text-xs font-normal text-text-tertiary ml-1">(opcional)</span>
            </label>
            <select
              id="mesa-mesero"
              :value="form.assignedMemberId || ''"
              :class="inputClass"
              @change="(e) => (form.assignedMemberId = (e.target as HTMLSelectElement).value || null)"
            >
              <option value="">(Sin asignar)</option>
              <option v-for="m in members" :key="m.id" :value="m.id">
                {{ m.name }} ({{ m.role }})
              </option>
            </select>
            <p class="text-[11px] text-text-tertiary leading-snug">
              Se podrá cambiar al abrir la sesión o por orden desde POS.
            </p>
          </div>

          <!-- Table QR (warocol.com#711) -->
          <MesasTableQrControls
            v-if="isEdit && tableQrModuleEnabled && table"
            :table="table"
            variant="panel"
            show-regenerate
            @updated="(data) => emit('qr-updated', data)"
          />

          <!-- Error general -->
          <p v-if="errors.general" class="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            {{ errors.general }}
          </p>
        </div>

        <!-- Footer -->
        <div class="flex-shrink-0 bg-surface-secondary/40 border-t border-border px-6 py-4 flex gap-3">
          <button
            type="button"
            class="h-11 px-5 rounded-lg border border-border bg-surface text-sm font-medium text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
            @click="close"
          >
            Cancelar
          </button>
          <button
            type="button"
            :disabled="saving"
            class="flex-1 h-11 rounded-lg bg-action-primary-bg text-sm font-semibold text-action-primary-text transition-all hover:bg-action-primary-hover-bg focus:outline-none focus:ring-2 focus:ring-action-primary-focus-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] shadow-sm shadow-action-primary-bg/30"
            @click="submit"
          >
            <span v-if="saving">Guardando...</span>
            <span v-else>{{ isEdit ? 'Guardar cambios' : `Crear ${tableSingularLower}` }}</span>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const { singular: tableSingular } = useTableLabel()
const tableSingularLower = computed(() => tableSingular.value.toLowerCase())

interface Member {
  id: string
  name: string
  role: string
}

interface Props {
  modelValue: boolean
  table?: any // null/undefined = create mode, object = edit mode
  members?: Member[]
  waiterAttributionEnabled?: boolean
  tableQrModuleEnabled?: boolean
}

interface Emits {
  (e: 'update:modelValue', v: boolean): void
  (e: 'saved', table: any): void
  (e: 'qr-updated', table: Record<string, unknown>): void
}

const props = withDefaults(defineProps<Props>(), {
  table: null,
  members: () => [],
  waiterAttributionEnabled: false,
  tableQrModuleEnabled: false,
})
const emit = defineEmits<Emits>()

const isEdit = computed(() => !!props.table)
const showMeseroField = computed(
  () => props.waiterAttributionEnabled && props.members.length > 0,
)

const inputClass = 'h-10 w-full rounded-lg border-2 border-border bg-background px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors'

const form = ref({
  name: '',
  code: '',
  capacity: null as number | null,
  assignedMemberId: null as string | null,
})
const initialAssignedMemberId = ref<string | null>(null)
const errors = ref<Record<string, string>>({})
const saving = ref(false)

// Populate form when table changes
watch(() => props.table, (t) => {
  if (t) {
    form.value = {
      name: t.name ?? '',
      code: t.code ?? '',
      capacity: t.capacity ?? null,
      assignedMemberId: t.assigned_member_id ?? null,
    }
    initialAssignedMemberId.value = t.assigned_member_id ?? null
  } else {
    form.value = { name: '', code: '', capacity: null, assignedMemberId: null }
    initialAssignedMemberId.value = null
  }
  errors.value = {}
}, { immediate: true })

// Reset when panel opens
watch(() => props.modelValue, (open) => {
  if (!open) return
  if (!props.table) {
    form.value = { name: '', code: '', capacity: null, assignedMemberId: null }
    initialAssignedMemberId.value = null
    errors.value = {}
  }
})

const clearError = (field: string) => {
  delete errors.value[field]
}

function validate() {
  const e: Record<string, string> = {}
  if (!form.value.name.trim()) e.name = 'El nombre es obligatorio'
  const code = form.value.code.trim()
  if (code && !/^[A-Za-z0-9]{1,4}$/.test(code)) {
    e.code = 'El código debe ser 1–4 caracteres alfanuméricos'
  }
  if (form.value.capacity !== null && form.value.capacity !== undefined && (form.value.capacity as number) < 1) {
    e.capacity = 'La capacidad debe ser mayor a 0'
  }
  errors.value = e
  return Object.keys(e).length === 0
}

async function submit() {
  if (!validate()) return
  saving.value = true
  errors.value = {}

  try {
    const body: Record<string, any> = { name: form.value.name.trim() }
    if (form.value.capacity) body.capacity = form.value.capacity

    if (!props.table?.is_bar) {
      const trimmedCode = form.value.code.trim()
      const storedCode = (props.table?.code ?? '').trim().toUpperCase()
      const nextCode = trimmedCode.toUpperCase()
      if (isEdit.value) {
        if (nextCode !== storedCode) {
          body.code = trimmedCode ? nextCode : ''
        }
      } else if (trimmedCode) {
        body.code = nextCode
      }
    }

    let result: any
    if (isEdit.value) {
      result = await $fetch(`/api/tables/${props.table.id}`, { method: 'PUT', body })
    } else {
      result = await $fetch('/api/tables', { method: 'POST', body })
    }

    // Persist mesero assignment via the dedicated operaciones endpoint. We
    // skip the PATCH when the value didn't change to avoid no-op writes
    // (which would still create an empty history entry).
    if (showMeseroField.value && result?.data?.id && form.value.assignedMemberId !== initialAssignedMemberId.value) {
      await $fetch(`/api/operaciones/tables/${result.data.id}/assigned-member`, {
        method: 'PATCH',
        body: { member_id: form.value.assignedMemberId },
      })
    }

    emit('saved', result.data)
    close()
  } catch (err: any) {
    const detail = err?.data?.detail ?? err?.message ?? 'Error al guardar'
    errors.value.general = detail
  } finally {
    saving.value = false
  }
}

function close() {
  emit('update:modelValue', false)
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
