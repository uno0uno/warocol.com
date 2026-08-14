<template>
  <div
    v-if="isVisible"
    :class="bannerClass"
    :role="level === 'starter' ? 'status' : 'alert'"
  >
    <div class="flex items-center gap-3 px-4 sm:px-6 md:px-8 py-2.5">
      <span
        v-if="messagePending"
        class="trial-banner-skeleton trial-banner-skeleton--icon flex-shrink-0"
        aria-hidden="true"
      />
      <svg
        v-else
        class="w-4 h-4 flex-shrink-0"
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path
          v-if="level === 'starter'"
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z"
          clip-rule="evenodd"
        />
        <path
          v-else
          fill-rule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
          clip-rule="evenodd"
        />
      </svg>

      <div
        v-if="messagePending"
        class="flex-1 min-w-0 space-y-1.5 py-0.5"
        aria-busy="true"
        aria-hidden="true"
      >
        <span class="trial-banner-skeleton trial-banner-skeleton--full" />
        <span class="trial-banner-skeleton trial-banner-skeleton--mid" />
      </div>
      <p
        v-else
        class="text-xs sm:text-sm font-medium flex-1 leading-snug"
      >
        {{ message }}
        <span
          v-if="graceDaysRemaining != null && level === 'read_only'"
          class="opacity-80"
        >
          ({{
            t(
              graceDaysRemaining === 1
                ? 'shell.subscriptionGraceDay'
                : 'shell.subscriptionGraceDays',
              { n: graceDaysRemaining },
            )
          }})
        </span>
      </p>

      <span
        v-if="messagePending"
        class="trial-banner-skeleton trial-banner-skeleton--cta flex-shrink-0"
        aria-hidden="true"
      />
      <NuxtLink
        v-else
        to="/gestion/billing"
        :class="ctaClass"
        class="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg min-h-[44px] flex items-center whitespace-nowrap transition-opacity hover:opacity-80"
      >
        {{ ctaLabel }}
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  level: 'starter' | 'full_with_warning' | 'read_only'
  message: string
  messagePending?: boolean
  graceDaysRemaining?: number | null
}>()

const { t } = useI18n({ useScope: 'global' })

const messagePending = computed(() => Boolean(props.messagePending))

const isVisible = computed(
  () =>
    props.level === 'starter'
    || props.level === 'full_with_warning'
    || props.level === 'read_only',
)

const bannerClass = computed(() => {
  if (props.level === 'read_only') return 'bg-orange-100 text-orange-900 border-b border-orange-200'
  if (props.level === 'full_with_warning') return 'bg-yellow-100 text-yellow-900 border-b border-yellow-200'
  return 'bg-primary/10 text-primary border-b border-primary/20'
})

const ctaClass = computed(() => {
  if (props.level === 'read_only') return 'bg-orange-800 text-white'
  if (props.level === 'full_with_warning') return 'bg-yellow-800 text-white'
  return 'bg-primary text-white'
})

const ctaLabel = computed(() => {
  if (props.level === 'starter') return t('shell.subscriptionTrialCta')
  return t('shell.subscriptionRenewCta')
})
</script>

<style scoped>
.trial-banner-skeleton {
  display: block;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    currentColor 25%,
    color-mix(in srgb, currentColor 45%, transparent) 50%,
    currentColor 75%
  );
  background-size: 200% 100%;
  opacity: 0.28;
  animation: trial-banner-shimmer 1.5s infinite;
}
.trial-banner-skeleton--icon {
  width: 1rem;
  height: 1rem;
  border-radius: 9999px;
}
.trial-banner-skeleton--full {
  height: 0.7rem;
  width: 100%;
  max-width: 42rem;
}
.trial-banner-skeleton--mid {
  height: 0.7rem;
  width: 72%;
  max-width: 28rem;
}
.trial-banner-skeleton--cta {
  width: 7.25rem;
  height: 2.75rem;
  border-radius: 0.5rem;
}
@keyframes trial-banner-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
</style>

