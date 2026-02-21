<template>
  <div 
    class="event-card group cursor-pointer"
    :class="cardClasses"
    @click="$emit('click', event)"
  >
    <!-- Image Container -->
    <div class="image-container">
      <div class="event-image" :style="{ background: eventGradient }">
        <span class="event-icon">{{ eventIcon }}</span>
        <div v-if="event.image" class="absolute inset-0 bg-cover bg-center" :style="{ backgroundImage: `url(${event.image})` }" />
      </div>
      
      <!-- Favorite Button -->
      <button 
        v-if="showFavorite"
        class="favorite-btn"
        @click.stop="toggleFavorite"
      >
        <Icon 
          name="heroicons:heart" 
          :class="[
            'w-5 h-5 transition-colors',
            isFavorited ? 'text-red-500 fill-current' : 'text-muted-foreground'
          ]"
        />
      </button>

      <!-- Status Badge -->
      <div class="absolute top-3 left-3">
        <Badge 
          :variant="event.isActive ? 'default' : 'secondary'" 
          :class="[
            'text-xs backdrop-blur-sm',
            event.isActive ? 'cursor-pointer' : ''
          ]"
        >
          {{ event.isActive ? 'Activo' : 'Finalizado' }}
        </Badge>
      </div>
    </div>

    <!-- Card Content -->
    <div class="card-content">
      <!-- Event Title -->
      <h3 class="event-title">{{ event.name }}</h3>

      <!-- Event Description -->
      <p class="event-description">
        {{ getStandardDescription(event.description) }}
      </p>

      <!-- Event Details -->
      <div class="event-details">
        <div v-if="event.location" class="detail-item">
          <Icon name="heroicons:map-pin" class="w-4 h-4" />
          <span>{{ event.location }}</span>
        </div>
        
        <div class="separator" />
        
        <div v-if="event.startDate" class="detail-item">
          <Icon name="heroicons:calendar-days" class="w-4 h-4" />
          <span>{{ formatEventDate(event.startDate) }}</span>
        </div>
      </div>

      <!-- Card Footer -->
      <div class="card-footer">
        <!-- Price Section -->
        <div v-if="event.price" class="price-section">
          <span class="price">${{ event.price }}</span>
          <span class="price-label">/Entrada</span>
        </div>
        <div v-else class="price-section">
          <span class="price">Gratis</span>
        </div>

        <!-- Attendees Section -->
        <div class="attendees">
          <div v-if="showAttendees && event.attendees" class="avatar-group">
            <div 
              v-for="(attendee, index) in displayedAttendees" 
              :key="index"
              class="avatar"
              :class="`avatar-${(index % 3) + 1}`"
              :title="attendee.name"
            >
              {{ getInitials(attendee.name) }}
            </div>
            <div v-if="remainingAttendees > 0" class="avatar avatar-more">
              +{{ remainingAttendees }}
            </div>
          </div>
          <div v-else-if="event.attendees" class="attendees-count">
            <Icon name="heroicons:users" class="w-4 h-4" />
            <span>{{ event.attendees }}</span>
          </div>
          
          <!-- Action Button -->
          <Button 
            :variant="variant === 'interactive' ? 'default' : 'outline'"
            size="sm"
            class="action-btn"
            @click.stop="$emit('action', event)"
          >
            <Icon :name="actionIcon" class="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Badge, Button } from '~/components/ui'

const props = defineProps({
  event: {
    type: Object,
    required: true
  },
  variant: {
    type: String,
    default: 'default', // 'default', 'interactive', 'minimal'
    validator: (value) => ['default', 'interactive', 'minimal'].includes(value)
  },
  showFavorite: {
    type: Boolean,
    default: false
  },
  showAttendees: {
    type: Boolean,
    default: false
  },
  maxAttendees: {
    type: Number,
    default: 3
  }
})

const emit = defineEmits(['click', 'action', 'favorite'])

// Reactive state
const isFavorited = ref(false)

// Computed properties
const cardClasses = computed(() => ({
  'variant-default': props.variant === 'default',
  'variant-interactive': props.variant === 'interactive',
  'variant-minimal': props.variant === 'minimal'
}))

const eventIcon = computed(() => {
  const icons = {
    'concierto': '🎵',
    'festival': '🎉',
    'teatro': '🎭',
    'conferencia': '💼',
    'exposicion': '🖼️',
    'deportivo': '⚽',
    'cultural': '🎨',
    'educativo': '📚',
    'otro': '📋'
  }
  return icons[props.event.type] || '📋'
})

const eventGradient = computed(() => {
  const gradients = {
    'concierto': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'festival': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'teatro': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'conferencia': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'exposicion': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'deportivo': 'linear-gradient(135deg, #30cfd0 0%, #91a7ff 100%)',
    'cultural': 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    'educativo': 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    'otro': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  }
  return gradients[props.event.type] || gradients.otro
})

