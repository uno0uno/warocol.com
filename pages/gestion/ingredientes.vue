<template>
  <div class="page-layout flex flex-col h-full">
    <UiModuleNavigation :navigation-items="navigationItems" />
    <div class="flex-1 min-h-0">
      <NuxtPage :key="route.fullPath" />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  module: 'abastecimiento',
})

const route = useRoute()

import { WAREHOUSE_COPY } from '~/constants/warehouseCopy'

const navigationItems = [
  { to: '/gestion/ingredientes', label: WAREHOUSE_COPY.waroTemplatesNavLabel, exact: true },
]

useHead({ title: WAREHOUSE_COPY.waroTemplatesPageTitle })
</script>
