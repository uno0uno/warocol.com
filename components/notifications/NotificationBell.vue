<template>
  <div ref="containerRef" class="relative">
    <!-- Bell trigger button -->
    <button
      @click="toggle"
      @keydown.escape="close"
      :aria-expanded="isOpen"
      aria-haspopup="true"
      aria-label="Notificaciones"
      class="relative w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
    >
      <!-- Animated bell icon: solid when there are unread notifications -->
      <BellAlertIcon v-if="unreadCount > 0" class="w-6 h-6 text-primary" aria-hidden="true" />
      <BellIcon v-else class="w-6 h-6 text-muted-foreground" aria-hidden="true" />

      <!-- Unread count badge -->
      <span
        v-if="unreadCount > 0"
        aria-live="polite"
        aria-atomic="true"
        class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full leading-none"
      >
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>
    </button>

    <!-- Dropdown panel -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-1 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 -translate-y-1 scale-95"
    >
      <div
        v-if="isOpen"
        class="absolute right-0 top-[calc(100%+8px)] w-80 bg-surface border border-border rounded-2xl shadow-xl z-50 overflow-hidden"
        role="dialog"
        aria-label="Panel de notificaciones"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 class="text-sm font-semibold text-text-primary">Notificaciones</h2>
          <button
            v-if="notifications.length > 0"
            @click="handleMarkAllRead"
            class="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
          >
            Marcar todo como leído
          </button>
        </div>

        <!-- Loading state -->
        <div v-if="isLoading" class="flex items-center justify-center py-10">
          <div class="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" aria-label="Cargando notificaciones" />
        </div>

        <!-- Empty state -->
        <div v-else-if="notifications.length === 0" class="flex flex-col items-center justify-center py-10 px-4 gap-2">
          <BellIcon class="w-8 h-8 text-muted-foreground/40" aria-hidden="true" />
          <p class="text-sm text-muted-foreground text-center">Sin notificaciones nuevas</p>
        </div>

        <!-- Notification list -->
        <ul v-else class="max-h-80 overflow-y-auto divide-y divide-border">
          <li
            v-for="notification in notifications"
            :key="notification.id"
            @click="handleMarkAsRead(notification.id)"
            class="flex gap-3 px-4 py-3 hover:bg-surface-secondary transition-colors cursor-pointer"
          >
            <!-- Icon -->
            <div class="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
              <ShoppingBagIcon class="w-4 h-4 text-primary" aria-hidden="true" />
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-text-primary leading-snug">
                Nuevo pedido #{{ notification.payload?.order_number ?? '—' }}
              </p>
              <p class="text-xs text-muted-foreground mt-0.5">
                {{ formatRelativeTime(notification.created_at) }}
              </p>
            </div>

            <!-- Unread dot -->
            <div
              v-if="!notification.read_at"
              class="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5"
              aria-hidden="true"
            />
          </li>
        </ul>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { BellIcon, BellAlertIcon, ShoppingBagIcon } from '@heroicons/vue/24/outline'
import { useNotifications } from '~/composables/useNotifications'

const { notifications, unreadCount, init, markAsRead, markAllRead } = useNotifications()

const isOpen = ref(false)
const isLoading = ref(false)
const containerRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)

const toggle = async (event: MouseEvent) => {
  triggerRef.value = event.currentTarget as HTMLButtonElement
  if (isOpen.value) {
    close()
    return
  }
  isOpen.value = true
  if (!isLoading.value) {
    isLoading.value = true
    await init()
    isLoading.value = false
  }
}

const close = () => {
  isOpen.value = false
  triggerRef.value?.focus()
}

const handleMarkAsRead = async (id: string) => {
  await markAsRead(id)
}

const handleMarkAllRead = async () => {
  await markAllRead()
}

// Inline relative time utility (no date-fns dependency needed)
const formatRelativeTime = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'Ahora'
  if (minutes < 60) return `Hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Hace ${hours} h`
  const days = Math.floor(hours / 24)
  return `Hace ${days} d`
}

// Click outside to close
const handleClickOutside = (event: MouseEvent) => {
  if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  // Start SSE connection eagerly (no-op if already connected)
  if (process.client) init()
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
