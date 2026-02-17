<script setup lang="ts">
import { computed } from 'vue';
import type { EChartsOption } from 'echarts';

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

// Format numbers compactly: K for thousands, M for millions
const formatValue = (value: number): string => {
  if (value === 0) return '$0';

  const absValue = Math.abs(value);

  if (absValue >= 1000000) {
    const formatted = (value / 1000000).toFixed(1);
    return `$${formatted}M`;
  } else if (absValue >= 1000) {
    const formatted = (value / 1000).toFixed(1);
    return `$${formatted}K`;
  }

  return `$${Math.round(value)}`;
};

// ECharts option configuration
const chartOption = computed<EChartsOption>(() => ({
  grid: {
    top: 5,
    right: 5,
    bottom: 25,
    left: 45,
    containLabel: true
  },
  xAxis: {
    type: 'category',
    data: data.value.map(d => d.name),
    boundaryGap: false,
    axisLine: {
      lineStyle: { color: '#e2e8f0' }
    },
    axisLabel: {
      color: '#64748b',
      fontSize: 11
    }
  },
  yAxis: {
    type: 'value',
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: {
      lineStyle: { color: '#f1f5f9', type: 'dashed' }
    },
    axisLabel: {
      color: '#64748b',
      fontSize: 11,
      formatter: (value: number) => formatValue(value)
    }
  },
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'white',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    padding: 12,
    textStyle: {
      color: '#1e293b',
      fontSize: 12
    },
    formatter: (params: any) => {
      if (!params || params.length === 0) return '';

      const dataIndex = params[0].dataIndex;
      const dataPoint = data.value[dataIndex];

      if (!dataPoint) return '';

      return `
        <div style="font-weight: 600; margin-bottom: 8px; font-size: 13px;">${dataPoint.name}</div>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #4f46e5;"></span>
          <span style="color: #64748b;">${props.currentLabel}:</span>
          <span style="font-weight: 600; color: #4f46e5;">$${dataPoint.sales.toLocaleString()}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #f59e0b;"></span>
          <span style="color: #64748b;">${props.comparisonLabel}:</span>
          <span style="font-weight: 600; color: #f59e0b;">$${dataPoint.salesYesterday.toLocaleString()}</span>
        </div>
      `;
    }
  },
  series: [
    // Comparison period (Yesterday/Previous) - Amber with dashed line
    {
      name: props.comparisonLabel,
      type: 'line',
      data: data.value.map(d => d.salesYesterday),
      smooth: true,
      lineStyle: {
        color: '#f59e0b',
        width: 2,
        type: 'dashed'
      },
      itemStyle: {
        color: '#f59e0b'
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(245, 158, 11, 0.1)' },
            { offset: 1, color: 'rgba(245, 158, 11, 0.01)' }
          ]
        }
      },
      showSymbol: false,
      emphasis: {
        focus: 'series'
      }
    },
    // Current period (Today) - Indigo with solid line
    {
      name: props.currentLabel,
      type: 'line',
      data: data.value.map(d => d.sales),
      smooth: true,
      lineStyle: {
        color: '#4f46e5',
        width: 4
      },
      itemStyle: {
        color: '#4f46e5',
        borderColor: '#fff',
        borderWidth: 2
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(79, 70, 229, 0.2)' },
            { offset: 1, color: 'rgba(79, 70, 229, 0.02)' }
          ]
        }
      },
      showSymbol: true,
      symbolSize: 6,
      emphasis: {
        focus: 'series',
        itemStyle: {
          borderWidth: 3
        }
      }
    }
  ]
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
      <VChart :option="chartOption" :loading="loading" autoresize />
    </div>
  </div>
</template>
