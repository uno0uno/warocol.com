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

// Semantic classes based on alert type
const getColorClasses = (type: string) => {
  switch (type) {
    case 'critical':
      return {
        bg: 'bg-state-danger-bg',
        border: 'border-state-danger-border',
        iconBg: 'bg-surface',
        iconText: 'text-state-danger-icon',
        titleText: 'text-state-danger-text',
        descText: 'text-state-danger-text/80',
        actionText: 'text-state-danger-text'
      };
    case 'warning':
      return {
        bg: 'bg-state-warning-bg',
        border: 'border-state-warning-border',
        iconBg: 'bg-surface',
        iconText: 'text-state-warning-icon',
        titleText: 'text-state-warning-text',
        descText: 'text-state-warning-text/80',
        actionText: 'text-state-warning-text'
      };
    default:
      return {
        bg: 'bg-state-info-bg',
        border: 'border-state-info-border',
        iconBg: 'bg-surface',
        iconText: 'text-state-info-icon',
        titleText: 'text-state-info-text',
        descText: 'text-state-info-text/80',
        actionText: 'text-state-info-text'
      };
  }
};
</script>

<template>
  <section class="bg-surface p-6 rounded-2xl border border-border shadow-sm opacity-100 transition-opacity duration-300">
    <h3 class="text-lg font-bold flex items-center gap-2 mb-4">
      <span class="w-2 h-6 bg-state-danger-icon rounded-full"></span>
      Alertas
    </h3>

    <div v-if="!alerts || alerts.length === 0" class="text-center py-8">
      <Info :size="48" class="text-text-tertiary mx-auto mb-3" />
      <p class="text-text-secondary text-sm">No hay alertas en este momento</p>
      <p class="text-text-tertiary text-xs mt-1">Todo está funcionando correctamente ✅</p>
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
