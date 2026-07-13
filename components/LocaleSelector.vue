<template>
  <div class="relative">
    <select
      :id="id"
      :value="modelValue"
      :aria-label="t('shell.language')"
      class="w-full min-h-11 appearance-none rounded-lg border-2 border-form-control-border bg-form-control-bg px-3 py-2 pe-10 text-sm font-medium text-form-control-text transition-colors hover:border-form-control-focus-border focus:border-form-control-focus-border focus:outline-none focus:ring-2 focus:ring-form-control-focus-ring disabled:cursor-not-allowed disabled:opacity-50"
      :disabled="disabled"
      @change="onChange"
    >
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
      class="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-form-control-placeholder"
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

defineProps<{
  id?: string
  modelValue: AppLocaleCode
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [locale: AppLocaleCode]
}>()

const { t } = useI18n({ useScope: 'global' })
const enabledDefinitions = APP_LOCALE_DEFINITIONS.filter(definition => definition.enabled)

function onChange(event: Event) {
  const next = normalizeEnabledAppLocale((event.target as HTMLSelectElement).value)
  if (!next) return
  emit('update:modelValue', next)
}
</script>
