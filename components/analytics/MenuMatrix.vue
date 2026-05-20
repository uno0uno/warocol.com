<script setup lang="ts">
import MenuProfitabilityTable from './MenuProfitabilityTable.vue'

const props = defineProps<{
  menuData?: {
    menu_items: any[];
    summary: {
      total_items: number;
      stars: number;
      plowhorses: number;
      puzzles: number;
      dogs: number;
      avg_profit_margin_pct: number;
    };
    period: {
      from: string;
      to: string;
      days: number;
    };
  };
}>()
</script>

<template>
  <div>
    <p
      v-if="props.menuData?.summary"
      class="text-xs text-text-tertiary mb-2"
    >
      Margen de clasificación (BCG): basado en mi costo cuando está configurado; si no, costo real.
    </p>
    <MenuProfitabilityTable :items="props.menuData?.menu_items || []" />
  </div>
</template>
