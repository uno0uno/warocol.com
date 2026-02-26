<template>
  <Teleport to="body">
    <div
      class="fixed top-0 left-0 right-0 z-[60] flex flex-col gap-2"
      :style="{ paddingTop: 'env(safe-area-inset-top)' }"
      role="status"
      aria-live="polite"
      aria-label="Notificaciones de nuevos pedidos"
    >
      <TransitionGroup
        enter-active-class="transition duration-300 ease-out motion-reduce:transition-none"
        enter-from-class="-translate-y-full opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition duration-200 ease-in motion-reduce:transition-none"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="-translate-y-full opacity-0"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="relative mx-3 mt-2 rounded-2xl bg-surface border border-border shadow-xl overflow-hidden"
        >
          <!-- Left accent strip -->
          <div class="absolute left-0 top-0 bottom-0 w-1 bg-warning rounded-l-2xl" aria-hidden="true" />

          <NuxtLink
            :to="toast.notification.payload?.order_id
              ? `/domicilios/pedidos/${toast.notification.payload.order_id}`
              : '/domicilios/pedidos'"
            @click="dismiss(toast.id)"
            class="flex items-center gap-3 pl-5 pr-14 py-3"
          >
            <!-- Icon -->
            <div class="flex-shrink-0 w-10 h-10 rounded-full bg-warning/15 flex items-center justify-center">
              <ShoppingBagIcon class="w-5 h-5 text-warning" aria-hidden="true" />
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <p class="text-base font-bold text-text-primary leading-snug">
                Nuevo pedido
                <span v-if="toast.notification.payload?.order_number">
                  #{{ toast.notification.payload.order_number }}
                </span>
              </p>
              <p v-if="toast.notification.payload?.customer_name" class="text-sm text-muted-foreground leading-snug truncate">
                {{ toast.notification.payload.customer_name }}
              </p>
              <p v-if="toast.notification.payload?.total_amount" class="text-sm font-medium text-text-primary mt-0.5">
                ${{ Number(toast.notification.payload.total_amount).toLocaleString('es-CO') }}
              </p>
            </div>

            <!-- CTA button -->
            <span class="flex-shrink-0 text-sm font-semibold text-warning-foreground bg-warning px-3 py-1.5 rounded-lg">
              Ver
            </span>
          </NuxtLink>

          <!-- Dismiss button — 44×44px touch target -->
          <button
            @click.stop="dismiss(toast.id)"
            :aria-label="`Cerrar notificación pedido ${toast.notification.payload?.order_number ?? ''}`"
            class="absolute top-1 right-1 w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface-secondary transition-colors"
          >
            <XMarkIcon class="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          </button>

          <!-- Progress bar — shrinks over DISMISS_AFTER_MS -->
          <div class="h-0.5 bg-warning/20">
            <div
              class="h-full bg-warning toast-progress"
              :style="{ animationDuration: `${DISMISS_AFTER_MS}ms` }"
            />
          </div>
        </div>
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
