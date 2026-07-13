<script setup lang="ts">
/**
 * Per-table QR toggle, copy link, download PNG (warocol.com#711).
 */
const props = withDefaults(defineProps<{
  table: {
    id: string
    name: string
    qr_enabled?: boolean
    qr_public_token?: string | null
  }
  variant?: 'compact' | 'panel'
  showRegenerate?: boolean
  qrQuotaBlocked?: boolean
  qrQuotaMessage?: string
}>(), {
  variant: 'compact',
  showRegenerate: false,
  qrQuotaBlocked: false,
  qrQuotaMessage: '',
})

const emit = defineEmits<{
  updated: [table: Record<string, unknown>]
}>()

const toast = useToast()
const { buildTableQrUrl, copyTableQrLink, downloadTableQrPng } = useTableQrLink()

const isToggling = ref(false)
const isRegenerating = ref(false)
const showRegenerateConfirm = ref(false)

const publicUrl = computed(() => buildTableQrUrl(props.table.qr_public_token))
const hasToken = computed(() => !!props.table.qr_public_token)
const isActivationBlocked = computed(() => !props.table.qr_enabled && props.qrQuotaBlocked)
const quotaMessage = computed(() =>
  props.qrQuotaMessage || 'No tienes cupo disponible para activar QR en otra mesa.',
)

const isQuotaExceededError = (err: any) => {
  const detail = err?.data?.detail
  return err?.status === 429 ||
    err?.statusCode === 429 ||
    err?.data?.code === 'quota_exceeded' ||
    err?.data?.error === 'quota_exceeded' ||
    detail?.code === 'quota_exceeded' ||
    detail?.error === 'quota_exceeded'
}

const qrErrorMessage = (err: any, fallback: string) => {
  if (isQuotaExceededError(err)) return quotaMessage.value
  const detail = err?.data?.detail
  return typeof detail === 'string'
    ? detail
    : err?.data?.message || err?.message || fallback
}

const showQuotaBlocked = () => {
  toast.warning(quotaMessage.value, { title: 'Cupo de QR agotado' })
}

const toggleQr = async () => {
  if (isToggling.value) return
  const newEnabled = !props.table.qr_enabled

  if (newEnabled && isActivationBlocked.value) {
    showQuotaBlocked()
    return
  }

  isToggling.value = true
  try {
    const res = await $fetch<{ success: boolean; data: Record<string, unknown> }>(
      `/api/tables/${props.table.id}/qr`,
      { method: 'PATCH', body: { enabled: newEnabled } },
    )
    emit('updated', res.data)
    toast.success(
      newEnabled ? 'QR activado para esta mesa' : 'QR desactivado',
      { title: newEnabled ? 'Activado' : 'Desactivado' },
    )
  } catch (err: any) {
    toast.error(qrErrorMessage(err, 'Error al cambiar el QR'), { title: 'Error' })
  } finally {
    isToggling.value = false
  }
}

const regenerateToken = async () => {
  if (isRegenerating.value) return
  if (isActivationBlocked.value) {
    showQuotaBlocked()
    return
  }

  isRegenerating.value = true
  try {
    const res = await $fetch<{ success: boolean; data: Record<string, unknown> }>(
      `/api/tables/${props.table.id}/qr-token/regenerate`,
      { method: 'POST' },
    )
    emit('updated', res.data)
    showRegenerateConfirm.value = false
    toast.success('Enlace actualizado — imprime el QR de nuevo', { title: 'Token regenerado' })
  } catch (err: any) {
    toast.error(qrErrorMessage(err, 'No se pudo regenerar el enlace'), { title: 'Error' })
  } finally {
    isRegenerating.value = false
  }
}
</script>

