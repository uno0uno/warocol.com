<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click="handleBackdropClick">
    <div class="bg-card p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" @click.stop>
      <div class="flex items-center justify-between mb-6">
        <h4 class="text-xl font-semibold">{{ isEditMode ? 'Editar Evento' : 'Crear Nuevo Evento' }}</h4>
        <Button @click="closeModal" variant="outline" size="sm">
          <Icon name="heroicons:x-mark" class="w-4 h-4" />
        </Button>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Nombre del evento -->
        <div>
          <label for="eventName" class="block text-sm font-medium text-foreground mb-2">
            Nombre del evento *
          </label>
          <input
            id="eventName"
            v-model="eventForm.name"
            type="text"
            required
            class="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Ingresa el nombre del evento"
          />
        </div>

        <!-- Descripción -->
        <div>
          <label for="eventDescription" class="block text-sm font-medium text-foreground mb-2">
            Descripción
          </label>
          <textarea
            id="eventDescription"
            v-model="eventForm.description"
            rows="4"
            class="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Describe tu evento..."
          />
        </div>

        <!-- Tipo de evento -->
        <div>
          <label for="eventType" class="block text-sm font-medium text-foreground mb-2">
            Tipo de evento
          </label>
          <select
            id="eventType"
            v-model="eventForm.type"
            class="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">Selecciona un tipo</option>
            <option value="concierto">Concierto</option>
            <option value="festival">Festival</option>
            <option value="teatro">Teatro</option>
            <option value="conferencia">Conferencia</option>
            <option value="exposicion">Exposición</option>
            <option value="otro">Otro</option>
          </select>
        </div>

        <!-- Fechas -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label for="startDate" class="block text-sm font-medium text-foreground mb-2">
              Fecha de inicio *
            </label>
            <input
              id="startDate"
              v-model="eventForm.startDate"
              type="datetime-local"
              required
              class="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label for="endDate" class="block text-sm font-medium text-foreground mb-2">
              Fecha de fin
            </label>
            <input
              id="endDate"
              v-model="eventForm.endDate"
              type="datetime-local"
              class="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <!-- Ubicación -->
        <div>
          <label for="eventLocation" class="block text-sm font-medium text-foreground mb-2">
            Ubicación
          </label>
          <input
            id="eventLocation"
            v-model="eventForm.location"
            type="text"
            class="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Dirección del evento"
          />
        </div>

        <!-- Botones de acción -->
        <div class="flex gap-3 pt-6">
          <Button 
            type="submit" 
            :disabled="isSubmitting"
            class="flex items-center gap-2"
          >
            <Icon v-if="isSubmitting" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
            <Icon v-else name="heroicons:check-circle" class="w-4 h-4" />
            {{ isSubmitting ? (isEditMode ? 'Actualizando...' : 'Creando...') : (isEditMode ? 'Actualizar Evento' : 'Crear Evento') }}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            @click="closeModal"
            :disabled="isSubmitting"
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Button } from '~/components/ui'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  eventData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'success'])

// Form state
const eventForm = ref({
  name: '',
  description: '',
  type: '',
  startDate: '',
  endDate: '',
  location: ''
})

const isSubmitting = ref(false)

// Check if we're in edit mode
const isEditMode = computed(() => !!props.eventData)

// Toast composable
const { success, error } = useToast()

// Watch for eventData changes to populate form when editing
watch(() => props.eventData, (newData) => {
  if (newData) {
    eventForm.value = {
      name: newData.cluster_name || '',
      description: newData.description || '',
      type: newData.cluster_type || '',
      startDate: newData.start_date ? formatDateForInput(newData.start_date) : '',
      endDate: newData.end_date ? formatDateForInput(newData.end_date) : '',
      location: newData.location || ''
    }
  } else {
    // Reset form for create mode
    eventForm.value = {
      name: '',
      description: '',
      type: '',
      startDate: '',
      endDate: '',
      location: ''
    }
  }
}, { immediate: true })

// Format date for datetime-local input
const formatDateForInput = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toISOString().slice(0, 16)
}

// Handle backdrop click to close modal
const handleBackdropClick = (event) => {
  if (event.target === event.currentTarget) {
    closeModal()
  }
}

// Close modal
const closeModal = () => {
  if (!isSubmitting.value) {
    emit('close')
  }
}

// Submit handler
const handleSubmit = async () => {
  isSubmitting.value = true
  
  try {
    // TODO: Replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 1500)) // Simulate API call
    
    if (isEditMode.value) {
      success('Evento actualizado exitosamente')
    } else {
      success('Evento creado exitosamente')
    }
    
    emit('success')
    emit('close')
  } catch (err) {
    console.error('Error saving event:', err)
    error(`Error al ${isEditMode.value ? 'actualizar' : 'crear'} el evento. Por favor, intenta de nuevo.`)
  } finally {
    isSubmitting.value = false
  }
}
</script>