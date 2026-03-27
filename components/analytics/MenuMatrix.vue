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
  <MenuProfitabilityTable :items="props.menuData?.menu_items || []" />
</template>
