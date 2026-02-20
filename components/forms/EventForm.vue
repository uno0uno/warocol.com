<template>
  <div class="flex justify-center">
    <div class="w-full max-w-2xl">
      <div class="flex items-center gap-4 mb-6">
        <Button 
          @click="$emit('cancel')" 
          variant="outline" 
          size="sm"
          class="flex items-center gap-2"
        >
          <Icon name="heroicons:chevron-left" class="w-4 h-4" />
          Volver
        </Button>
        <h3 class="text-2xl font-bold text-foreground">{{ isEditMode ? 'Editar Evento' : 'Crear Nuevo Evento' }}</h3>
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

        <!-- Áreas del evento -->
        <div>
          <label class="block text-sm font-medium text-foreground mb-2">
            Áreas del evento *
          </label>
          <div class="space-y-3">
            <div 
              v-for="(area, index) in eventForm.areas" 
              :key="index"
              class="flex gap-3 items-start"
            >
              <div class="flex-1">
                <input
                  v-model="area.area_name"
                  type="text"
                  required
                  class="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Nombre del área (ej: Sala principal)"
                />
              </div>
              <div class="flex-1">
                <input
                  v-model="area.description"
                  type="text"
                  class="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Descripción del área (opcional)"
                />
              </div>
              <Button 
                v-if="eventForm.areas.length > 1"
                type="button"
                variant="outline"
                size="sm"
                @click="removeArea(index)"
                class="text-red-500 border-red-500 hover:bg-red-50"
              >
                <Icon name="heroicons:x-mark" class="w-4 h-4" />
              </Button>
            </div>
            <Button 
              type="button"
              variant="outline"
              size="sm"
              @click="addArea"
              class="w-full"
            >
              <Icon name="heroicons:plus" class="w-4 h-4 mr-2" />
              Agregar área
            </Button>
          </div>
        </div>

        <!-- Información legal (opcional) -->
        <div class="border border-border rounded-lg p-4">
          <h4 class="text-sm font-medium text-foreground mb-3">Información Legal (Opcional)</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="companyName" class="block text-sm font-medium text-foreground mb-2">
                Nombre de la empresa
              </label>
              <input
                id="companyName"
                v-model="eventForm.legalInfo.company_name"
                type="text"
                class="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Nombre de la empresa organizadora"
              />
            </div>
            <div>
              <label for="nit" class="block text-sm font-medium text-foreground mb-2">
                NIT
              </label>
              <input
                id="nit"
                v-model="eventForm.legalInfo.nit"
                type="text"
                class="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Número de identificación tributaria"
              />
            </div>
            <div>
              <label for="address" class="block text-sm font-medium text-foreground mb-2">
                Dirección
              </label>
              <input
                id="address"
                v-model="eventForm.legalInfo.address"
                type="text"
                class="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Dirección de la empresa"
              />
            </div>
            <div>
              <label for="phone" class="block text-sm font-medium text-foreground mb-2">
                Teléfono
              </label>
              <input
                id="phone"
                v-model="eventForm.legalInfo.phone"
                type="tel"
                class="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Teléfono de contacto"
              />
            </div>
            <div class="md:col-span-2">
              <label for="email" class="block text-sm font-medium text-foreground mb-2">
                Email
              </label>
              <input
                id="email"
                v-model="eventForm.legalInfo.email"
                type="email"
                class="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Correo electrónico de contacto"
              />
            </div>
          </div>
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
            @click="$emit('cancel')"
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
import Icon from '~/components/ui/Icon.vue'

const props = defineProps({
  eventData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['cancel', 'success'])

// Form state
const eventForm = ref({
  name: '',
  description: '',
  type: '',
  startDate: '',
  endDate: '',
  areas: [{ area_name: '', description: '' }],
  legalInfo: {
    company_name: '',
    nit: '',
    address: '',
    phone: '',
    email: ''
  }
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
      areas: newData.areas_data && Array.isArray(newData.areas_data) && newData.areas_data.length > 0 
        ? newData.areas_data 
        : [{ area_name: '', description: '' }],
      legalInfo: {
        company_name: newData.legal_info?.company_name || '',
        nit: newData.legal_info?.nit || '',
        address: newData.legal_info?.address || '',
        phone: newData.legal_info?.phone || '',
        email: newData.legal_info?.email || ''
      }
    }
  } else {
    // Reset form for create mode
    eventForm.value = {
      name: '',
      description: '',
      type: '',
      startDate: '',
      endDate: '',
      areas: [{ area_name: '', description: '' }],
      legalInfo: {
        company_name: '',
        nit: '',
        address: '',
        phone: '',
        email: ''
      }
    }
  }
}, { immediate: true })

// Format date for datetime-local input
const formatDateForInput = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toISOString().slice(0, 16)
}

// Area management functions
const addArea = () => {
  eventForm.value.areas.push({ area_name: '', description: '' })
}

const removeArea = (index) => {
  if (eventForm.value.areas.length > 1) {
    eventForm.value.areas.splice(index, 1)
  }
}

// Submit handler
const handleSubmit = async () => {
  isSubmitting.value = true
  
  try {
    // Get user profile ID from auth store
    const { profile } = useAuthStore()
    
    if (!profile.value?.id) {
      error('Error: No se pudo obtener el ID del perfil de usuario')
      return
    }

    // Format data for the API
    const eventData = {
      profile_id: profile.value.id,
      event_data: {
        cluster_name: eventForm.value.name,
        description: eventForm.value.description,
        cluster_type: eventForm.value.type || 'evento',
        start_date: eventForm.value.startDate || null,
        end_date: eventForm.value.endDate || null,
        slug_cluster: eventForm.value.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
      },
      areas_data: eventForm.value.areas.filter(area => area.area_name.trim() !== ''),
      legal_info_data: Object.values(eventForm.value.legalInfo).some(val => val?.trim()) 
        ? eventForm.value.legalInfo 
        : null,
      images_data: null // Add images functionality later if needed
    }

    console.log('Submitting event data:', eventData)

    if (isEditMode.value) {
      // TODO: Implement update API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      success('Evento actualizado exitosamente')
    } else {
      // Create new event
      const response = await $fetch('/api/events', {
        method: 'POST',
        body: eventData
      })
      
      if (response.success) {
        success('Evento creado exitosamente')
      } else {
        throw new Error(response.message || 'Error desconocido')
      }
    }
    
    emit('success')
  } catch (err) {
    console.error('Error saving event:', err)
    error(`Error al ${isEditMode.value ? 'actualizar' : 'crear'} el evento: ${err.message || 'Por favor, intenta de nuevo.'}`)
  } finally {
    isSubmitting.value = false
  }
}
</script>