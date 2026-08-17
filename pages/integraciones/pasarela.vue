<template>
  <div class="flex flex-col gap-3 md:gap-4">
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <CommonsTheErrorState v-else-if="error" />

    <div v-else class="flex flex-col gap-3 md:gap-4">
      <div class="bg-status-info-bg border border-status-info-text/20 rounded-xl px-4 py-3 flex items-center gap-3">
        <svg class="w-4 h-4 text-status-info-text flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-xs text-status-info-text">{{ t('integraciones.pasarela.notFinanzas') }}</p>
      </div>

      <div class="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="text-base font-semibold text-text-primary">{{ t('integraciones.pasarela.statusTitle') }}</h2>
          <UiStatusBadge
            :value="statusBadgeLabel"
            :variant="statusBadgeVariant"
            size="sm"
          />
        </div>
        <dl v-if="status" class="grid gap-2 sm:grid-cols-2 text-sm">
          <div>
            <dt class="text-text-secondary">{{ t('integraciones.pasarela.fingerprint') }}</dt>
            <dd class="font-mono text-text-primary break-all">{{ status.fingerprint }}</dd>
          </div>
          <div>
            <dt class="text-text-secondary">{{ t('integraciones.pasarela.environment') }}</dt>
            <dd class="text-text-primary">{{ t(pasarelaEnvironmentLabelKey(status.environment)) }}</dd>
          </div>
        </dl>
        <p v-else class="text-sm text-text-secondary">{{ t('integraciones.pasarela.disconnectedHint') }}</p>
      </div>

      <div class="bg-surface border border-border rounded-xl p-4 flex flex-col gap-2">
        <h2 class="text-base font-semibold text-text-primary">{{ t('integraciones.pasarela.webhookUrl') }}</h2>
        <p class="text-xs text-text-secondary">{{ t('integraciones.pasarela.webhookHint') }}</p>
        <div class="flex items-start gap-2">
          <code class="flex-1 text-sm font-mono text-text-primary bg-surface-secondary px-3 py-2 rounded-lg break-all">{{ webhookUrl }}</code>
          <button
            type="button"
            class="flex-shrink-0 p-2 text-primary hover:text-primary-dark"
            :title="t('integraciones.copied')"
            @click="copyWebhookUrl"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>

      <form class="bg-surface border border-border rounded-xl p-4 flex flex-col gap-4" autocomplete="off" @submit.prevent="savePasarela">
        <div>
          <h2 class="text-base font-semibold text-text-primary">{{ t('integraciones.pasarela.formTitle') }}</h2>
          <p class="text-xs text-text-secondary mt-1">{{ t('integraciones.pasarela.rotateHint') }}</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-text-primary mb-1" for="pasarela-public-key">{{ t('integraciones.pasarela.publicKey') }}</label>
          <input
            id="pasarela-public-key"
            v-model="form.publicKey"
            type="text"
            required
            :disabled="saving"
            autocomplete="off"
            class="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-primary font-mono text-sm focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
          >
        </div>

        <div>
          <label class="block text-sm font-medium text-text-primary mb-1" for="pasarela-private-key">{{ t('integraciones.pasarela.privateKey') }}</label>
          <input
            id="pasarela-private-key"
            v-model="form.privateKey"
            type="password"
            required
            :disabled="saving"
            autocomplete="new-password"
            class="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-primary font-mono text-sm focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
          >
        </div>

        <div>
          <label class="block text-sm font-medium text-text-primary mb-1" for="pasarela-events-secret">{{ t('integraciones.pasarela.eventsSecret') }}</label>
          <input
            id="pasarela-events-secret"
            v-model="form.eventsSecret"
            type="password"
            required
            :disabled="saving"
            autocomplete="new-password"
            class="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-primary font-mono text-sm focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
          >
        </div>

        <div>
          <label class="block text-sm font-medium text-text-primary mb-1" for="pasarela-integrity-secret">{{ t('integraciones.pasarela.integritySecret') }}</label>
          <input
            id="pasarela-integrity-secret"
            v-model="form.integritySecret"
            type="password"
            :disabled="saving"
            autocomplete="new-password"
            class="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-primary font-mono text-sm focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
          >
        </div>

        <p v-if="saveError" class="text-sm text-error bg-red-50 p-3 rounded-lg">{{ saveError }}</p>

        <div class="flex justify-end">
          <button
            type="submit"
            class="btn-primary px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            :disabled="saving || !canSave"
          >
            {{ saving ? t('integraciones.pasarela.saving') : t('integraciones.pasarela.save') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  collectionsWebhookUrl,
  pasarelaEnvironmentLabelKey,
  type PasarelaStatus,
} from '~/utils/wompiCollections'

definePageMeta({ module: 'integraciones' })

const { t } = useI18n({ useScope: 'global' })
useHead({ title: () => t('integraciones.pasarela.pageTitle') })

const toast = useToast()
const config = useRuntimeConfig()
const { currentTenant } = useTenantReactive()

const form = reactive({
  publicKey: '',
  privateKey: '',
  eventsSecret: '',
  integritySecret: '',
})
const saving = ref(false)
const saveError = ref('')

const webhookUrl = computed(() => collectionsWebhookUrl(String(config.public.warolabsApiUrl || '')))

const {
  data: pasarelaResponse,
  asyncStatus: queryAsyncStatus,
  error: fetchError,
  refetch: refresh,
} = useQuery({
  key: () => ['integraciones-pasarela', currentTenant.value?.id],
  query: () => $fetch('/api/integraciones/pasarela'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const status = computed<PasarelaStatus | null>(() => pasarelaResponse.value?.data ?? null)
const isLoading = computed(() => !pasarelaResponse.value && !fetchError.value)
const isRefreshing = computed(() => queryAsyncStatus.value === 'loading' && pasarelaResponse.value != null)
const error = computed(() => fetchError.value ? t('integraciones.pasarela.loadError') : null)

const statusBadgeLabel = computed(() => {
  if (!status.value) return t('integraciones.pasarela.disconnected')
  if (status.value.isActive) return t('integraciones.pasarela.connected')
  return t('integraciones.pasarela.inactive')
})

const statusBadgeVariant = computed(() => {
  if (status.value?.isActive) return 'success'
  if (status.value) return 'warning'
  return 'secondary'
})

const canSave = computed(() =>
  form.publicKey.trim() && form.privateKey.trim() && form.eventsSecret.trim(),
)

const pasarelaErrorMessage = (err: any) => {
  const data = err?.data
  const detail = data?.detail
  if (typeof data?.message === 'string' && data.message) return data.message
  if (typeof detail === 'string' && detail) return detail
  if (detail && typeof detail.message === 'string') return detail.message
  return t('integraciones.pasarela.saveError')
}

const clearSecretFields = () => {
  form.publicKey = ''
  form.privateKey = ''
  form.eventsSecret = ''
  form.integritySecret = ''
}

const savePasarela = async () => {
  saving.value = true
  saveError.value = ''
  try {
    const body: Record<string, string> = {
      publicKey: form.publicKey.trim(),
      privateKey: form.privateKey.trim(),
      eventsSecret: form.eventsSecret.trim(),
    }
    const integrity = form.integritySecret.trim()
    if (integrity) body.integritySecret = integrity

    const response = await $fetch('/api/integraciones/pasarela/activate', {
      method: 'POST',
      body,
    })
    if (!response?.success) {
      saveError.value = response?.message || t('integraciones.pasarela.saveError')
      return
    }
    clearSecretFields()
    await refresh()
    toast.success(t('integraciones.pasarela.saved'))
  } catch (err: any) {
    saveError.value = pasarelaErrorMessage(err)
  } finally {
    saving.value = false
  }
}

const copyWebhookUrl = async () => {
  try {
    await navigator.clipboard.writeText(webhookUrl.value)
    toast.success(t('integraciones.copied'))
  } catch {
    toast.error(t('integraciones.copyError'))
  }
}

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
onMounted(() => { setRefreshHandler(refresh) })
registerProgressiveLoading(isRefreshing)
onUnmounted(() => { clearRefreshHandler(refresh) })
</script>
