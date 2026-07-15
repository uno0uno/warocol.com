<template>
  <div class="space-y-6">
    <div class="text-center">
      <CheckCircleIcon class="mx-auto h-12 w-12 text-status-success-text" aria-hidden="true" />
      <h2 class="mt-4 text-2xl font-semibold text-text-primary">{{ t('onboarding.setupTitle') }}</h2>
      <p class="mx-auto mt-2 max-w-xl text-sm leading-6 text-text-secondary">{{ t('onboarding.setupDescription') }}</p>
    </div>

    <div
      v-if="trialEndsAt"
      class="rounded-xl border border-border bg-status-info-bg p-4 text-status-info-text"
      role="status"
    >
      <p class="font-semibold">{{ t('onboarding.trialSummary') }}</p>
      <p class="mt-1 text-sm leading-6">
        {{ t('onboarding.trialEnds', { date: formatDate(trialEndsAt) }) }}
        <span v-if="trialDaysRemaining !== null && trialDaysRemaining !== undefined">
          {{ t('onboarding.trialDaysRemaining', { count: trialDaysRemaining }) }}
        </span>
      </p>
      <p class="mt-1 text-xs leading-5">{{ t('onboarding.trialReminderNotice') }}</p>
    </div>

    <ul class="grid gap-4 sm:grid-cols-3">
      <li v-for="item in items" :key="item.to">
        <NuxtLink
          :to="item.to"
          class="flex h-full min-h-32 flex-col rounded-lg border border-border bg-surface-secondary p-4 transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <component :is="item.icon" class="h-6 w-6 text-primary" aria-hidden="true" />
          <span class="mt-3 font-semibold text-text-primary">{{ t(item.title) }}</span>
          <span class="mt-1 text-sm leading-5 text-text-secondary">{{ t(item.description) }}</span>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { BuildingStorefrontIcon, UserGroupIcon, ViewColumnsIcon } from '@heroicons/vue/24/outline'

const { t } = useI18n()
const { formatDate } = useFormatters()
defineProps<{
  trialEndsAt?: string | null
  trialDaysRemaining?: number | null
}>()
const items = [
  { to: '/negocio', icon: BuildingStorefrontIcon, title: 'onboarding.setupBusiness', description: 'onboarding.setupBusinessDescription' },
  { to: '/menu', icon: ViewColumnsIcon, title: 'onboarding.setupMenu', description: 'onboarding.setupMenuDescription' },
  { to: '/equipo', icon: UserGroupIcon, title: 'onboarding.setupTeam', description: 'onboarding.setupTeamDescription' },
]
</script>
