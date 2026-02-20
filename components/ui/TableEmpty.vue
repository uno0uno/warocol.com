<template>
  <div class="flex flex-col items-center space-y-4">
    <Icon :name="icon" class="h-16 w-16 text-muted-foreground/50" />
    <div class="text-center">
      <h3 class="text-lg font-medium text-muted-foreground mb-2">{{ title }}</h3>
      <p class="text-muted-foreground mb-4">{{ description }}</p>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import Icon from '~/components/ui/Icon.vue'

defineProps({
  icon: {
    type: String,
    default: 'heroicons:inbox'
  },
  title: {
    type: String,
    default: 'No hay datos'
  },
  description: {
    type: String,
    default: 'No se encontraron resultados para mostrar'
  }
})
</script>