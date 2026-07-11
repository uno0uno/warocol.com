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

definePageMeta({ layout: 'dashboard', module: 'despacho' })

const route = useRoute()
const { businessProfile } = useTenantReactive()
const { t } = useI18n({ useScope: 'global' })

const navigationItems = computed(() => {
  const items: { to: string; label: string }[] = [
    { to: '/despacho/domicilios', label: t('despacho.tabs.domicilios') },
  ]
  if (businessProfile.value?.tables_enabled && businessProfile.value?.table_qr_module_enabled) {
    items.push({ to: '/despacho/en-mesa', label: t('despacho.tabs.enMesa') })
  }
  if (businessProfile.value?.comandas_enabled) {
    items.push({ to: '/despacho/comandas', label: t('despacho.tabs.comandas') })
  }
  return items
})

useHead({ title: () => t('despacho.head.index') })
</script>
