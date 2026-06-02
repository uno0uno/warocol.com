<script setup lang="ts">
import { WAREHOUSE_COPY } from '~/constants/warehouseCopy'
</script>

<template>
  <p class="text-xs text-text-secondary leading-relaxed">
    <strong class="font-medium text-text-primary">{{ WAREHOUSE_COPY.warehouseItem }}</strong> — materia prima en bodega (harina, queso).
    <strong class="font-medium text-text-primary">{{ WAREHOUSE_COPY.menuProduct }}</strong> — lo que vendes en caja; si es reventa (gaseosa, snack), el stock se crea solo al elegir esa opción.
  </p>
</template>
