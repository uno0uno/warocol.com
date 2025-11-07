<template>
  <div class="flex justify-center">
    <div class="w-full max-w-4xl">
      <!-- Header -->
      <div class="flex items-center gap-4 mb-6">
        <Button 
          @click="$emit('cancel')" 
          variant="titan-outline" 
          size="sm"
          class="flex items-center gap-2"
        >
          <Icon name="heroicons:chevron-left" class="w-4 h-4" />
          Volver
        </Button>
        <h3 class="text-2xl font-bold text-foreground">{{ isEditMode ? 'Editar Evento' : 'Crear Nuevo Evento' }}</h3>
      </div>

      <!-- Progress Steps -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div 
            v-for="(step, index) in steps" 
            :key="index"
            class="flex items-center"
            :class="{ 'flex-1': index < steps.length - 1 }"
          >
            <!-- Step Indicator -->
            <div 
              class="flex items-center justify-center w-10 h-10 rounded-sm border-2 transition-all duration-200"
              :class="{
                'bg-primary border-primary text-primary-foreground': index < currentStep,
                'bg-primary/20 border-primary text-primary': index === currentStep,
                'bg-muted border-muted-foreground/30 text-muted-foreground': index > currentStep
              }"
            >
              <Icon 
                v-if="index < currentStep" 
                name="heroicons:check" 
                class="w-5 h-5" 
              />
              <span v-else class="text-sm font-medium">{{ index + 1 }}</span>
            </div>
            
            <!-- Step Label -->
            <div class="ml-3">
              <p class="text-sm font-medium" :class="{
                'text-foreground': index <= currentStep,
                'text-muted-foreground': index > currentStep
              }">
                {{ step.title }}
              </p>
              <p class="text-xs text-muted-foreground">{{ step.description }}</p>
            </div>
            
            <!-- Connector Line -->
            <div 
              v-if="index < steps.length - 1"
              class="flex-1 h-0.5 mx-4 transition-all duration-200"
              :class="{
                'bg-primary': index < currentStep,
                'bg-muted-foreground/30': index >= currentStep
              }"
            />
          </div>
        </div>
      </div>

      <!-- Step Content -->
      <div class="bg-card border border-border rounded-lg p-6 min-h-[500px]">
        <!-- Step 1: Información Básica -->
        <div v-if="currentStep === 0" class="space-y-6">
          <div class="text-center mb-6">
            <Icon name="heroicons:information-circle" class="w-12 h-12 text-primary mx-auto mb-2" />
            <h4 class="text-xl font-semibold text-foreground">Información Básica del Evento</h4>
            <p class="text-muted-foreground">Comencemos con los datos principales de tu evento</p>
          </div>

          <div class="max-w-2xl mx-auto space-y-6">
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
                class="input-base w-full"
                placeholder="Ingresa el nombre del evento"
              />
              <p class="text-xs text-muted-foreground mt-1">Este será el título principal de tu evento</p>
            </div>

            <!-- Descripción -->
            <div>
              <label for="eventDescription" class="block text-sm font-medium text-foreground mb-2">
                Descripción del evento
              </label>
              <textarea
                id="eventDescription"
                v-model="eventForm.description"
                rows="4"
                class="input-base w-full resize-none"
                placeholder="Describe tu evento, qué lo hace especial, qué pueden esperar los asistentes..."
              />
              <p class="text-xs text-muted-foreground mt-1">Una buena descripción ayuda a atraer más asistentes</p>
            </div>

            <!-- Tipo de evento -->
            <div>
              <label for="eventType" class="block text-sm font-medium text-foreground mb-2">
                Tipo de evento *
              </label>
              <select
                id="eventType"
                v-model="eventForm.type"
                class="input-base w-full"
                required
              >
                <option value="">Selecciona un tipo</option>
                <option value="concierto">🎵 Concierto</option>
                <option value="festival">🎉 Festival</option>
                <option value="teatro">🎭 Teatro</option>
                <option value="conferencia">💼 Conferencia</option>
                <option value="exposicion">🖼️ Exposición</option>
                <option value="deportivo">⚽ Evento Deportivo</option>
                <option value="cultural">🎨 Evento Cultural</option>
                <option value="educativo">📚 Evento Educativo</option>
                <option value="otro">📋 Otro</option>
              </select>
            </div>

            <!-- Fechas -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label for="startDate" class="block text-sm font-medium text-foreground mb-2">
                  Fecha y hora de inicio *
                </label>
                <input
                  id="startDate"
                  v-model="eventForm.startDate"
                  type="datetime-local"
                  required
                  class="input-base w-full"
                />
              </div>
              <div>
                <label for="endDate" class="block text-sm font-medium text-foreground mb-2">
                  Fecha y hora de fin
                </label>
                <input
                  id="endDate"
                  v-model="eventForm.endDate"
                  type="datetime-local"
                  class="input-base w-full"
                />
                <p class="text-xs text-muted-foreground mt-1">Opcional si es un evento de un solo día</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2: Áreas del Evento -->
        <div v-if="currentStep === 1" class="space-y-6">
          <div class="text-center mb-6">
            <Icon name="heroicons:map" class="w-12 h-12 text-primary mx-auto mb-2" />
            <h4 class="text-xl font-semibold text-foreground">Áreas del Evento</h4>
            <p class="text-muted-foreground">Organiza tu evento en diferentes áreas o zonas</p>
          </div>

          <div class="max-w-3xl mx-auto">
            <div class="space-y-4">
              <div 
                v-for="(area, index) in eventForm.areas" 
                :key="index"
                class="border border-border rounded-lg p-4 bg-card/50"
              >
                <div class="flex items-start gap-3">
                  <div class="flex-1 space-y-3">
                    <div>
                      <label class="block text-sm font-medium text-foreground mb-2">
                        Nombre del área *
                      </label>
                      <input
                        v-model="area.area_name"
                        type="text"
                        required
                        class="input-base w-full"
                        placeholder="Ej: Sala principal, Escenario norte, Zona VIP"
                      />
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-foreground mb-2">
                        Descripción del área
                      </label>
                      <input
                        v-model="area.description"
                        type="text"
                        class="input-base w-full"
                        placeholder="Ej: Área principal del evento con capacidad para 500 personas"
                      />
                    </div>
                  </div>
                  <Button 
                    v-if="eventForm.areas.length > 1"
                    type="button"
                    variant="titan-outline"
                    size="sm"
                    @click="removeArea(index)"
                    class="text-destructive border-destructive hover:bg-destructive/10 mt-6"
                  >
                    <Icon name="heroicons:trash" class="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <Button 
                type="button"
                variant="titan-outline"
                @click="addArea"
                class="w-full border-dashed"
              >
                <Icon name="heroicons:plus" class="w-4 h-4 mr-2" />
                Agregar otra área
              </Button>
              
            </div>
          </div>
        </div>

        <!-- Step 3: Información Legal -->
        <div v-if="currentStep === 2" class="space-y-6">
          <div class="text-center mb-6">
            <Icon name="heroicons:building-office" class="w-12 h-12 text-primary mx-auto mb-2" />
            <h4 class="text-xl font-semibold text-foreground">Información Legal</h4>
            <p class="text-muted-foreground">Datos de la empresa u organización (opcional)</p>
          </div>

          <div class="max-w-2xl mx-auto space-y-6">
            <div class="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-6">
              <div class="flex items-start gap-2">
                <Icon name="heroicons:information-circle" class="w-5 h-5 text-amber-400 mt-0.5" />
                <div>
                  <p class="text-sm font-medium text-amber-400 mb-1">Información opcional</p>
                  <p class="text-sm text-amber-200">
                    Estos datos son opcionales pero recomendados si organizas el evento como empresa o entidad legal.
                    Puedes saltarte este paso si es un evento personal.
                  </p>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label for="companyName" class="block text-sm font-medium text-foreground mb-2">
                  Nombre de la empresa/organización
                </label>
                <input
                  id="companyName"
                  v-model="eventForm.legalInfo.company_name"
                  type="text"
                  class="input-base w-full"
                  placeholder="Ej: Eventos Colombia SAS"
                />
              </div>
              <div>
                <label for="nit" class="block text-sm font-medium text-foreground mb-2">
                  NIT o documento de identificación
                </label>
                <input
                  id="nit"
                  v-model="eventForm.legalInfo.nit"
                  type="text"
                  class="input-base w-full"
                  placeholder="Ej: 900.123.456-7"
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
                  class="input-base w-full"
                  placeholder="Ej: Calle 123 #45-67, Bogotá"
                />
              </div>
              <div>
                <label for="phone" class="block text-sm font-medium text-foreground mb-2">
                  Teléfono de contacto
                </label>
                <input
                  id="phone"
                  v-model="eventForm.legalInfo.phone"
                  type="tel"
                  class="input-base w-full"
                  placeholder="Ej: +57 300 123 4567"
                />
              </div>
              <div class="md:col-span-2">
                <label for="email" class="block text-sm font-medium text-foreground mb-2">
                  Email de contacto
                </label>
                <input
                  id="email"
                  v-model="eventForm.legalInfo.email"
                  type="email"
                  class="input-base w-full"
                  placeholder="Ej: contacto@eventoscolombia.com"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Step 4: Resumen -->
        <div v-if="currentStep === 3" class="space-y-6">
          <div class="text-center mb-6">
            <Icon name="heroicons:clipboard-document-check" class="w-12 h-12 text-primary mx-auto mb-2" />
            <h4 class="text-xl font-semibold text-foreground">Resumen del Evento</h4>
            <p class="text-muted-foreground">Revisa la información antes de crear tu evento</p>
          </div>

          <div class="max-w-3xl mx-auto space-y-6">
            <!-- Información básica -->
            <div class="border border-border rounded-lg p-6">
              <h5 class="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Icon name="heroicons:information-circle" class="w-5 h-5" />
                Información Básica
              </h5>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="font-medium text-muted-foreground">Nombre:</span>
                  <p class="text-foreground">{{ eventForm.name || 'Sin especificar' }}</p>
                </div>
                <div>
                  <span class="font-medium text-muted-foreground">Tipo:</span>
                  <p class="text-foreground">{{ getEventTypeLabel(eventForm.type) || 'Sin especificar' }}</p>
                </div>
                <div>
                  <span class="font-medium text-muted-foreground">Inicio:</span>
                  <p class="text-foreground">{{ formatDateForDisplay(eventForm.startDate) || 'Sin especificar' }}</p>
                </div>
                <div>
                  <span class="font-medium text-muted-foreground">Fin:</span>
                  <p class="text-foreground">{{ formatDateForDisplay(eventForm.endDate) || 'No especificado' }}</p>
                </div>
                <div class="md:col-span-2">
                  <span class="font-medium text-muted-foreground">Descripción:</span>
                  <p class="text-foreground">{{ eventForm.description || 'Sin descripción' }}</p>
                </div>
              </div>
            </div>

            <!-- Áreas -->
            <div class="border border-border rounded-lg p-6">
              <h5 class="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Icon name="heroicons:map" class="w-5 h-5" />
                Áreas del Evento ({{ eventForm.areas.filter(a => a.area_name.trim()).length }})
              </h5>
              <div class="space-y-3">
                <div 
                  v-for="(area, index) in eventForm.areas.filter(a => a.area_name.trim())" 
                  :key="index"
                  class="bg-muted/30 rounded-lg p-3"
                >
                  <p class="font-medium text-foreground">{{ area.area_name }}</p>
                  <p v-if="area.description" class="text-sm text-muted-foreground">{{ area.description }}</p>
                </div>
              </div>
            </div>

            <!-- Información legal -->
            <div v-if="hasLegalInfo" class="border border-border rounded-lg p-6">
              <h5 class="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Icon name="heroicons:building-office" class="w-5 h-5" />
                Información Legal
              </h5>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div v-if="eventForm.legalInfo.company_name">
                  <span class="font-medium text-muted-foreground">Empresa:</span>
                  <p class="text-foreground">{{ eventForm.legalInfo.company_name }}</p>
                </div>
                <div v-if="eventForm.legalInfo.nit">
                  <span class="font-medium text-muted-foreground">NIT:</span>
                  <p class="text-foreground">{{ eventForm.legalInfo.nit }}</p>
                </div>
                <div v-if="eventForm.legalInfo.address">
                  <span class="font-medium text-muted-foreground">Dirección:</span>
                  <p class="text-foreground">{{ eventForm.legalInfo.address }}</p>
                </div>
                <div v-if="eventForm.legalInfo.phone">
                  <span class="font-medium text-muted-foreground">Teléfono:</span>
                  <p class="text-foreground">{{ eventForm.legalInfo.phone }}</p>
                </div>
                <div v-if="eventForm.legalInfo.email" class="md:col-span-2">
                  <span class="font-medium text-muted-foreground">Email:</span>
                  <p class="text-foreground">{{ eventForm.legalInfo.email }}</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- Navigation Buttons -->
      <div class="flex justify-between items-center mt-6">
        <Button 
          v-if="currentStep > 0"
          @click="previousStep"
          variant="titan-outline"
          :disabled="isSubmitting"
        >
          <Icon name="heroicons:chevron-left" class="w-4 h-4 mr-2" />
          Anterior
        </Button>
        <div v-else></div>

        <div class="flex gap-3">
          <Button 
            @click="$emit('cancel')"
            variant="titan-outline"
            :disabled="isSubmitting"
          >
            Cancelar
          </Button>
          
          <Button 
            v-if="currentStep < steps.length - 1"
            @click="nextStep"
            :disabled="!canContinue"
          >
            Siguiente
            <Icon name="heroicons:chevron-right" class="w-4 h-4 ml-2" />
          </Button>
          
          <Button 
            v-else
            @click="handleSubmit"
            :disabled="isSubmitting || !canContinue"
            class="bg-primary hover:bg-primary/90"
          >
            <Icon v-if="isSubmitting" name="heroicons:arrow-path" class="w-4 h-4 mr-2 animate-spin" />
            <Icon v-else name="heroicons:check" class="w-4 h-4 mr-2" />
            {{ isSubmitting ? 'Creando...' : 'Crear Evento' }}
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Button } from '~/components/ui'
import Icon from '~/components/ui/Icon.vue'

