<script setup lang="ts">
import { VisXYContainer, VisLine, VisArea, VisAxis, VisTooltip, VisCrosshair, VisScatter } from '@unovis/vue';
import { Line, Scatter } from '@unovis/ts';
import { computed } from 'vue';

interface SalesDataPoint {
  name: string;
  sales: number;
  salesYesterday: number;
}

interface Props {
  salesData?: SalesDataPoint[];
  loading?: boolean;
  currentLabel?: string;
  comparisonLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  salesData: () => [],
  loading: false,
  currentLabel: 'Hoy',
  comparisonLabel: 'Ayer'
});

// Use provided data or fallback to empty array
const data = computed(() => {
  if (props.salesData && props.salesData.length > 0) {
    return props.salesData;
  }
  // Default/placeholder data
  return [
    { name: '12pm', sales: 0, salesYesterday: 0 },
    { name: '2pm', sales: 0, salesYesterday: 0 },
    { name: '4pm', sales: 0, salesYesterday: 0 },
    { name: '6pm', sales: 0, salesYesterday: 0 },
    { name: '8pm', sales: 0, salesYesterday: 0 },
    { name: '10pm', sales: 0, salesYesterday: 0 },
  ];
});

const x = (_: any, i: number) => i;
const ySales = (d: any) => d.sales;
const yYesterday = (d: any) => d.salesYesterday;

const tickFormat = (i: number) => data.value[i]?.name || '';

// Format numbers compactly: K for thousands, M for millions
const yTickFormat = (d: number) => {
  if (d === 0) return '$0';

  const absValue = Math.abs(d);

  if (absValue >= 1000000) {
    const formatted = (d / 1000000).toFixed(1);
    return `$${formatted}M`;
  } else if (absValue >= 1000) {
    const formatted = (d / 1000).toFixed(1);
    return `$${formatted}K`;
  }

  return `$${d}`;
};

const tooltipTemplate = (d: any) => {
  // Access the data point using the index
  const index = typeof d === 'number' ? d : (d.x || 0);
  const dataPoint = data.value[index];

  if (!dataPoint) return '';

  return `
    <div style="background: white; padding: 12px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-family: system-ui;">
      <div style="font-weight: 600; margin-bottom: 8px; font-size: 13px; color: #1e293b;">${dataPoint.name}</div>
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
        <span style="width: 8px; height: 8px; border-radius: 50%; background: #4f46e5; display: inline-block;"></span>
        <span style="color: #64748b; font-size: 12px;">${props.currentLabel}:</span>
        <span style="font-weight: 600; color: #4f46e5; font-size: 13px;">$${dataPoint.sales.toLocaleString()}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="width: 8px; height: 8px; border-radius: 50%; background: #f59e0b; display: inline-block;"></span>
        <span style="color: #64748b; font-size: 12px;">${props.comparisonLabel}:</span>
        <span style="font-weight: 600; color: #f59e0b; font-size: 13px;">$${dataPoint.salesYesterday.toLocaleString()}</span>
      </div>
    </div>
  `;
};

// Triggers configuration for tooltip
const tooltipTriggers = {
  [Line.selectors.line]: tooltipTemplate,
  [Scatter.selectors.point]: tooltipTemplate
};
</script>

<template>
  <div class="w-full">
    <!-- Legend -->
    <div class="flex justify-end gap-6 text-xs font-medium mb-2 px-2">
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded-full bg-indigo-600"></span>
        <span class="text-slate-700 whitespace-nowrap">{{ currentLabel }}</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded-full bg-amber-500"></span>
        <span class="text-slate-700 whitespace-nowrap">{{ comparisonLabel }}</span>
      </div>
    </div>

    <div class="h-[250px]">
      <VisXYContainer :data="data" :height="250" :margin="{ top: 5, right: 5, bottom: 25, left: 45 }">
      <!-- Yesterday Area & Line (Amber/Orange - Complementary to Indigo) -->
      <VisArea :x="x" :y="yYesterday" color="#f59e0b" :opacity="0.1" />
      <VisLine :x="x" :y="yYesterday" color="#f59e0b" :lineWidth="2" :attributes="{ 'stroke-dasharray': '4 4' }" />

      <!-- Today Area & Line (Indigo) -->
      <VisArea :x="x" :y="ySales" color="#4f46e5" :opacity="0.2" />
      <VisLine :x="x" :y="ySales" color="#4f46e5" :lineWidth="4" />

      <!-- Points for interaction -->
      <VisScatter :x="x" :y="ySales" color="#4f46e5" :size="6" :strokeWidth="2" strokeColor="#fff" />

      <VisAxis type="x" :x="x" :tickFormat="tickFormat" />
      <VisAxis type="y" :tickFormat="yTickFormat" />
      <VisTooltip :triggers="tooltipTriggers" />
      <VisCrosshair :template="tooltipTemplate" />
      </VisXYContainer>
    </div>
  </div>
</template>
