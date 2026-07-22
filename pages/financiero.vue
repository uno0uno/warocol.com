<script setup lang="ts">
import { getFirstAccessibleHome } from '~/utils/internalAccess'

definePageMeta({
  layout: 'dashboard',
})

const accessStore = useAccessStore()
if (!accessStore.isLoaded) {
  await accessStore.load()
}

const target = accessStore.modules.includes('finanzas')
  ? '/finanzas/gastos'
  : getFirstAccessibleHome(accessStore.modules)

await navigateTo(target, { replace: true })
</script>

<template>
  <div></div>
</template>