console.log('🔥 EventWizard component loaded:', new Date().toISOString())

const props = defineProps({
  eventData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['cancel', 'success'])

// Wizard state
const currentStep = ref(0)
const isSubmitting = ref(false)

const steps = [
  {
    title: 'Información Básica',
    description: 'Nombre, tipo y fechas'
  },
  {
    title: 'Áreas del Evento',
    description: 'Organiza las zonas'
  },
  {
    title: 'Información Legal',
    description: 'Datos de empresa (opcional)'
  },
  {
    title: 'Resumen',
    description: 'Confirma los datos'
  }
]

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

// Check if we're in edit mode
const isEditMode = computed(() => !!props.eventData)

// Toast composable
const { success, error } = useToast()

// Validation for each step
const canContinue = computed(() => {
  switch (currentStep.value) {
    case 0: // Información básica
      return eventForm.value.name.trim() && 
             eventForm.value.type && 
             eventForm.value.startDate
    case 1: // Áreas
      return eventForm.value.areas.some(area => area.area_name.trim())
    case 2: // Información legal (opcional)
      return true
    case 3: // Resumen
      return eventForm.value.name.trim() && 
             eventForm.value.type && 
             eventForm.value.startDate &&
             eventForm.value.areas.some(area => area.area_name.trim())
    default:
      return false
  }
})

// Check if has legal info
const hasLegalInfo = computed(() => {
  return Object.values(eventForm.value.legalInfo).some(val => val?.trim())
})

// Navigation functions
const nextStep = () => {
  if (currentStep.value < steps.length - 1 && canContinue.value) {
    currentStep.value++
  }
}

const previousStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
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

// Utility functions
const getEventTypeLabel = (type) => {
  const types = {
    'concierto': '🎵 Concierto',
    'festival': '🎉 Festival',
    'teatro': '🎭 Teatro',
    'conferencia': '💼 Conferencia',
    'exposicion': '🖼️ Exposición',
    'deportivo': '⚽ Evento Deportivo',
    'cultural': '🎨 Evento Cultural',
    'educativo': '📚 Evento Educativo',
    'otro': '📋 Otro'
  }
  return types[type]
}

const formatDateForDisplay = (dateString) => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateString
  }
}

// Format date for datetime-local input
const formatDateForInput = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toISOString().slice(0, 16)
}

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

// Submit handler
const handleSubmit = async () => {
  isSubmitting.value = true
  
  try {
    // Get user profile ID from auth store
    const authStore = useAuthStore()
    
    if (!authStore.profile?.id) {
      error('Error: No se pudo obtener el ID del perfil de usuario')
      return
    }

    // Format data for the API
    const eventData = {
      profile_id: authStore.profile.id,
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
      legal_info_data: hasLegalInfo.value ? eventForm.value.legalInfo : null,
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
        success('¡Evento creado exitosamente! 🎉')
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

<style scoped>
.input-base {
  @apply px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50;
}
</style>