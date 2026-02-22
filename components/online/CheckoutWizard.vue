<template>
  <div class="w-full max-w-2xl mx-auto flex flex-col gap-4">

    <!-- Stepper -->
    <div class="bg-surface border border-border rounded-lg">
      <div class="p-3 sm:p-6">
        <div class="flex items-center justify-between">
          <!-- eslint-disable-next-line vue/no-v-for-template-key -->
          <template v-for="(step, index) in steps" :key="index">
            <div class="flex items-center" :class="{ 'flex-1': index < steps.length - 1 }">

              <!-- Círculo del paso -->
              <div
                class="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-colors border-2 flex-shrink-0"
                :class="{
                  'bg-primary text-primary-foreground border-primary': index < currentStep,
                  'bg-primary text-primary-foreground border-primary': index === currentStep,
                  'bg-transparent border-border text-text-secondary': index > currentStep,
                }"
              >
                <Icon v-if="index < currentStep" name="heroicons:check" class="w-4 h-4 sm:w-5 sm:h-5" />
                <span v-else class="font-semibold text-sm sm:text-base">{{ index + 1 }}</span>
              </div>

              <!-- Etiqueta del paso -->
              <div class="ml-1 sm:ml-3 flex-1 min-w-0">
                <p
                  class="text-xs sm:text-sm font-medium truncate"
                  :class="index <= currentStep ? 'text-text-primary' : 'text-text-secondary'"
                >
                  <span class="hidden sm:inline">{{ step.title }}</span>
                  <span class="sm:hidden">{{ step.short ?? step.title }}</span>
                </p>
                <p v-if="step.description" class="text-xs text-text-secondary hidden sm:block">
                  {{ step.description }}
                </p>
              </div>

              <!-- Línea conectora -->
              <div
                v-if="index < steps.length - 1"
                class="flex-1 h-0.5 sm:h-1 mx-1 sm:mx-4 transition-all duration-200"
                :class="index < currentStep ? 'bg-primary' : 'bg-border'"
              />
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Contenido del paso -->
    <div class="bg-surface border border-border rounded-lg">
      <div class="p-4 sm:p-6">
        <slot :name="`step-${currentStep}`" />
      </div>
    </div>

    <!-- Navegación sticky bottom -->
    <div class="bg-surface border-t border-border rounded-lg shadow-lg">
      <div class="px-4 sm:px-6 py-3 sm:py-4">
        <div class="flex justify-between items-center gap-3">

          <!-- Atrás / Cancelar -->
          <button
            v-if="currentStep > 0"
            type="button"
            class="btn-secondary px-4 sm:px-6 py-2 rounded-lg text-sm sm:text-base"
            :disabled="isSubmitting"
            @click="$emit('prev')"
          >
            <Icon name="heroicons:chevron-left" class="w-4 h-4 inline-block mr-1" />
            Atrás
          </button>
          <div v-else />

          <!-- Continuar / Confirmar pedido -->
          <button
            v-if="currentStep < steps.length - 1"
            type="button"
            class="btn-primary px-4 sm:px-6 py-2 rounded-lg text-sm sm:text-base"
            :class="{ 'opacity-50 cursor-not-allowed': !canContinue || isSubmitting }"
            :disabled="!canContinue || isSubmitting"
            @click="$emit('next')"
          >
            <Icon
              v-if="isSubmitting"
              name="heroicons:arrow-path"
              class="w-4 h-4 inline-block mr-2 animate-spin"
            />
            <span class="hidden sm:inline">{{ isSubmitting ? 'Cargando...' : 'Continuar' }}</span>
            <span class="sm:hidden">
              <Icon v-if="!isSubmitting" name="heroicons:chevron-right" class="w-4 h-4" />
              <Icon v-else name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
            </span>
            <Icon v-if="!isSubmitting" name="heroicons:chevron-right" class="w-4 h-4 inline-block ml-1 hidden sm:inline-block" />
          </button>

          <button
            v-else
            type="button"
            class="btn-primary px-4 sm:px-6 py-2 rounded-lg text-sm sm:text-base"
            :class="{ 'opacity-50 cursor-not-allowed': !canContinue || isSubmitting }"
            :disabled="!canContinue || isSubmitting"
            @click="$emit('submit')"
          >
            <Icon
              v-if="isSubmitting"
              name="heroicons:arrow-path"
              class="w-4 h-4 inline-block mr-2 animate-spin"
            />
            <Icon v-else name="heroicons:check" class="w-4 h-4 inline-block mr-2" />
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
