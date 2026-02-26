<template>
  <Teleport to="body">
    <!-- Desktop: bottom-right stack -->
    <div
      class="hidden sm:flex fixed bottom-4 right-4 z-[60] flex-col-reverse gap-2 w-80"
      role="status"
      aria-live="polite"
      aria-label="Notificaciones de nuevos pedidos"
    >
      <TransitionGroup
        enter-active-class="transition duration-300 ease-out motion-reduce:transition-none"
        enter-from-class="translate-y-4 opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition duration-200 ease-in motion-reduce:transition-none"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="translate-y-4 opacity-0"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="relative rounded-xl bg-surface border border-border shadow-xl overflow-hidden"
        >
          <div class="absolute left-0 top-0 bottom-0 w-1 bg-warning rounded-l-xl" aria-hidden="true" />
          <NuxtLink
            :to="toast.notification.payload?.order_id
              ? `/domicilios/pedidos/${toast.notification.payload.order_id}`
              : '/domicilios/pedidos'"
            @click="dismiss(toast.id)"
            class="flex items-center gap-2 pl-4 pr-10 py-2.5"
          >
            <div class="flex-shrink-0 w-8 h-8 rounded-full bg-warning/15 flex items-center justify-center">
              <ShoppingBagIcon class="w-4 h-4 text-warning" aria-hidden="true" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold text-text-primary leading-snug">
                Nuevo pedido
                <span v-if="toast.notification.payload?.order_number">#{{ toast.notification.payload.order_number }}</span>
              </p>
              <p v-if="toast.notification.payload?.customer_name" class="text-xs text-muted-foreground truncate">
                {{ toast.notification.payload.customer_name }}
              </p>
              <p v-if="toast.notification.payload?.total_amount" class="text-xs font-medium text-text-primary">
                ${{ Number(toast.notification.payload.total_amount).toLocaleString('es-CO') }}
              </p>
            </div>
            <span class="flex-shrink-0 text-xs font-semibold text-warning-foreground bg-warning px-2 py-1 rounded-md">Ver</span>
          </NuxtLink>
          <button
            @click.stop="dismiss(toast.id)"
            :aria-label="`Cerrar notificación ${toast.notification.payload?.order_number ?? ''}`"
            class="absolute top-1 right-1 w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-secondary transition-colors"
          >
            <XMarkIcon class="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
          </button>
          <div class="h-0.5 bg-warning/20">
            <div class="h-full bg-warning toast-progress" :style="{ animationDuration: `${DISMISS_AFTER_MS}ms` }" />
          </div>
        </div>
      </TransitionGroup>
    </div>

    <!-- Mobile: bottom pill strip -->
    <div
      class="sm:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col-reverse gap-1.5 w-[calc(100%-2rem)]"
      role="status"
      aria-live="polite"
      aria-label="Notificaciones de nuevos pedidos"
    >
      <TransitionGroup
        enter-active-class="transition duration-250 ease-out motion-reduce:transition-none"
        enter-from-class="translate-y-3 opacity-0 scale-95"
        enter-to-class="translate-y-0 opacity-100 scale-100"
        leave-active-class="transition duration-150 ease-in motion-reduce:transition-none"
        leave-from-class="translate-y-0 opacity-100 scale-100"
        leave-to-class="translate-y-3 opacity-0 scale-95"
      >
        <NuxtLink
          v-for="toast in toasts"
          :key="toast.id"
          :to="toast.notification.payload?.order_id
            ? `/domicilios/pedidos/${toast.notification.payload.order_id}`
            : '/domicilios/pedidos'"
          @click="dismiss(toast.id)"
          class="flex items-center gap-2.5 px-3 py-2 rounded-full bg-surface/95 backdrop-blur border border-warning/30 shadow-lg overflow-hidden"
        >
          <div class="w-6 h-6 rounded-full bg-warning/15 flex items-center justify-center flex-shrink-0">
            <ShoppingBagIcon class="w-3.5 h-3.5 text-warning" aria-hidden="true" />
          </div>
          <span class="text-xs font-semibold text-text-primary truncate flex-1">
            Nuevo pedido
            <span v-if="toast.notification.payload?.order_number" class="text-warning">#{{ toast.notification.payload.order_number }}</span>
          </span>
          <span v-if="toast.notification.payload?.total_amount" class="text-xs text-muted-foreground flex-shrink-0">
            ${{ Number(toast.notification.payload.total_amount).toLocaleString('es-CO') }}
          </span>
          <button
            @click.stop="dismiss(toast.id)"
            :aria-label="`Cerrar notificación ${toast.notification.payload?.order_number ?? ''}`"
            class="w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0"
          >
            <XMarkIcon class="w-3 h-3 text-muted-foreground" aria-hidden="true" />
          </button>
        </NuxtLink>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { ShoppingBagIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { useNotifications, type Notification } from '~/composables/useNotifications'

interface MobileToast {
  id: number
  notification: Notification
  timer: ReturnType<typeof setTimeout>
}

const MAX_TOASTS = 3
const DISMISS_AFTER_MS = 8000

const { notifications, isTenantResetting } = useNotifications()
const toasts = ref<MobileToast[]>([])
let toastIdCounter = 0
let baselineCount = 0

const dismiss = (id: number) => {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index !== -1) {
    clearTimeout(toasts.value[index].timer)
    toasts.value.splice(index, 1)
  }
}

const addToast = (notification: Notification) => {
  // Cap at MAX_TOASTS — remove oldest if over limit
  if (toasts.value.length >= MAX_TOASTS) {
    const oldest = toasts.value[0]
    clearTimeout(oldest.timer)
    toasts.value.shift()
  }

  const id = ++toastIdCounter
  const timer = setTimeout(() => dismiss(id), DISMISS_AFTER_MS)
  toasts.value.push({ id, notification, timer })
}

onMounted(() => {
  // Set baseline so we don't toast notifications that already existed on load
  baselineCount = notifications.value.length

  watch(
    () => notifications.value.length,
    (newLen, oldLen) => {
      if (isTenantResetting.value) return // skip post-reset repopulation — not genuine new arrivals
      if (newLen > oldLen) {
        // One or more new notifications arrived — toast the newest ones
        const newNotifications = notifications.value.slice(0, newLen - oldLen)
        for (const n of newNotifications) {
          addToast(n)
        }
      }
    }
  )
})
</script>

<style scoped>
@keyframes toast-shrink {
  from { width: 100%; }
  to   { width: 0%; }
}

.toast-progress {
  animation: toast-shrink linear forwards;
}
</style>
