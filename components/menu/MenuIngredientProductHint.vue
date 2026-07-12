<script setup lang="ts">
const WAREHOUSE_COPY = useWarehouseCopy()
</script>

<template>
  <p class="text-xs text-text-secondary leading-relaxed">
    <strong class="font-medium text-text-primary">{{ WAREHOUSE_COPY.warehouseItem }}</strong> {{ WAREHOUSE_COPY.recipeWarehouseHint }}
    <strong class="font-medium text-text-primary">{{ WAREHOUSE_COPY.menuProduct }}</strong> {{ WAREHOUSE_COPY.recipeMenuProductHint }}
  </p>
</template>
