<template>
  <div 
    class="horizontal-event-card"
    @click="$emit('click', event)"
  >
    <!-- Image Container -->
    <div class="image-container" :style="{ background: eventGradient }">
      <Badge class="absolute top-2 left-2 text-xs backdrop-blur-sm">
        {{ event.badge || getEventBadge() }}
      </Badge>
      <span class="event-icon">{{ event.icon || getEventIcon() }}</span>
    </div>
    
    <!-- Card Content -->
    <div class="card-content">
      <div class="content-top">
        <h3 class="event-title">{{ event.name }}</h3>
        <p class="event-description">
          {{ getTruncatedDescription() }}
        </p>
        
        <!-- Attendees Section -->
        <div class="attendees-section">
          <div class="avatar-group">
            <div 
              v-for="(attendee, index) in displayedAttendees" 
              :key="index"
              class="avatar"
              :class="`avatar-${(index % 6) + 1}`"
              :title="attendee.name"
            >
              {{ getInitials(attendee.name) }}
            </div>
          </div>
          <div class="attendees-count">
            <Icon name="heroicons:users" class="w-3 h-3" />
            <span>{{ event.attendees }}/{{ event.maxAttendees }}</span>
          </div>
        </div>
      </div>
      
      <!-- Event Info Footer -->
      <div class="event-info">
        <div class="info-item">
          <Icon name="heroicons:map-pin" class="w-3 h-3" />
          <span>{{ getTruncatedLocation() }}</span>
        </div>
        <div class="info-item">
          <Icon name="heroicons:calendar-days" class="w-3 h-3" />
          <span>{{ formatEventDate() }}</span>
        </div>
        <div class="info-item">
          <Icon name="heroicons:clock" class="w-3 h-3" />
          <span>{{ event.startTime || '12:00 AM' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Badge } from '~/components/ui'

const props = defineProps({
  event: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['click'])

// Mock attendees for demonstration
const mockAttendees = [
  { name: 'Juan Díaz' },
  { name: 'Sofia Martín' },
  { name: 'Alex Kim' },
  { name: 'María García' },
  { name: 'Carlos López' },
  { name: 'Ana Torres' }
]

const displayedAttendees = computed(() => {
  return mockAttendees.slice(0, 6)
})

// Methods
const getEventIcon = () => {
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
}

const getEventBadge = () => {
  const badges = {
    'concierto': 'Music',
    'festival': 'Festival',
    'teatro': 'Theater',
    'conferencia': 'Business',
    'exposicion': 'Art',
    'deportivo': 'Sports',
    'cultural': 'Culture',
    'educativo': 'Education',
    'otro': 'Event'
  }
  return badges[props.event.type] || 'Event'
}

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

const getTruncatedDescription = () => {
  const maxLength = 80
  if (!props.event.description) return 'Evento especial con contenido único diseñado para una experiencia memorable.'
  
  if (props.event.description.length <= maxLength) {
    return props.event.description
  }
  
  return props.event.description.slice(0, maxLength) + '...'
}

const getTruncatedLocation = () => {
  if (!props.event.location) return 'Por definir'
  
  const maxLength = 15
  if (props.event.location.length <= maxLength) {
    return props.event.location
  }
  
  return props.event.location.slice(0, maxLength) + '...'
}

const getInitials = (name) => {
  if (!name) return '??'
  return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)
}

const formatEventDate = () => {
  if (!props.event.startDate) return '12 ene 2025'
  
  try {
    const date = new Date(props.event.startDate)
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  } catch {
    return '12 ene 2025'
  }
}
</script>

<style scoped>
.horizontal-event-card {
  @apply bg-card rounded-xl overflow-hidden cursor-pointer transition-all duration-300;
  @apply border border-border/50 backdrop-blur-sm;
  @apply flex gap-0 w-full max-w-lg;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.horizontal-event-card:hover {
  @apply border-border;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.image-container {
  @apply relative min-w-[100px] w-[100px] h-auto;
  @apply flex items-center justify-center;
  background: linear-gradient(135deg, #ff6b35 0%, #f7931e 50%, #dc3545 100%);
}

.event-icon {
  @apply text-4xl opacity-50;
}

.card-content {
  @apply flex-1 p-3 flex flex-col justify-between;
}

.content-top {
  @apply flex-1;
}

.event-title {
  @apply text-sm font-bold text-foreground mb-1 leading-tight;
}

.event-description {
  @apply text-xs text-muted-foreground leading-relaxed mb-3;
}

.attendees-section {
  @apply flex items-center gap-2 mb-3;
}

.avatar-group {
  @apply flex items-center;
}

.avatar {
  @apply w-5 h-5 rounded-full border-2 border-card -ml-1.5 first:ml-0;
  @apply flex items-center justify-center font-semibold text-[8px] text-white;
  @apply transition-transform hover:scale-110 hover:z-10 relative;
}

.avatar-1 { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.avatar-2 { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.avatar-3 { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.avatar-4 { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
.avatar-5 { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
.avatar-6 { background: linear-gradient(135deg, #30cfd0 0%, #330867 100%); }

.attendees-count {
  @apply flex items-center gap-1 text-xs text-muted-foreground font-medium;
}

.event-info {
  @apply flex gap-3 flex-wrap;
}

.info-item {
  @apply flex items-center gap-1 text-xs text-muted-foreground;
}
</style>