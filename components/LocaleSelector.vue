<template>
  <div class="relative">
    <select
      :id="id"
      :value="inherited && inheritLabel ? '' : modelValue"
      :aria-label="t('shell.language')"
      class="w-full min-h-11 appearance-none rounded-lg border-2 border-form-control-border bg-form-control-bg px-3 py-2 pe-10 text-sm font-medium text-form-control-text transition-colors hover:border-form-control-focus-border focus:border-form-control-focus-border focus:outline-none focus:ring-2 focus:ring-form-control-focus-ring disabled:cursor-not-allowed disabled:opacity-50"
      :disabled="disabled"
      @change="onChange"
    >
      <option v-if="inheritLabel" value="">
        {{ inheritLabel }}
      </option>
      <option
        v-for="definition in enabledDefinitions"
        :key="definition.code"
        :value="definition.code"
        :dir="definition.direction"
      >
        {{ definition.name }}
      </option>
    </select>
    <ChevronDownIcon
      class="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-form-control-placeholder"
      aria-hidden="true"
    />
  </div>
</template>

<script setup lang="ts">
import { ChevronDownIcon } from '@heroicons/vue/24/outline'
import {
  APP_LOCALE_DEFINITIONS,
  normalizeEnabledAppLocale,
  type AppLocaleCode,
} from '~/utils/appLocales'

const props = defineProps<{
  id?: string
  modelValue: AppLocaleCode
  disabled?: boolean
  inherited?: boolean
  inheritLabel?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [locale: AppLocaleCode]
  'inherit': []
}>()

const { t } = useI18n({ useScope: 'global' })
const enabledDefinitions = APP_LOCALE_DEFINITIONS.filter(definition => definition.enabled)

function onChange(event: Event) {
  const rawValue = (event.target as HTMLSelectElement).value
  if (!rawValue && props.inheritLabel) {
    emit('inherit')
    return
  }

  const next = normalizeEnabledAppLocale(rawValue)
  if (!next) return
  emit('update:modelValue', next)
}
</script>
