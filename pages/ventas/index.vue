<script setup lang="ts">
definePageMeta({
  layout: false,
  middleware: (to) => {
    if (to.path === '/ventas') return navigateTo('/ventas/ordenes', { replace: true })
  }
})
</script>
