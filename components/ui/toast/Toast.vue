<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="translate-x-full opacity-0 scale-95"
    enter-to-class="translate-x-0 opacity-100 scale-100"
    leave-active-class="transition-all duration-300 ease-in"
    leave-from-class="translate-x-0 opacity-100 scale-100"
    leave-to-class="translate-x-full opacity-0 scale-95"
  >
    <div
      v-if="visible"
      :class="[
        'flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm border max-w-sm min-w-[300px]',
        'bg-card/95 border-border ring-1 ring-white/10',
        variantClasses,
        sizeClasses
      ]"
      :style="{ 
        transform: `translateY(${stackOffset}px)`,
        zIndex: 50 - stackOffset / 8
      }"
    >
      <Icon :name="iconName" :class="iconClasses" />
      <div class="flex-1 min-w-0">
        <p :class="titleClasses" v-if="title">{{ title }}</p>
        <p :class="messageClasses">{{ message }}</p>
      </div>
      <button
        @click="close"
        class="flex-shrink-0 p-1 rounded-md hover:bg-white/10 transition-colors"
      >
        <Icon name="heroicons:x-mark" class="w-4 h-4" />
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

const props = defineProps({
  type: {
    type: String,
    default: 'info',
    validator: (value) => ['success', 'error', 'warning', 'info'].includes(value)
  },
  title: {
    type: String,
    default: ''
  },
  message: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    default: 5000
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg'].includes(value)
  },
  stackOffset: {
    type: Number,
    default: 0
  },
  removing: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const visible = ref(false)

const variantClasses = computed(() => {
  const variants = {
    success: 'border-green-500/30',
    error: 'border-red-500/30', 
    warning: 'border-yellow-500/30',
    info: 'border-blue-500/30'
  }
  return variants[props.type]
})

const sizeClasses = computed(() => {
  const sizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }
  return sizes[props.size]
})

const iconName = computed(() => {
  const icons = {
    success: 'heroicons:check-circle',
    error: 'heroicons:x-circle',
    warning: 'heroicons:exclamation-triangle',
    info: 'heroicons:information-circle'
  }
  return icons[props.type]
})

const iconClasses = computed(() => {
  const classes = {
    success: 'text-green-400',
    error: 'text-red-400',
    warning: 'text-yellow-400',
    info: 'text-blue-400'
  }
  return `w-5 h-5 flex-shrink-0 ${classes[props.type]}`
})

const titleClasses = computed(() => {
  return `font-medium text-${props.type === 'success' ? 'green' : props.type === 'error' ? 'red' : props.type === 'warning' ? 'yellow' : 'blue'}-100`
})

const messageClasses = computed(() => {
  return `text-${props.type === 'success' ? 'green' : props.type === 'error' ? 'red' : props.type === 'warning' ? 'yellow' : 'blue'}-200 ${props.title ? 'text-xs' : ''}`
})

const close = () => {
  visible.value = false
  emit('close')
}

onMounted(() => {
  visible.value = true
  
  if (props.duration > 0) {
    setTimeout(() => {
      close()
    }, props.duration)
  }
})
</script>