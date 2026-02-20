<template>
  <Teleport to="body">
    <div class="fixed bottom-4 right-4 z-50 flex flex-col-reverse items-end gap-4">
      <UiToast
        v-for="(toast, index) in visibleToasts"
        :key="toast.id"
        :type="toast.type"
        :title="toast.title"
        :message="toast.message"
        :duration="toast.duration"
        :stack-offset="getStackOffset(index)"
        :removing="toast.removing"
        @close="remove(toast.id)"
      />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useToast } from '~/composables/useToast'

const { toasts, remove } = useToast()

const visibleToasts = computed(() => {
  return toasts.value.filter(toast => toast.visible)
})

const getStackOffset = (index) => {
  const maxToasts = 4
  const offsetIncrement = 8
  
  if (index >= maxToasts) {
    return (maxToasts - 1) * offsetIncrement
  }
  
  return index * offsetIncrement
}
</script>