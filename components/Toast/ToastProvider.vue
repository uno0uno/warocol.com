<template>
  <Teleport to="body">
    <div class="fixed bottom-4 right-4 z-50 space-y-3">
      <TransitionGroup name="toast" tag="div" class="space-y-3">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="[
            'max-w-sm w-full rounded-lg p-4 shadow-lg border',
            'flex items-center justify-between',
            'transition-all duration-300 ease-in-out',
            toastClasses[toast.type]
          ]"
        >
          <div class="flex items-center space-x-3">
            <!-- Icon -->
            <div class="flex-shrink-0">
              <component :is="toastIcons[toast.type]" class="w-5 h-5" />
            </div>
            
            <!-- Message -->
            <p class="text-sm font-medium">{{ toast.message }}</p>
          </div>
          
          <!-- Close button -->
          <button
            @click="remove(toast.id)"
            class="flex-shrink-0 ml-3 p-1 hover:bg-black/10 rounded-full transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { useToast } from '@/composables/useToast'

const { toasts, remove } = useToast()

// Clases CSS para cada tipo de toast
const toastClasses = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800'
}

// Iconos para cada tipo
const toastIcons = {
  success: () => h('svg', {
    class: 'text-green-600',
    fill: 'currentColor',
    viewBox: '0 0 20 20'
  }, h('path', {
    fillRule: 'evenodd',
    d: 'M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z',
    clipRule: 'evenodd'
  })),
  
  error: () => h('svg', {
    class: 'text-red-600',
    fill: 'currentColor',
    viewBox: '0 0 20 20'
  }, h('path', {
    fillRule: 'evenodd',
    d: 'M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z',
    clipRule: 'evenodd'
  })),
  
  warning: () => h('svg', {
    class: 'text-yellow-600',
    fill: 'currentColor',
    viewBox: '0 0 20 20'
  }, h('path', {
    fillRule: 'evenodd',
    d: 'M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z',
    clipRule: 'evenodd'
  })),
  
  info: () => h('svg', {
    class: 'text-blue-600',
    fill: 'currentColor',
    viewBox: '0 0 20 20'
  }, h('path', {
    fillRule: 'evenodd',
    d: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z',
    clipRule: 'evenodd'
  }))
}
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(100%);
}

.toast-move {
  transition: transform 0.3s ease;
}
</style>