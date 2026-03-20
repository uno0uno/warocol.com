<template>
  <UiModal v-model="open" title="Editar regla">
    <div v-if="rule" class="px-6 py-5 space-y-5">

      <!-- Rule header + active toggle -->
      <div class="flex items-center justify-between gap-4">
        <div class="min-w-0">
          <p class="text-base font-semibold text-text-primary">{{ meta.label }}</p>
          <p class="text-sm text-text-secondary leading-relaxed">{{ meta.description }}</p>
        </div>
        <button
          role="switch"
          :aria-checked="localActive"
          :aria-label="`${localActive ? 'Desactivar' : 'Activar'} regla ${meta.label}`"
          @click="localActive = !localActive"
          :class="[
            'flex-shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
            localActive ? 'bg-primary' : 'bg-slate-300'
          ]"
        >
          <span
            :class="[
              'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
              localActive ? 'translate-x-6' : 'translate-x-1'
            ]"
          />
        </button>
      </div>

      <hr class="border-border" />

      <!-- ticket_value -->
      <template v-if="rule.rule_type === 'ticket_value'">
        <div class="flex flex-col gap-1">
          <label for="field-points_per_peso" class="text-sm font-medium text-text-primary">
            Puntos por cada $1 gastado
          </label>
          <input
            id="field-points_per_peso"
            v-model.number="localConfig.points_per_peso"
            type="number"
            min="0"
            step="0.1"
            placeholder="Ej: 1"
            class="h-10 w-full rounded-lg border-2 border-slate-200 bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          />
          <p class="text-xs text-text-secondary">Un cliente que compre $10,000 recibirá {{ (localConfig.points_per_peso ?? 1) * 10000 }} puntos</p>
        </div>
      </template>

      <!-- purchase_count -->
      <template v-else-if="rule.rule_type === 'purchase_count'">
        <div class="flex flex-col gap-1">
          <label for="field-points_per_order" class="text-sm font-medium text-text-primary">
            Puntos por pedido completado
          </label>
          <input
            id="field-points_per_order"
            v-model.number="localConfig.points_per_order"
            type="number"
            min="0"
            step="1"
            placeholder="Ej: 10"
            class="h-10 w-full rounded-lg border-2 border-slate-200 bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          />
        </div>
      </template>

      <!-- frequency -->
      <template v-else-if="rule.rule_type === 'frequency'">
        <div class="flex flex-col gap-1">
          <label for="field-freq-points" class="text-sm font-medium text-text-primary">
            Puntos por visita frecuente
          </label>
          <input
            id="field-freq-points"
            v-model.number="localConfig.points"
            type="number"
            min="0"
            step="1"
            placeholder="Ej: 50"
            class="h-10 w-full rounded-lg border-2 border-slate-200 bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label for="field-within_days" class="text-sm font-medium text-text-primary">
            Ventana de días
          </label>
          <input
            id="field-within_days"
            v-model.number="localConfig.within_days"
            type="number"
            min="1"
            step="1"
            placeholder="Ej: 7"
            class="h-10 w-full rounded-lg border-2 border-slate-200 bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          />
          <p class="text-xs text-text-secondary">El cliente debe haber comprado en los últimos {{ localConfig.within_days ?? 7 }} días para recibir los puntos</p>
        </div>
      </template>

      <!-- per_ticket_qty -->
      <template v-else-if="rule.rule_type === 'per_ticket_qty'">
        <div class="flex flex-col gap-1">
          <label for="field-points_per_item" class="text-sm font-medium text-text-primary">
            Puntos por ítem en el pedido
          </label>
          <input
            id="field-points_per_item"
            v-model.number="localConfig.points_per_item"
            type="number"
            min="0"
            step="1"
            placeholder="Ej: 2"
            class="h-10 w-full rounded-lg border-2 border-slate-200 bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          />
          <p class="text-xs text-text-secondary">Un pedido con 5 ítems dará {{ (localConfig.points_per_item ?? 2) * 5 }} puntos</p>
        </div>
      </template>

    </div>

    <template #footer>
      <div class="flex gap-3 px-6 py-4">
        <button
          @click="close"
          class="flex-1 h-11 rounded-lg border-2 border-slate-200 bg-white text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          Cancelar
        </button>
        <button
          @click="save"
          :disabled="isSaving"
          class="flex-1 h-11 rounded-lg bg-primary text-sm font-medium text-white transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
        >
          <span v-if="isSaving">Guardando...</span>
          <span v-else>Guardar cambios</span>
        </button>
      </div>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import type { WaroRule } from '~/composables/useWarosConfig'

interface Props {
  modelValue: boolean
  rule: WaroRule | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { updateRule, getRuleMeta, isSaving } = useWarosConfig()

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const meta = computed(() =>
  props.rule ? getRuleMeta(props.rule.rule_type) : { label: '', description: '' }
)

// Local copies so edits don't mutate prop directly
const localActive = ref(false)
const localConfig = ref<Record<string, number>>({})

watch(
  () => props.rule,
  (rule) => {
    if (rule) {
      localActive.value = rule.is_active
      localConfig.value = { ...rule.config }
    }
  },
  { immediate: true }
)

const close = () => {
  open.value = false
}

const save = async () => {
  if (!props.rule) return
  try {
    await updateRule(props.rule.rule_type, {
      is_active: localActive.value,
      config: localConfig.value,
    })
    emit('saved')
    close()
  } catch (e: any) {
    // Error handling: modal stays open, user can retry
    console.error('[EditarReglaModal] save failed:', e)
  }
}
</script>