<template>
  <div
    v-if="variant === 'panel'"
    class="rounded-xl border border-border bg-surface-secondary/40 p-4 space-y-3"
  >
    <div class="flex items-center justify-between gap-3">
      <div>
        <p class="text-sm font-semibold text-text-primary">Pedido por QR</p>
        <p class="text-xs text-text-secondary mt-0.5 leading-snug">
          El enlace es estable hasta que regeneres el token.
        </p>
      </div>
      <label
        class="relative inline-flex items-center cursor-pointer flex-shrink-0"
        :class="(isToggling || isActivationBlocked) ? 'opacity-50' : ''"
        :title="isActivationBlocked ? quotaMessage : undefined"
        @click="isActivationBlocked && showQuotaBlocked()"
      >
        <input
          type="checkbox"
          class="sr-only peer"
          :checked="!!table.qr_enabled"
          :disabled="isToggling || isActivationBlocked"
          @change="toggleQr"
        >
        <div
          class="w-10 h-6 bg-control-toggle-track-off rounded-full peer peer-checked:bg-control-toggle-track-on peer-focus:ring-2 peer-focus:ring-control-toggle-focus-ring after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-control-toggle-thumb after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"
        />
      </label>
    </div>

    <p
      v-if="isActivationBlocked"
      class="text-xs text-state-warning-text bg-state-warning-bg border border-state-warning-border rounded-lg px-3 py-2"
    >
      {{ quotaMessage }}
    </p>

    <div v-if="table.qr_enabled && hasToken" class="space-y-2">
      <label class="text-xs font-medium text-text-secondary">Enlace público</label>
      <input
        type="text"
        readonly
        :value="publicUrl || ''"
        class="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs text-text-secondary font-mono"
      >
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="h-9 px-3 rounded-lg border border-border text-xs font-semibold text-text-secondary hover:bg-surface transition-colors"
          @click="copyTableQrLink(table.qr_public_token)"
        >
          Copiar enlace
        </button>
        <button
          type="button"
          class="h-9 px-3 rounded-lg border border-border text-xs font-semibold text-text-secondary hover:bg-surface transition-colors"
          @click="downloadTableQrPng(table.qr_public_token, table.name)"
        >
          Descargar PNG
        </button>
        <button
          v-if="showRegenerate && !showRegenerateConfirm"
          type="button"
          class="h-9 px-3 rounded-lg border border-state-warning-border text-xs font-semibold text-state-warning-text hover:bg-state-warning-bg    transition-colors"
          @click="showRegenerateConfirm = true"
        >
          Regenerar enlace
        </button>
      </div>
      <div
        v-if="showRegenerate && showRegenerateConfirm"
        class="rounded-lg border border-state-warning-border bg-state-warning-bg p-3  "
      >
        <p class="text-xs text-state-warning-text  leading-relaxed">
          Los QR impresos dejarán de funcionar. ¿Continuar?
        </p>
        <div class="flex gap-2 mt-2">
          <button
            type="button"
            class="h-8 px-3 rounded-lg text-xs font-semibold border border-border"
            @click="showRegenerateConfirm = false"
          >
            Cancelar
          </button>
          <button
            type="button"
            :disabled="isRegenerating || isActivationBlocked"
            :title="isActivationBlocked ? quotaMessage : undefined"
            class="h-8 px-3 rounded-lg text-xs font-bold bg-action-warning-bg text-action-primary-text disabled:opacity-50"
            @click="regenerateToken"
          >
            {{ isRegenerating ? 'Regenerando…' : 'Sí, regenerar' }}
          </button>
        </div>
      </div>
    </div>

    <p v-else-if="table.qr_enabled && !hasToken" class="text-xs text-text-tertiary">
      Generando enlace… guarda de nuevo si no aparece.
    </p>
  </div>

  <div v-else class="flex flex-wrap items-center gap-1.5">
    <label
      class="relative inline-flex items-center cursor-pointer flex-shrink-0"
      :class="(isToggling || isActivationBlocked) ? 'opacity-50' : ''"
      :title="isActivationBlocked ? quotaMessage : (table.qr_enabled ? 'Desactivar QR' : 'Activar QR')"
      @click="isActivationBlocked && showQuotaBlocked()"
    >
      <input
        type="checkbox"
        class="sr-only peer"
        :checked="!!table.qr_enabled"
        :disabled="isToggling || isActivationBlocked"
        @change="toggleQr"
      >
      <div
        class="w-8 h-5 bg-control-toggle-track-off rounded-full peer peer-checked:bg-control-toggle-track-on after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-control-toggle-thumb after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-3"
      />
    </label>
    <button
      type="button"
      :disabled="!hasToken"
      class="flex items-center justify-center h-8 w-8 rounded-lg text-text-secondary hover:bg-surface-secondary disabled:opacity-30 disabled:cursor-not-allowed"
      title="Copiar enlace"
      @click="copyTableQrLink(table.qr_public_token)"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    </button>
    <button
      type="button"
      :disabled="!hasToken"
      class="flex items-center justify-center h-8 w-8 rounded-lg text-text-secondary hover:bg-surface-secondary disabled:opacity-30 disabled:cursor-not-allowed"
      title="Descargar QR"
      @click="downloadTableQrPng(table.qr_public_token, table.name)"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    </button>
  </div>
</template>
