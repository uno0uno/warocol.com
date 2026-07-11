<template>
  <div v-if="businessProfile" class="relative">
    <!-- Toggle button -->
    <button
      @click="openModal"
      :disabled="isUpdating"
      :aria-label="businessProfile.is_currently_open ? t('shell.businessOpenAria') : t('shell.businessClosedAria')"
      class="flex items-center gap-1.5 min-h-[44px] px-3 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
      :class="businessProfile.is_currently_open
        ? 'bg-status-success-bg border-status-success-text text-status-success-text hover:opacity-80'
        : 'bg-status-critical-bg border-status-critical-text text-status-critical-text hover:opacity-80'"
    >
      <!-- Status dot -->
      <span
        class="w-2 h-2 rounded-full flex-shrink-0"
        :class="businessProfile.is_currently_open ? 'bg-status-success-text animate-pulse' : 'bg-status-critical-text'"
        aria-hidden="true"
      />
      <span class="text-sm font-medium hidden sm:inline">
        {{ businessProfile.is_currently_open ? t('shell.businessOpen') : t('shell.businessClosed') }}
      </span>
      <!-- Spinner when updating -->
      <span
        v-if="isUpdating"
        class="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"
        aria-hidden="true"
      />
    </button>

    <!-- Confirmation modal -->
    <Teleport to="body">
      <div
        v-if="showModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="'modal-title-' + _uid"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-overlay-backdrop/50" @click="closeModal" />

        <!-- Dialog -->
        <div class="relative bg-surface border border-border rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
          <!-- Icon -->
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              :class="businessProfile.is_manually_open ? 'bg-destructive/10' : 'bg-success/10'"
            >
              <!-- Close icon -->
              <svg v-if="businessProfile.is_manually_open" class="w-5 h-5 text-destructive" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
              <!-- Open icon -->
              <svg v-else class="w-5 h-5 text-success" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <div>
              <h2 :id="'modal-title-' + _uid" class="text-base font-semibold text-text-primary">
                {{ businessProfile.is_manually_open ? 'Cerrar restaurante' : 'Abrir restaurante' }}
              </h2>
            </div>
          </div>

          <p class="text-sm text-text-secondary leading-relaxed">
            {{ businessProfile.is_manually_open
              ? 'Los clientes verán el restaurante como cerrado y no podrán hacer pedidos online.'
              : 'Los clientes podrán ver el restaurante abierto y hacer pedidos online.' }}
          </p>

          <!-- Actions -->
          <div class="flex gap-3 pt-1">
            <!-- Cancel (secondary) -->
            <button
              @click="closeModal"
              class="flex-1 min-h-[44px] px-4 py-2 text-sm font-medium rounded-lg border border-border text-text-secondary hover:bg-surface-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
            >
              Cancelar
            </button>
            <!-- Confirm (primary — destructive if closing) -->
            <button
              @click="confirmToggle"
              :disabled="isUpdating"
              class="flex-1 min-h-[44px] px-4 py-2 text-sm font-semibold rounded-lg text-primary-foreground transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
              :class="businessProfile.is_manually_open
                ? 'bg-destructive hover:bg-destructive/90 focus:ring-destructive'
                : 'bg-success hover:bg-success/90 focus:ring-success'"
            >
              <span v-if="isUpdating" class="flex items-center justify-center gap-2">
                <span class="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                Guardando...
              </span>
              <span v-else>
                {{ businessProfile.is_manually_open ? 'Sí, cerrar' : 'Sí, abrir' }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
import { getCurrentInstance } from 'vue'

const tenantsStore = useTenantsStore()
const toast = useToast()

const businessProfile = computed(() => tenantsStore.businessProfile)
const showModal = ref(false)
const isUpdating = ref(false)

// Unique ID for aria-labelledby (avoids conflicts if component mounts multiple times)
const _uid = getCurrentInstance()?.uid ?? 0

const openModal = () => { showModal.value = true }
const closeModal = () => { showModal.value = false }

const confirmToggle = async () => {
  if (!businessProfile.value || isUpdating.value) return
  isUpdating.value = true

  const newState = !businessProfile.value.is_manually_open

  try {
    await $fetch('/api/api/tenant/public-profile', {
      method: 'PATCH',
      body: { is_manually_open: newState },
    })
    await tenantsStore.fetchBusinessProfile()
    toast.success(
      newState ? 'El restaurante está abierto.' : 'El restaurante está cerrado.',
      { title: newState ? t('shell.businessOpen') : t('shell.businessClosed') }
    )
    closeModal()
  } catch {
    toast.error('No se pudo actualizar el estado. Inténtalo de nuevo.', { title: 'Error' })
  } finally {
    isUpdating.value = false
  }
}
</script>
