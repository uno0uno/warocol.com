<template>
  <div class="w-full max-w-2xl mx-auto">
    <!-- Stepper -->
    <div class="mb-8">
      <div class="flex items-center justify-between">
        <template v-for="(step, index) in steps" :key="index">
          <div
            class="flex items-center"
            :class="{ 'flex-1': index < steps.length - 1 }"
          >
            <!-- Step circle -->
            <div
              class="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200"
              :class="{
                'bg-primary border-primary text-primary-foreground': index < currentStep,
                'bg-primary/20 border-primary text-primary': index === currentStep,
                'bg-muted border-muted-foreground/30 text-muted-foreground': index > currentStep
              }"
            >
              <Icon v-if="index < currentStep" name="heroicons:check" class="w-5 h-5" />
              <span v-else class="text-sm font-medium">{{ index + 1 }}</span>
            </div>

            <!-- Step label (hidden on mobile for steps > 0 to save space) -->
            <div class="ml-2 hidden sm:block">
              <p
                class="text-xs font-medium leading-tight"
                :class="{
                  'text-foreground': index <= currentStep,
                  'text-muted-foreground': index > currentStep
                }"
              >
                {{ step.title }}
              </p>
              <p v-if="step.description" class="text-xs text-muted-foreground leading-tight">
                {{ step.description }}
              </p>
            </div>

            <!-- Connector line -->
            <div
              v-if="index < steps.length - 1"
              class="flex-1 h-0.5 mx-3 transition-all duration-200"
              :class="{
                'bg-primary': index < currentStep,
                'bg-muted-foreground/30': index >= currentStep
              }"
            />
          </div>
        </template>
      </div>

      <!-- Mobile: current step label -->
      <div class="mt-3 sm:hidden text-center">
        <p class="text-sm font-semibold text-foreground">{{ steps[currentStep]?.title }}</p>
        <p v-if="steps[currentStep]?.description" class="text-xs text-muted-foreground">
          {{ steps[currentStep].description }}
        </p>
      </div>
    </div>

    <!-- Step content -->
    <div class="bg-card border border-border rounded-lg p-6 min-h-[300px]">
      <slot :name="`step-${currentStep}`" />
    </div>

    <!-- Navigation -->
    <div class="flex items-center justify-between mt-6 gap-3">
      <!-- Previous -->
      <Button
        v-if="currentStep > 0"
        variant="outline"
        :disabled="isSubmitting"
        @click="$emit('prev')"
      >
        <Icon name="heroicons:chevron-left" class="w-4 h-4 mr-1" />
        Back
      </Button>
      <div v-else />

      <!-- Next / Submit -->
      <Button
        v-if="currentStep < steps.length - 1"
        :disabled="!canContinue"
        class="w-full sm:w-auto"
        @click="$emit('next')"
      >
        Continue
        <Icon name="heroicons:chevron-right" class="w-4 h-4 ml-1" />
      </Button>

      <Button
        v-else
        :disabled="!canContinue || isSubmitting"
        class="w-full sm:w-auto"
        @click="$emit('submit')"
      >
        <Icon
          v-if="isSubmitting"
          name="heroicons:arrow-path"
          class="w-4 h-4 mr-2 animate-spin"
        />
        <Icon v-else name="heroicons:check" class="w-4 h-4 mr-2" />
        {{ isSubmitting ? 'Placing order...' : 'Place order' }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '~/components/ui'

defineProps<{
  steps: { title: string; description?: string }[]
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
