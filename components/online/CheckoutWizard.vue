<template>
  <div class="w-full max-w-2xl mx-auto flex flex-col gap-4">

    <!-- Step indicator -->
    <nav aria-label="Progreso del pedido" class="bg-surface border border-border rounded-lg">
      <div class="px-3 py-4 sm:px-6">
        <div class="flex items-center">
          <!-- eslint-disable-next-line vue/no-v-for-template-key -->
          <template v-for="(step, index) in steps" :key="index">

            <!-- Step node -->
            <div class="flex flex-col items-center flex-shrink-0">
              <div
                class="flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors"
                :class="{
                  'bg-primary/15 border-primary': index < currentStep,
                  'bg-primary border-primary': index === currentStep,
                  'bg-background border-border': index > currentStep,
                }"
                :aria-current="index === currentStep ? 'step' : undefined"
              >
                <!-- Completed: checkmark -->
                <svg
                  v-if="index < currentStep"
                  class="w-4 h-4 text-primary"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                </svg>
                <!-- Active or future: number -->
                <span
                  v-else
                  class="text-xs font-bold"
                  :class="index === currentStep ? 'text-primary-foreground' : 'text-muted-foreground'"
                >
                  {{ index + 1 }}
                </span>
              </div>

              <!-- Step label (hidden on xs, visible sm+) -->
              <p
                class="hidden sm:block text-xs mt-1.5 text-center max-w-[4rem] leading-tight"
                :class="{
                  'text-primary font-medium': index === currentStep,
                  'text-muted-foreground': index !== currentStep,
                }"
              >
                {{ step.short ?? step.title }}
              </p>
            </div>

            <!-- Connector line -->
            <div
              v-if="index < steps.length - 1"
              class="flex-1 h-0.5 mx-1 sm:mx-2 mb-0 sm:mb-5 transition-colors"
              :class="index < currentStep ? 'bg-primary' : 'bg-border'"
              aria-hidden="true"
            />

          </template>
        </div>

        <!-- Current step label on mobile -->
        <p class="sm:hidden text-xs text-center text-muted-foreground mt-3">
          <span class="font-semibold text-foreground">{{ steps[currentStep]?.title }}</span>
          &nbsp;— Paso {{ currentStep + 1 }} de {{ steps.length }}
        </p>
      </div>
    </nav>

    <!-- Step content -->
    <div class="bg-surface border border-border rounded-lg">
      <div class="p-4 sm:p-6">
        <slot :name="`step-${currentStep}`" />
      </div>
    </div>

    <!-- Navigation -->
    <div class="bg-surface border border-border rounded-lg shadow-lg">
      <div class="px-4 sm:px-6 py-3 sm:py-4">
        <div class="flex justify-between items-center gap-3">

          <!-- Back / back-to-cart slot -->
          <button
            v-if="currentStep > 0"
            type="button"
            class="btn-secondary px-4 sm:px-6 py-3 rounded-lg text-sm sm:text-base inline-flex items-center gap-1
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            :disabled="isSubmitting"
            @click="$emit('prev')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            Atrás
          </button>
          <slot v-else name="back-action" />

          <!-- Step 3: identity auto-advances — show hint instead of disabled button -->
          <p
            v-if="currentStep === 3"
            class="text-sm text-muted-foreground text-center flex-1"
          >
            Verifica tu identidad para continuar
          </p>

          <!-- Continue -->
          <button
            v-else-if="currentStep < steps.length - 1"
            type="button"
            class="btn-primary px-4 sm:px-6 py-3 rounded-lg text-sm sm:text-base inline-flex items-center gap-1
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            :class="{ 'opacity-50 cursor-not-allowed': !canContinue || isSubmitting }"
            :disabled="!canContinue || isSubmitting"
            @click="$emit('next')"
          >
            <svg v-if="isSubmitting" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{{ isSubmitting ? 'Cargando...' : 'Continuar' }}</span>
            <svg v-if="!isSubmitting" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <!-- Confirm order -->
          <button
            v-else
            type="button"
            class="btn-primary px-4 sm:px-6 py-3 rounded-lg text-sm sm:text-base inline-flex items-center gap-2
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            :class="{ 'opacity-50 cursor-not-allowed': !canContinue || isSubmitting }"
            :disabled="!canContinue || isSubmitting"
            @click="$emit('submit')"
          >
            <svg v-if="isSubmitting" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            {{ isSubmitting ? 'Procesando...' : 'Confirmar pedido' }}
          </button>

        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
defineProps<{
  steps: { title: string; short?: string; description?: string }[]
  currentStep: number
  canContinue: boolean
  isSubmitting?: boolean
}>()

defineEmits<{
  (e: 'next'): void
  (e: 'prev'): void
  (e: 'submit'): void
}>()
</script>
