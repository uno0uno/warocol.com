<template>
  <div ref="containerRef" class="relative">
    <!-- Bell trigger button -->
    <button
      @click="toggle"
      @keydown.escape="close"
      :aria-expanded="isOpen"
      aria-haspopup="true"
      aria-label="Notificaciones"
      class="relative w-11 h-11 flex items-center justify-center rounded-full hover:bg-shell-notification-hover-bg focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring transition-colors"
    >
      <!-- Animated bell icon: solid when there are unread notifications -->
      <BellAlertIcon v-if="unreadCount > 0" class="w-6 h-6 text-shell-notification-accent" aria-hidden="true" />
      <BellIcon v-else class="w-6 h-6 text-shell-notification-muted-text" aria-hidden="true" />

      <!-- Unread count badge -->
      <span
        v-if="unreadCount > 0"
        aria-live="polite"
        aria-atomic="true"
        class="absolute -top-0.5 -end-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-badge-danger-bg text-badge-danger-text text-[10px] font-bold rounded-full leading-none"
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
        class="absolute end-0 top-[calc(100%+8px)] w-80 bg-surface border border-border rounded-2xl shadow-xl z-50 overflow-hidden"
        role="dialog"
        aria-label="Panel de notificaciones"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-border gap-2">
          <h2 class="text-sm font-semibold text-shell-notification-text">Notificaciones</h2>
          <div class="flex items-center gap-1">
            <button
              type="button"
              @click="handleToggleSound"
              :title="soundEnabled ? 'Silenciar alertas sonoras' : 'Activar alertas sonoras'"
              :aria-label="soundEnabled ? 'Silenciar alertas sonoras' : 'Activar alertas sonoras'"
              class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-shell-notification-hover-bg focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring transition-colors"
              :class="soundEnabled ? 'text-shell-notification-text' : 'text-shell-notification-muted-text'"
            >
              <SpeakerWaveIcon v-if="soundEnabled" class="w-4 h-4" aria-hidden="true" />
              <SpeakerXMarkIcon v-else class="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              v-if="notifications.length > 0"
              @click="handleMarkAllRead"
              class="text-xs text-shell-notification-accent hover:text-shell-notification-text font-medium transition-colors whitespace-nowrap"
            >
              Marcar todo como leído
            </button>
          </div>
        </div>

        <!-- Loading state -->
        <div v-if="isLoading" class="flex items-center justify-center py-10">
          <div class="w-5 h-5 border-2 border-shell-notification-accent border-t-transparent rounded-full animate-spin" aria-label="Cargando notificaciones" />
        </div>

        <!-- Empty state -->
        <div v-else-if="notifications.length === 0" class="flex flex-col items-center justify-center py-10 px-4 gap-2">
          <BellIcon class="w-8 h-8 text-shell-notification-muted-text/40" aria-hidden="true" />
          <p class="text-sm text-shell-notification-muted-text text-center">Sin notificaciones nuevas</p>
        </div>

        <!-- Notification list -->
        <ul v-else class="max-h-80 overflow-y-auto divide-y divide-border">
          <li
            v-for="notification in notifications"
            :key="notification.id"
          >
            <NuxtLink
              :to="notificationDespachoPath(notification)"
              @click="(event) => handleNotificationClick(notification, event)"
              class="flex gap-3 px-4 py-3 hover:bg-shell-notification-hover-bg transition-colors"
            >
              <!-- Icon -->
              <div
                class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5"
                :class="notificationIconClass(notification)"
              >
                <BellAlertIcon
                  v-if="notificationIsComandaReady(notification)"
                  class="w-4 h-4 text-success"
                  aria-hidden="true"
                />
                <DocumentTextIcon
                  v-else-if="notificationIsTermsAcceptanceRequired(notification)"
                  class="w-4 h-4 text-shell-notification-accent"
                  aria-hidden="true"
                />
                <ShoppingBagIcon v-else class="w-4 h-4 text-shell-notification-accent" aria-hidden="true" />
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-shell-notification-text leading-snug">
                  {{ notificationDespachoTitle(notification) }}
                </p>
                <p class="text-xs text-shell-notification-muted-text mt-0.5">
                  {{ formatRelativeTime(notification.created_at) }}
                </p>
              </div>

              <!-- Unread dot -->
              <div
                v-if="!notification.read_at"
                class="flex-shrink-0 w-2 h-2 rounded-full bg-shell-notification-accent mt-1.5"
                aria-hidden="true"
              />
            </NuxtLink>
          </li>
        </ul>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { BellIcon, BellAlertIcon, DocumentTextIcon, ShoppingBagIcon, SpeakerWaveIcon, SpeakerXMarkIcon } from '@heroicons/vue/24/outline'
import { useNotifications, type Notification } from '~/composables/useNotifications'
import {
  notificationDespachoPath,
  notificationDespachoTitle,
  notificationIsComandaReady,
  notificationIsTermsAcceptanceRequired,
} from '~/composables/useNotificationDespachoLink'
import { useDespachoNotificationAudio } from '~/composables/useDespachoNotificationAudio'
import { useTableQrNotificationNavigation } from '~/composables/useTableQrNotificationNavigation'

const { notifications, unreadCount, init, markAsRead, markAllRead } = useNotifications()
const { enabled: soundEnabled, toggleEnabled, unlockFromGesture, prefetchBuffer } = useDespachoNotificationAudio()
const { handleDespachoNotificationClick } = useTableQrNotificationNavigation()

const isOpen = ref(false)
const isLoading = ref(false)
const containerRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)

const handleToggleSound = (event: MouseEvent) => {
  event.stopPropagation()
  unlockFromGesture()
  toggleEnabled()
}

const toggle = async (event: MouseEvent) => {
  triggerRef.value = event.currentTarget as HTMLButtonElement
  unlockFromGesture()
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

const handleNotificationClick = async (notification: Notification, event?: MouseEvent) => {
  await handleDespachoNotificationClick(notification, event, close)
}

const handleMarkAllRead = async () => {
  await markAllRead()
}

const notificationIconClass = (notification: Notification) => {
  if (notificationIsComandaReady(notification)) return 'bg-success/15'
  return 'bg-shell-notification-accent-bg'
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
  if (process.client) {
    prefetchBuffer()
    init()
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
