<template>
  <div class="px-6 py-6">

    <!-- Success state: new lead -->
    <div v-if="isSuccess && !isAlreadyRegistered" class="flex flex-col items-center gap-6 py-8 text-center">
      <div class="w-16 h-16 rounded-full bg-status-success-bg flex items-center justify-center ring-8 ring-status-success-bg/40">
        <Icon name="heroicons:check-circle" class="w-9 h-9 text-status-success-text" aria-hidden="true" />
      </div>
      <div class="flex flex-col gap-2">
        <p class="text-lg font-bold leading-tight text-ebony-900">¡Gracias por escribirnos!</p>
        <p class="text-sm leading-relaxed text-ebony-500 max-w-[240px] mx-auto">
          Recibimos tu mensaje. Nos pondremos en contacto contigo muy pronto.
        </p>
      </div>
      <button
        class="min-h-[44px] px-8 rounded-lg text-sm font-semibold text-crocus-700 bg-crocus-50
               hover:bg-crocus-100 focus:outline-none focus:ring-2 focus:ring-crocus-500
               transition-colors"
        @click="emit('close')"
      >
        Cerrar
      </button>
    </div>

    <!-- Success state: already registered -->
    <div v-else-if="isSuccess && isAlreadyRegistered" class="flex flex-col items-center gap-6 py-8 text-center">
      <div class="w-16 h-16 rounded-full bg-crocus-100 flex items-center justify-center ring-8 ring-crocus-100/40">
        <Icon name="heroicons:clock" class="w-9 h-9 text-crocus-600" aria-hidden="true" />
      </div>
      <div class="flex flex-col gap-2">
        <p class="text-lg font-bold leading-tight text-ebony-900">Ya tenemos tu solicitud</p>
        <p class="text-sm leading-relaxed text-ebony-500 max-w-[240px] mx-auto">
          Disculpa si enviaste el formulario más de una vez. Ya estás en nuestra lista y pronto te contactamos.
        </p>
      </div>
      <button
        class="min-h-[44px] px-8 rounded-lg text-sm font-semibold text-crocus-700 bg-crocus-50
               hover:bg-crocus-100 focus:outline-none focus:ring-2 focus:ring-crocus-500
               transition-colors"
        @click="emit('close')"
      >
        Entendido
      </button>
    </div>

    <!-- Form state -->
    <form v-else class="flex flex-col gap-5" @submit.prevent="handleSubmit">

      <!-- Email -->
      <div class="flex flex-col gap-1">
        <label for="lead-email" class="text-sm font-medium text-ebony-700">
          Correo electrónico <span class="text-destructive" aria-hidden="true">*</span>
        </label>
        <input
          id="lead-email"
          v-model="form.email"
          type="email"
          required
          autocomplete="email"
          placeholder="tu@correo.com"
          class="w-full px-3 py-2.5 text-base border border-titan-300 rounded-lg bg-white text-ebony-900
                 placeholder:text-titan-400 focus:outline-none focus:ring-2 focus:ring-crocus-500
                 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="isSubmitting"
        />
        <p v-if="errors.email" class="flex items-center gap-1 text-sm leading-normal text-destructive" role="alert">
          <Icon name="heroicons:exclamation-circle" class="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          {{ errors.email }}
        </p>
      </div>

      <!-- Phone -->
      <div class="flex flex-col gap-1">
        <label for="lead-phone" class="text-sm font-medium text-ebony-700">
          Teléfono <span class="text-destructive" aria-hidden="true">*</span>
        </label>
        <div class="flex">
          <span
            class="inline-flex items-center px-3 border border-e-0 border-titan-300 rounded-s-lg bg-titan-50
                   text-ebony-500 text-sm select-none"
            aria-label="Código de país Colombia"
          >
            🇨🇴 +57
          </span>
          <input
            id="lead-phone"
            v-model="form.phone"
            type="tel"
            required
            autocomplete="tel-national"
            placeholder="300 123 4567"
            inputmode="numeric"
            class="flex-1 px-3 py-2.5 text-base border border-titan-300 rounded-e-lg bg-white text-ebony-900
                   placeholder:text-titan-400 focus:outline-none focus:ring-2 focus:ring-crocus-500
                   disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="isSubmitting"
          />
        </div>
        <p v-if="errors.phone" class="flex items-center gap-1 text-sm leading-normal text-destructive" role="alert">
          <Icon name="heroicons:exclamation-circle" class="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          {{ errors.phone }}
        </p>
      </div>

      <!-- Submit -->
      <button
        type="submit"
        :disabled="isSubmitting"
        class="w-full min-h-[44px] py-2.5 px-4 rounded-lg font-semibold text-base text-white
               bg-crocus-600 hover:bg-crocus-700 active:scale-[0.98]
               focus:outline-none focus:ring-2 focus:ring-crocus-500 focus:ring-offset-2
               disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        <UiLoadingDots v-if="isSubmitting" color="currentColor" size="14px" aria-label="Enviando..." />
        <span v-else>Quiero saber más</span>
      </button>

    </form>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  buttonSource: string
}>()

const emit = defineEmits<{ close: [] }>()

const { error } = useToast()

const form = ref({ email: '', phone: '' })
const errors = ref({ email: '', phone: '' })
const isSubmitting = ref(false)
const isSuccess = ref(false)
const isAlreadyRegistered = ref(false)

function validate(): boolean {
  errors.value = { email: '', phone: '' }
  let valid = true

  if (!form.value.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    errors.value.email = 'Ingresa un correo electrónico válido'
    valid = false
  }

  const digits = form.value.phone.replace(/\D/g, '')
  if (digits.length < 7 || digits.length > 10) {
    errors.value.phone = 'Ingresa un número de teléfono válido (7-10 dígitos)'
    valid = false
  }

  return valid
}

async function handleSubmit() {
  if (!validate()) return

    isSubmitting.value = true
  try {
    const visitorKey = useCookie('waro_visitor_key').value?.trim()
    const body: Record<string, string> = {
      email: form.value.email.trim().toLowerCase(),
      phone: form.value.phone.replace(/\D/g, ''),
      button_source: props.buttonSource,
    }
    if (visitorKey) body.visitor_key = visitorKey
    const res = await $fetch<{ success: boolean; already_registered: boolean }>('/api/leads/capture', {
      method: 'POST',
      body,
    })

    isAlreadyRegistered.value = res.already_registered
    isSuccess.value = true
  } catch {
    error('Ocurrió un error. Por favor intenta de nuevo.')
  } finally {
    isSubmitting.value = false
  }
}
</script>
