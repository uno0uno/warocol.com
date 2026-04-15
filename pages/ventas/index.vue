<script setup lang="ts">
definePageMeta({
  layout: false,
  middleware: (to) => {
    if (to.path !== '/ventas/ordenes') return navigateTo('/ventas/ordenes', { replace: true })
  }
})
</script>