const actionIcon = computed(() => {
  return props.variant === 'interactive' ? 'heroicons:plus' : 'heroicons:eye'
})

// Mock attendees for demonstration
const mockAttendees = [
  { name: 'Juan Díaz' },
  { name: 'Sofia Martín' },
  { name: 'Alex Kim' },
  { name: 'María García' },
  { name: 'Carlos López' }
]

const displayedAttendees = computed(() => {
  return mockAttendees.slice(0, props.maxAttendees)
})

const remainingAttendees = computed(() => {
  const total = props.event.attendees || mockAttendees.length
  return Math.max(0, total - props.maxAttendees)
})

// Methods
const toggleFavorite = () => {
  isFavorited.value = !isFavorited.value
  emit('favorite', { event: props.event, favorited: isFavorited.value })
}

const truncateText = (text, maxLength) => {
  if (!text) return ''
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
}

const getStandardDescription = (description) => {
  const standardLength = 90 // Caracteres estándar para consistencia
  const fallbackText = 'Evento único con contenido especial diseñado para brindar una experiencia memorable a todos los asistentes.'
  
  if (!description) return fallbackText
  
  if (description.length < standardLength) {
    // Si es muy corta, usar la descripción original + padding si es necesario
    return description
  }
  
  // Si es muy larga, truncar a la longitud estándar
  return description.slice(0, standardLength) + '...'
}

const getInitials = (name) => {
  if (!name) return '??'
  return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)
}

const formatEventDate = (dateString) => {
  if (!dateString) return ''
  
  try {
    const date = new Date(dateString)
    const now = new Date()
    const isThisYear = date.getFullYear() === now.getFullYear()
    
    const options = {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }
    
    if (!isThisYear) {
      options.year = '2-digit'
    }
    
    return date.toLocaleDateString('es-ES', options)
  } catch {
    return dateString
  }
}
</script>

<style scoped>
.event-card {
  @apply bg-card rounded-xl overflow-hidden transition-all duration-300 ease-out;
  @apply border border-border/50 backdrop-blur-sm;
  @apply flex flex-col h-full;
  min-height: 420px;
  max-height: 420px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.event-card:hover {
  @apply border-border;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.variant-interactive:hover {
  @apply border-primary/30;
  box-shadow: 0 16px 48px rgba(var(--primary), 0.2);
}

.image-container {
  @apply relative w-full h-44 overflow-hidden;
}

.event-image {
  @apply w-full h-full flex items-center justify-center relative;
}

.event-icon {
  @apply text-6xl opacity-20 absolute;
}

.favorite-btn {
  @apply absolute top-3 right-3 bg-card/90 backdrop-blur-sm border border-border/50;
  @apply w-8 h-8 rounded-full flex items-center justify-center;
  @apply transition-all duration-200 hover:scale-110 hover:bg-card;
}

.card-content {
  @apply p-5 flex-1 flex flex-col;
}

.event-title {
  @apply text-lg font-semibold text-foreground mb-2;
  @apply group-hover:text-primary transition-colors;
}

.event-description {
  @apply text-sm text-muted-foreground mb-3 leading-relaxed;
}

.event-details {
  @apply flex items-center gap-3 mb-4 flex-wrap flex-1;
}

.detail-item {
  @apply flex items-center gap-1.5 text-xs text-muted-foreground;
}

.separator {
  @apply w-1 h-1 bg-muted-foreground/30 rounded-full;
}

.card-footer {
  @apply flex justify-between items-center mt-auto;
}

.price-section {
  @apply flex items-baseline gap-1;
}

.price {
  @apply text-xl font-bold text-primary;
}

.price-label {
  @apply text-xs text-muted-foreground font-normal;
}

.attendees {
  @apply flex items-center gap-2;
}

.avatar-group {
  @apply flex items-center;
}

.avatar {
  @apply w-7 h-7 rounded-full border-2 border-card -ml-2 first:ml-0;
  @apply flex items-center justify-center font-semibold text-xs text-white;
  @apply transition-transform hover:scale-110 hover:z-10 relative;
}

.avatar-1 {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.avatar-2 {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.avatar-3 {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.avatar-more {
  @apply bg-muted-foreground text-card;
}

.attendees-count {
  @apply flex items-center gap-1 text-sm text-muted-foreground;
}

.action-btn {
  @apply transition-all duration-200;
}

.variant-interactive .action-btn {
  @apply group-hover:bg-primary group-hover:text-primary-foreground;
}

/* Variant styles */
.variant-minimal {
  @apply bg-card/50;
}

.variant-minimal .image-container {
  @apply h-32;
}

.variant-minimal .event-icon {
  @apply text-4xl;
}
</style>