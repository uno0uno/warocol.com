<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useLoadingPhrases } from '~/composables/useLoadingPhrases'

withDefaults(defineProps<{
  size?: 'small' | 'medium' | 'large'
  showPhrase?: boolean
}>(), {
  showPhrase: true,
})

const dotValues = [1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 0, 0, 1, 1]
const dotDelays = dotValues.map(() => `${(Math.random() * 2).toFixed(2)}s`)

const { t } = useI18n({ useScope: 'global' })
const { currentPhrase, start, stop } = useLoadingPhrases([
  t('common.loadingPhrases.sales'),
  t('common.loadingPhrases.orders'),
  t('common.loadingPhrases.accounts'),
  t('common.loadingPhrases.server'),
  t('common.loadingPhrases.tickets'),
  t('common.loadingPhrases.inventory'),
  t('common.loadingPhrases.commissions'),
  t('common.loadingPhrases.averageTicket'),
  t('common.loadingPhrases.almostReady'),
  t('common.loadingPhrases.kitchen'),
])

onMounted(() => start())
onUnmounted(() => stop())
</script>

<template>
  <div class="flex flex-col items-center gap-6">
    <div class="dot-grid">
      <div
        v-for="(val, i) in dotValues"
        :key="i"
        :class="['dot-item', val === 1 ? 'dot-one' : 'dot-zero']"
        :style="{ animationDelay: dotDelays[i] }"
      >{{ val }}</div>
    </div>
    <p v-if="showPhrase" class="phrase-text">{{ currentPhrase }}</p>
  </div>
</template>

<style>
.dot-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 24px;
}

@keyframes flash-one {
  0%   { color: hsl(var(--crocus-400) / 0.2); }
  50%  { color: hsl(var(--primary)); }
}

@keyframes flash-zero {
  0%   { color: hsl(var(--crocus-400) / 0.2); }
  50%  { color: hsl(var(--crocus-300)); }
}

.dot-item {
  font-family: monospace;
  font-size: 16px;
}

.dot-one {
  color: hsl(var(--crocus-400) / 0.2);
  animation: flash-one 0.8s infinite;
}

.dot-zero {
  color: hsl(var(--crocus-400) / 0.2);
  animation: flash-zero 1.2s infinite;
}

@keyframes fade-phrase {
  0%   { opacity: 0; transform: translateY(4px); }
  15%  { opacity: 1; transform: translateY(0); }
  85%  { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-4px); }
}

.phrase-text {
  font-size: 0.875rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: hsl(var(--crocus-700));
  animation: fade-phrase 1.5s ease-in-out infinite;
}
</style>
