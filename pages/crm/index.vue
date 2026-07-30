<script setup lang="ts">
definePageMeta({
  layout: false,
  middleware: () => navigateTo('/crm/clientes', { replace: true }),
})
</script>
