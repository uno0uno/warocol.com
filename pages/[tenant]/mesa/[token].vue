<script setup lang="ts">
/**
 * Canonical menu lives at .../mesa/{token}/ (index.vue).
 * Redirect here so both QR URL shapes share one client-only page.
 */
definePageMeta({
  layout: 'public-restaurant',
  ssr: false,
})

const route = useRoute()
const tenant = computed(() => String(route.params.tenant ?? ''))
const token = computed(() => String(route.params.token ?? ''))

await navigateTo(`/${tenant.value}/mesa/${token.value}/`, { replace: true })
</script>

<template>
  <div class="min-h-[60vh] flex items-center justify-center">
    <CommonsTheCustomLoader size="large" />
  </div>
</template>
