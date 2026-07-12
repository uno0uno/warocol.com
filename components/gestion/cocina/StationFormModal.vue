<template>
  <div>
    <!-- Desktop -->
    <UiModal v-model="openModel" :title="isEditing ? t('operaciones.comandas.editStation') : t('operaciones.comandas.newStationTitle')">
      <form @submit.prevent="handleSubmit" id="station-form-desktop" class="p-6 space-y-5">
        <!-- Name -->
        <div class="space-y-1.5">
          <label class="text-xs font-bold text-text-secondary uppercase tracking-wider">{{ t('operaciones.comandas.stationName') }}</label>
          <input
            v-model="form.name"
            type="text"
            required
            :placeholder="t('operaciones.comandas.stationNamePlaceholder')"
            class="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm text-text-primary"
          />
        </div>
        <!-- Kitchen Name -->
        <div class="space-y-1.5">
          <label class="text-xs font-bold text-text-secondary uppercase tracking-wider">{{ t('operaciones.comandas.monitorName') }}</label>
          <input
            v-model="form.kitchen_name"
            type="text"
            :placeholder="t('operaciones.comandas.monitorPlaceholder')"
            class="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm text-text-primary"
          />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <!-- Color -->
          <div class="space-y-1.5">
            <label class="text-xs font-bold text-text-secondary uppercase tracking-wider">{{ t('operaciones.comandas.color') }}</label>
            <div class="flex items-center gap-2">
              <input v-model="form.color" type="color" class="w-10 h-10 rounded-lg cursor-pointer border-0 p-0 overflow-hidden" />
              <input v-model="form.color" type="text" class="flex-1 px-3 py-2 bg-background border border-border rounded-xl text-xs font-mono uppercase text-text-primary" />
            </div>
          </div>
          <!-- Order -->
          <div class="space-y-1.5">
            <label class="text-xs font-bold text-text-secondary uppercase tracking-wider">{{ t('operaciones.comandas.order') }}</label>
            <input
              v-model.number="form.display_order"
              type="number"
              min="0"
              class="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm text-text-primary"
            />
          </div>
        </div>
        <!-- Thresholds -->
        <div class="p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-4">
          <p class="text-[11px] font-bold text-primary uppercase tracking-widest flex items-center gap-2">
            <ClockIcon class="w-3.5 h-3.5" />
            {{ t('operaciones.comandas.alertThresholds') }}
          </p>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-amber-400" />
                <label class="text-[10px] font-bold text-text-secondary uppercase">{{ t('operaciones.comandas.yellowAlert') }}</label>
              </div>
              <input v-model.number="form.alert_threshold_1_min" type="number" min="1" class="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-state-warning-border/20 focus:border-state-warning-border transition-all text-sm text-text-primary" />
            </div>
            <div class="space-y-1.5">
              <div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-state-danger-icon" />
                <label class="text-[10px] font-bold text-text-secondary uppercase">{{ t('operaciones.comandas.redAlert') }}</label>
              </div>
              <input v-model.number="form.alert_threshold_2_min" type="number" min="1" class="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-state-danger-border transition-all text-sm text-text-primary" />
            </div>
          </div>
        </div>
      </form>
      <template #footer>
        <div class="flex gap-3 p-4">
          <button type="button" @click="$emit('close')" class="flex-1 px-4 py-2.5 text-sm font-medium text-text-secondary bg-surface-secondary rounded-xl hover:bg-border transition-colors">
            {{ t('operaciones.comandas.cancel') }}
          </button>
          <button type="submit" form="station-form-desktop" :disabled="loading" class="flex-[2] px-4 py-2.5 text-sm font-bold text-action-primary-text bg-action-primary-bg rounded-xl hover:bg-action-primary-hover-bg transition-all disabled:opacity-50 min-h-[44px]">
            {{ loading ? t('operaciones.comandas.saveBusy') : (isEditing ? t('operaciones.comandas.saveChanges') : t('operaciones.comandas.createStationButton')) }}
          </button>
        </div>
      </template>
    </UiModal>

    <!-- Mobile -->
    <UiBottomSheetModal v-model="openModel" :title="isEditing ? t('operaciones.comandas.editStation') : t('operaciones.comandas.newStationTitle')">
      <form @submit.prevent="handleSubmit" id="station-form-mobile" class="p-5 space-y-5 overflow-y-auto max-h-[70vh]">
        <!-- Name -->
        <div class="space-y-1.5">
          <label class="text-xs font-bold text-text-secondary uppercase tracking-wider">{{ t('operaciones.comandas.stationName') }}</label>
          <input
            v-model="form.name"
            type="text"
            required
            :placeholder="t('operaciones.comandas.stationNamePlaceholder')"
            class="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm text-text-primary"
          />
        </div>
        <!-- Kitchen Name -->
        <div class="space-y-1.5">
          <label class="text-xs font-bold text-text-secondary uppercase tracking-wider">{{ t('operaciones.comandas.monitorName') }}</label>
          <input
            v-model="form.kitchen_name"
            type="text"
            :placeholder="t('operaciones.comandas.monitorPlaceholder')"
            class="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm text-text-primary"
          />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <!-- Color -->
          <div class="space-y-1.5">
            <label class="text-xs font-bold text-text-secondary uppercase tracking-wider">{{ t('operaciones.comandas.color') }}</label>
            <div class="flex items-center gap-2">
              <input v-model="form.color" type="color" class="w-10 h-10 rounded-lg cursor-pointer border-0 p-0 overflow-hidden" />
              <input v-model="form.color" type="text" class="flex-1 px-3 py-2 bg-background border border-border rounded-xl text-xs font-mono uppercase text-text-primary" />
            </div>
          </div>
          <!-- Order -->
          <div class="space-y-1.5">
            <label class="text-xs font-bold text-text-secondary uppercase tracking-wider">{{ t('operaciones.comandas.order') }}</label>
            <input
              v-model.number="form.display_order"
              type="number"
              min="0"
              class="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm text-text-primary"
            />
          </div>
        </div>
        <!-- Thresholds -->
        <div class="p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-4">
          <p class="text-[11px] font-bold text-primary uppercase tracking-widest flex items-center gap-2">
            <ClockIcon class="w-3.5 h-3.5" />
            {{ t('operaciones.comandas.alertThresholds') }}
          </p>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-amber-400" />
                <label class="text-[10px] font-bold text-text-secondary uppercase">{{ t('operaciones.comandas.yellowAlert') }}</label>
              </div>
              <input v-model.number="form.alert_threshold_1_min" type="number" min="1" class="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-state-warning-border/20 focus:border-state-warning-border transition-all text-sm text-text-primary" />
            </div>
            <div class="space-y-1.5">
              <div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-state-danger-icon" />
                <label class="text-[10px] font-bold text-text-secondary uppercase">{{ t('operaciones.comandas.redAlert') }}</label>
              </div>
              <input v-model.number="form.alert_threshold_2_min" type="number" min="1" class="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-state-danger-border transition-all text-sm text-text-primary" />
            </div>
          </div>
        </div>
      </form>
      <template #footer>
        <div class="flex gap-3 p-4">
          <button type="button" @click="$emit('close')" class="flex-1 px-4 py-2.5 text-sm font-medium text-text-secondary bg-surface-secondary rounded-xl hover:bg-border transition-colors">
            {{ t('operaciones.comandas.cancel') }}
          </button>
          <button type="submit" form="station-form-mobile" :disabled="loading" class="flex-[2] px-4 py-2.5 text-sm font-bold text-action-primary-text bg-action-primary-bg rounded-xl hover:bg-action-primary-hover-bg transition-all disabled:opacity-50 min-h-[44px]">
            {{ loading ? t('operaciones.comandas.saveBusy') : (isEditing ? t('operaciones.comandas.saveChanges') : t('operaciones.comandas.createStationButton')) }}
          </button>
        </div>
      </template>
    </UiBottomSheetModal>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue'
import { ClockIcon } from '@heroicons/vue/24/outline'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps<{
  modelValue: boolean
  initialData?: any
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'submit', data: any): void
  (e: 'close'): void
}>()

const openModel = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val),
})

const isEditing = computed(() => !!props.initialData)

const form = reactive({
  name: props.initialData?.name || '',
  kitchen_name: props.initialData?.kitchen_name || '',
  color: props.initialData?.color || '#6366f1',
  alert_threshold_1_min: props.initialData?.alert_threshold_1_min || 8,
  alert_threshold_2_min: props.initialData?.alert_threshold_2_min || 15,
  display_order: props.initialData?.display_order || 0,
})

const handleSubmit = () => {
  emit('submit', { ...form })
}
</script>
