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
        'bg-card/95 border-border ring-1 ring-border/40',
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
        <div v-if="actions?.length" class="mt-2 flex flex-wrap gap-2">
          <button
            v-for="(action, idx) in actions"
            :key="`${action.label}-${idx}`"
            type="button"
            class="px-2.5 py-1 rounded-md text-xs font-medium border border-border bg-surface hover:bg-control-action-hover-bg transition-colors"
            @click="runAction(action)"
          >
            {{ action.label }}
          </button>
        </div>
      </div>
      <button
        @click="close"
        class="flex-shrink-0 p-1 rounded-md hover:bg-control-action-hover-bg transition-colors"
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
  },
  actions: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close'])

const visible = ref(false)

const variantClasses = computed(() => {
  const variants = {
    success: 'border-state-success-border',
    error: 'border-state-danger-border',
    warning: 'border-state-warning-border',
    info: 'border-state-info-border'
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
    success: 'text-state-success-icon',
    error: 'text-state-danger-icon',
    warning: 'text-state-warning-icon',
    info: 'text-state-info-icon'
  }
  return `w-5 h-5 flex-shrink-0 ${classes[props.type]}`
})

const titleClasses = computed(() => {
  const classes = {
    success: 'text-state-success-text',
    error: 'text-state-danger-text',
    warning: 'text-state-warning-text',
    info: 'text-state-info-text'
  }
  return `font-medium ${classes[props.type]}`
})

const messageClasses = computed(() => {
  const classes = {
    success: 'text-state-success-text',
    error: 'text-state-danger-text',
    warning: 'text-state-warning-text',
    info: 'text-state-info-text'
  }
  return `${classes[props.type]} ${props.title ? 'text-xs' : ''}`
})

const close = () => {
  visible.value = false
  emit('close')
}

const runAction = (action) => {
  try {
    action?.onClick?.()
  } finally {
    close()
  }
}

onMounted(() => {
  visible.value = true

  // Parent toast store also schedules removal; skip local timer when actions need time.
  if (props.duration > 0 && !(props.actions?.length)) {
    setTimeout(() => {
      close()
    }, props.duration)
  }
})
</script>
