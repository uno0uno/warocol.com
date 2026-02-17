<script setup lang="ts">
import { AlertCircle, AlertTriangle, Info, ArrowRight } from 'lucide-vue-next';

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  action: {
    label: string;
    url: string;
  };
}

const props = defineProps<{
  alerts?: Alert[];
}>();

// Icon mapping based on alert type
const getIcon = (type: string) => {
  switch (type) {
    case 'critical':
      return AlertCircle;
    case 'warning':
      return AlertTriangle;
    default:
      return Info;
  }
};

// Color classes based on alert type
const getColorClasses = (type: string) => {
  switch (type) {
    case 'critical':
      return {
        bg: 'bg-red-50',
        border: 'border-red-100',
        iconBg: 'bg-white',
        iconText: 'text-red-500',
        titleText: 'text-red-700',
        descText: 'text-red-600/80',
        actionText: 'text-red-700'
      };
    case 'warning':
      return {
        bg: 'bg-orange-50',
        border: 'border-orange-100',
        iconBg: 'bg-white',
        iconText: 'text-orange-500',
        titleText: 'text-orange-700',
        descText: 'text-orange-600/80',
        actionText: 'text-orange-700'
      };
    default:
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-100',
        iconBg: 'bg-white',
        iconText: 'text-blue-500',
        titleText: 'text-blue-700',
        descText: 'text-blue-600/80',
        actionText: 'text-blue-700'
      };
  }
};
</script>

<template>
  <section class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm opacity-100 transition-opacity duration-300">
    <h3 class="text-lg font-bold flex items-center gap-2 mb-4">
      <span class="w-2 h-6 bg-red-500 rounded-full"></span>
      Alertas
    </h3>

    <div v-if="!alerts || alerts.length === 0" class="text-center py-8">
      <Info :size="48" class="text-slate-300 mx-auto mb-3" />
      <p class="text-slate-500 text-sm">No hay alertas en este momento</p>
      <p class="text-slate-400 text-xs mt-1">Todo está funcionando correctamente ✅</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        v-for="alert in alerts"
        :key="alert.id"
        :class="[
          getColorClasses(alert.type).bg,
          getColorClasses(alert.type).border,
          'border p-4 rounded-xl flex items-start gap-3'
        ]"
      >
        <div :class="[
          getColorClasses(alert.type).iconBg,
          getColorClasses(alert.type).iconText,
          'p-2 rounded-lg shadow-sm'
        ]">
          <component :is="getIcon(alert.type)" :size="20" />
        </div>
        <div class="flex-1">
          <h4 :class="[getColorClasses(alert.type).titleText, 'font-bold text-sm']">
            {{ alert.title }}
          </h4>
          <p :class="[getColorClasses(alert.type).descText, 'text-xs mt-1 mb-2']">
            {{ alert.description }}
          </p>
          <NuxtLink
            :to="alert.action.url"
            :class="[
              getColorClasses(alert.type).actionText,
              'flex items-center gap-1 text-xs font-bold hover:underline'
            ]"
          >
            {{ alert.action.label }} <ArrowRight :size="12" />
          </NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>
