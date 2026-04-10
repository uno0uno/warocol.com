<script setup lang="ts">
definePageMeta({
  layout: false,
  middleware: () => navigateTo('/ventas/ordenes', { replace: true })
})
</script>
