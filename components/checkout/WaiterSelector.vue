<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })
interface Member {
  id: string
  name: string
  role: string
}

const props = withDefaults(defineProps<{
  members: Member[]
  modelValue: string | null
}>(), {
  members: () => [],
  modelValue: null,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void
}>()

const onChange = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value
  emit('update:modelValue', value || null)
}
</script>

<template>
  <div class="flex flex-col gap-3 p-4 rounded-xl bg-surface border-2 border-border">
    <div class="flex flex-col gap-0.5">
      <p class="text-sm font-semibold text-text-primary">{{ t('pos.waiter.tipWaiterAria') }}</p>
      <p class="text-xs leading-snug text-text-secondary">
        {{ t('pos.waiter.tipWaiterHelp') }}
      </p>
    </div>

    <p
      v-if="members.length === 0"
      class="text-xs text-text-secondary bg-surface-secondary rounded-lg px-3 py-2.5"
    >
      {{ t('pos.waiter.noMembers') }}
    </p>

    <div v-else class="flex items-center gap-2">
      <svg class="h-[1em] w-[1em] text-text-tertiary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
      <select
        :value="modelValue || ''"
        class="flex-1 min-h-[44px] px-3 py-2 text-sm font-medium bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none text-text-primary cursor-pointer"
        :aria-label="t('pos.waiter.selectWaiterAria')"
        @change="onChange"
      >
        <option value="">{{ t('pos.waiter.unassigned') }}</option>
        <option v-for="m in members" :key="m.id" :value="m.id">
          {{ m.name }} ({{ m.role }})
        </option>
      </select>
    </div>
  </div>
</template>
