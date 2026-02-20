<script setup lang="ts">
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

const data = computed(() => {
  if (props.salesData && props.salesData.length > 0) return props.salesData;
  return [
    { name: '12pm', sales: 0, salesYesterday: 0 },
    { name: '2pm', sales: 0, salesYesterday: 0 },
    { name: '4pm', sales: 0, salesYesterday: 0 },
    { name: '6pm', sales: 0, salesYesterday: 0 },
    { name: '8pm', sales: 0, salesYesterday: 0 },
    { name: '10pm', sales: 0, salesYesterday: 0 },
  ];
});

const formatValue = (value: number): string => {
  if (value === 0) return '$0';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${Math.round(value)}`;
};

const series = computed(() => [
  {
    name: props.comparisonLabel,
    data: data.value.map(d => d.salesYesterday),
  },
  {
    name: props.currentLabel,
    data: data.value.map(d => d.sales),
  },
]);

const chartOptions = computed(() => ({
  chart: {
    type: 'area',
    height: 250,
    toolbar: { show: false },
    zoom: { enabled: false },
    animations: { enabled: true },
    fontFamily: 'inherit',
  },
  stroke: {
    curve: 'smooth',
    width: [2, 4],
    dashArray: [6, 0],
  },
  fill: {
    type: 'gradient',
    gradient: {
      type: 'vertical',
      shadeIntensity: 1,
      opacityFrom: [0.1, 0.2],
      opacityTo: [0.01, 0.02],
      stops: [0, 100],
    },
  },
  colors: ['#f59e0b', '#4f46e5'],
  xaxis: {
    categories: data.value.map(d => d.name),
    axisBorder: { color: '#e2e8f0' },
    axisTicks: { show: false },
    labels: {
      style: { colors: '#64748b', fontSize: '11px' },
    },
    tooltip: { enabled: false },
  },
  yaxis: {
    labels: {
      style: { colors: '#64748b', fontSize: '11px' },
      formatter: formatValue,
    },
  },
  grid: {
    borderColor: '#f1f5f9',
    strokeDashArray: 4,
    xaxis: { lines: { show: false } },
    yaxis: { lines: { show: true } },
    padding: { left: 0, right: 0, top: 0, bottom: 0 },
  },
  dataLabels: { enabled: false },
  markers: {
    size: [0, 6],
    strokeColors: '#fff',
    strokeWidth: 2,
    hover: { size: 7 },
  },
  tooltip: {
    shared: true,
    intersect: false,
    style: { fontSize: '12px' },
    y: {
      formatter: (value: number, { seriesIndex }: { seriesIndex: number }) => {
        const label = seriesIndex === 0 ? props.comparisonLabel : props.currentLabel;
        return `${label}: $${value.toLocaleString('es-CO')}`;
      },
    },
  },
  legend: { show: false },
}));
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
      <div v-if="loading" class="flex items-center justify-center h-full">
        <div class="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
      <apexchart
        v-else
        type="area"
        height="250"
        :options="chartOptions"
        :series="series"
        class="w-full"
      />
    </div>
  </div>
</template>
