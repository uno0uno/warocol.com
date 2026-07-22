<script setup lang="ts">
const props = withDefaults(defineProps<{
  message: string
  compact?: boolean
  to?: string
}>(), {
  compact: false,
  to: '/gestion/billing',
})

const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <div
    role="alert"
    :class="[
      'rounded-xl border border-amber-300/80 bg-amber-50 text-amber-950 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-100',
      compact ? 'p-3' : 'p-4',
    ]"
  >
    <p :class="compact ? 'text-sm leading-snug' : 'text-sm md:text-base leading-relaxed'">
      {{ message }}
    </p>
    <NuxtLink
      :to="props.to"
      :class="[
        'inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        compact ? 'mt-2 min-h-[36px] px-3 py-1.5 text-xs' : 'mt-3 min-h-[40px] px-4 py-2 text-sm',
      ]"
    >
      {{ t('billing.upgrade.cta') }}
    </NuxtLink>
  </div>
</template>
