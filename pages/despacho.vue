<template>
  <div class="page-layout flex flex-col h-full">
    <UiModuleNavigation :navigation-items="navigationItems" />
    <div class="flex-1 min-h-0">
      <NuxtPage :key="route.fullPath" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTenantReactive } from '@/composables/useTenantReactive'

definePageMeta({ layout: 'dashboard' })

const route = useRoute()
const { businessProfile } = useTenantReactive()

const navigationItems = computed(() => {
  const items: { to: string; label: string }[] = [
    { to: '/despacho/domicilios', label: 'Domicilios' },
  ]
  if (businessProfile.value?.comandas_enabled) {
    items.push({ to: '/despacho/comandas', label: 'Comandas' })
  }
  return items
})

useHead({ title: 'Despacho — WARO' })
</script>
