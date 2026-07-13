<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-40 bg-black/40"
        aria-hidden="true"
        @click="close"
      />
    </Transition>

    <Transition name="panel">
      <div
        v-if="open"
        role="dialog"
        aria-modal="true"
        :aria-label="t('analitica.clientes.createNew')"
        class="fixed z-50 flex flex-col bg-surface shadow-2xl border-border
               inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
               md:inset-y-0 md:end-0 md:bottom-auto md:start-auto md:inset-x-auto md:rounded-none md:w-full md:max-w-md md:max-h-none md:h-full md:border-l"
      >
        <div class="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div class="w-10 h-1 rounded-full bg-border" aria-hidden="true" />
        </div>

        <div class="flex-shrink-0 bg-surface-secondary/40 border-b border-border px-6 py-4">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div
                class="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"
                aria-hidden="true"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
                </svg>
              </div>
              <div class="min-w-0">
                <h2 class="text-lg font-bold text-text-primary leading-tight">{{ t('analitica.clientes.createTitle') }}</h2>
                <p class="text-sm text-text-secondary mt-0.5">{{ t('analitica.clientes.createSubtitle') }}</p>
              </div>
            </div>
            <button
              type="button"
              :aria-label="t('common.close')"
              class="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors"
              @click="close"
            >
              <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div class="flex flex-col gap-1.5">
            <label for="create-phone" class="text-sm font-medium text-text-primary">
              {{ t('analitica.clientes.phone') }} <span class="text-red-600">*</span>
            </label>
            <input
              id="create-phone"
              v-model="form.phone_number"
              type="tel"
              placeholder="3001234567"
              autocomplete="tel"
              class="h-10 px-3 text-sm border-2 border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              :disabled="isSaving"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label for="create-name" class="text-sm font-medium text-text-primary">{{ t('analitica.clientes.name') }}</label>
            <input
              id="create-name"
              v-model="form.name"
              type="text"
              :placeholder="t('analitica.clientes.fullName')"
              autocomplete="name"
              class="h-10 px-3 text-sm border-2 border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              :disabled="isSaving"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label for="create-email" class="text-sm font-medium text-text-primary">{{ t('analitica.clientes.email') }}</label>
            <input
              id="create-email"
              v-model="form.email"
              type="email"
              placeholder="cliente@email.com"
              autocomplete="email"
              class="h-10 px-3 text-sm border-2 border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              :disabled="isSaving"
            />
          </div>
          <p v-if="apiError" role="alert" class="text-sm text-red-600">{{ apiError }}</p>
        </div>

        <div class="flex-shrink-0 border-t border-border px-6 py-4 flex items-center justify-end gap-3 bg-surface">
          <button
            type="button"
            @click="close"
            class="min-h-[44px] px-4 text-sm font-medium text-text-secondary border-2 border-border rounded-lg hover:bg-surface-secondary"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            :disabled="isSaving || !canSubmit"
            @click="handleSubmit"
            class="min-h-[44px] px-5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <UiLoadingDots v-if="isSaving" size="9px" />
            <span v-else>{{ t('analitica.clientes.createSubmit') }}</span>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { reactive, computed, watch, ref } from 'vue'

const { t } = useI18n({ useScope: 'global' })

interface CreatedCustomer {
  id: string
  name: string
  phone_number: string | null
}

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'created', customer: CreatedCustomer): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const form = reactive({ phone_number: '', name: '', email: '' })
const isSaving = ref(false)
const apiError = ref<string | null>(null)

watch(() => props.modelValue, (v) => {
  if (v) {
    form.phone_number = ''
    form.name = ''
    form.email = ''
    apiError.value = null
  }
})

const canSubmit = computed(() => form.phone_number.trim().length >= 7)

function close() {
  open.value = false
}

const handleSubmit = async () => {
  if (!canSubmit.value || isSaving.value) return
  isSaving.value = true
  apiError.value = null
  try {
    const response = await $fetch<{
      success: boolean
      data: { id: string; name: string; phone_number: string | null }
    }>('/api/customers/search-or-create', {
      method: 'POST',
      body: {
        phone_number: form.phone_number.trim(),
        name: form.name.trim() || null,
        email: form.email.trim() || null,
      },
    })
    if (response.success) {
      emit('created', {
        id: response.data.id,
        name: response.data.name,
        phone_number: response.data.phone_number,
      })
      close()
    }
  } catch (e: any) {
    apiError.value = e?.data?.detail || e?.message || t('analitica.clientes.createError')
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.panel-enter-active,
.panel-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(100%);
}
@media (min-width: 768px) {
  .panel-enter-from,
  .panel-leave-to {
    transform: translateX(100%);
  }
}
</style>
