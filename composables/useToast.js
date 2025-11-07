import { ref, readonly } from 'vue'

// Estado global para los toasts
const toasts = ref([])
let toastIdCounter = 0

export const useToast = () => {
  const show = (message, type = 'info', options = {}) => {
    // Diferentes duraciones por tipo
    const defaultDuration = type === 'error' ? 7000 : type === 'success' ? 4000 : 5000
    const duration = options.duration ?? defaultDuration
    const title = options.title
    
    const id = ++toastIdCounter
    const toast = {
      id,
      message,
      type, // 'success', 'error', 'warning', 'info'
      title,
      duration,
      visible: true,
      removing: false,
      createdAt: Date.now()
    }
    
    toasts.value.push(toast)
    
    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        remove(id)
      }, duration)
    }
    
    return id
  }
  
  const remove = (id) => {
    const toast = toasts.value.find(t => t.id === id)
    if (toast && !toast.removing) {
      toast.removing = true
      toast.visible = false
      
      // Remove from array after animation completes
      setTimeout(() => {
        const index = toasts.value.findIndex(t => t.id === id)
        if (index > -1) {
          toasts.value.splice(index, 1)
        }
      }, 350) // Match exit animation duration
    }
  }
  
  const clear = () => {
    toasts.value.forEach(toast => {
      if (!toast.removing) {
        toast.removing = true
        toast.visible = false
      }
    })
    
    setTimeout(() => {
      toasts.value.splice(0)
    }, 350)
  }
  
  const success = (message, options) => show(message, 'success', options)
  const error = (message, options) => show(message, 'error', options)
  const warning = (message, options) => show(message, 'warning', options)
  const info = (message, options) => show(message, 'info', options)
  
  return {
    toasts: readonly(toasts),
    show,
    remove,
    clear,
    success,
    error,
    warning,
    info
  }
}