<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { CameraIcon, LanguageIcon, UserCircleIcon } from '@heroicons/vue/24/outline'
import {
  DEFAULT_APP_LOCALE,
  type AppLocaleCode,
} from '~/utils/appLocales'

definePageMeta({ layout: 'dashboard' })

const { t } = useI18n({ useScope: 'global' })
useHead({ title: () => t('perfil.head.title') })

const authStore = useAuthStore()
const tenantsStore = useTenantsStore()
const toast = useToast()
const {
  locale,
  resolvePreferredLocale,
  applyPersonalLocale,
  syncFromSources,
} = useAppLocale()
const showAvatarModal = ref(false)
const isSaving = ref(false)
const saveError = ref('')
const nameError = ref('')
const descriptionError = ref('')

const form = reactive<{ name: string, description: string, preferredLocale: AppLocaleCode }>({
  name: '',
  description: '',
  preferredLocale: DEFAULT_APP_LOCALE,
})
const persisted = reactive<{ name: string, description: string, preferredLocale: AppLocaleCode }>({
  name: '',
  description: '',
  preferredLocale: DEFAULT_APP_LOCALE,
})

const displayUser = computed(() => authStore.displayUser)
const initials = computed(() => {
  const parts = displayUser.value.name.trim().split(/\s+/).filter(Boolean)
  return parts.map(part => part[0]).join('').toUpperCase().slice(0, 2) || 'U'
})
const normalizedName = computed(() => form.name.trim())
const normalizedDescription = computed(() => form.description.trim())
const localeChanged = computed(() => form.preferredLocale !== persisted.preferredLocale)
const hasChanges = computed(() =>
  normalizedName.value !== persisted.name
  || normalizedDescription.value !== persisted.description
  || localeChanged.value,
)

const syncPersistedProfile = () => {
  const sessionUser = authStore.session?.user
  const name = (sessionUser?.name || sessionUser?.user_name || '').trim()
  const description = sessionUser?.description?.trim() || ''
  const preferredLocale = resolvePreferredLocale()
  form.name = name
  form.description = description
  form.preferredLocale = preferredLocale
  persisted.name = name
  persisted.description = description
  persisted.preferredLocale = preferredLocale
  saveError.value = ''
  nameError.value = ''
  descriptionError.value = ''
}

watch(
  () => [
    authStore.session?.user?.name,
    authStore.session?.user?.user_name,
    authStore.session?.user?.description,
    authStore.session?.user?.preferred_locale,
    tenantsStore.selectedTenant?.ui_locale,
  ],
  () => {
    if (!hasChanges.value) syncPersistedProfile()
  },
  { immediate: true },
)

const validate = () => {
  nameError.value = ''
  descriptionError.value = ''

  if (!normalizedName.value) nameError.value = t('perfil.validation.nameRequired')
  else if (normalizedName.value.length > 120) nameError.value = t('perfil.validation.nameTooLong')
  if (normalizedDescription.value.length > 500) {
    descriptionError.value = t('perfil.validation.descriptionTooLong')
  }

  return !nameError.value && !descriptionError.value
}

const {
  currentPhrase: savingPhraseKey,
  start: startSavingPhrases,
  stop: stopSavingPhrases,
} = useLoadingPhrases(['saving', 'updating', 'almostReady'])
const savingPhrase = computed(() => t(`perfil.savingPhrases.${savingPhraseKey.value}`))

watch(isSaving, (saving) => {
  if (saving) startSavingPhrases()
  else stopSavingPhrases()
})

const saveProfile = async () => {
  if (isSaving.value || !hasChanges.value || !validate()) return

  isSaving.value = true
  saveError.value = ''
  const shouldUpdateLocale = localeChanged.value
  const previousLocale = locale.value
  try {
    if (shouldUpdateLocale) await applyPersonalLocale(form.preferredLocale)

    const body: Record<string, string | null> = {
      name: normalizedName.value,
      description: normalizedDescription.value || null,
    }
    if (shouldUpdateLocale) body.preferred_locale = form.preferredLocale

    await $fetch('/api/auth/update-profile', {
      method: 'PUT',
      body,
    })
    await authStore.refreshSession()
    await syncFromSources()
    syncPersistedProfile()
    toast.success(t('perfil.feedback.saved'), { title: t('perfil.feedback.savedTitle') })
  } catch (error: any) {
    if (shouldUpdateLocale) {
      form.preferredLocale = persisted.preferredLocale
      await applyPersonalLocale(previousLocale).catch(() => undefined)
    }
    saveError.value = error?.data?.detail || error?.data?.message || t('perfil.feedback.saveError')
  } finally {
    isSaving.value = false
  }
}

const resetForm = () => {
  form.name = persisted.name
  form.description = persisted.description
  form.preferredLocale = persisted.preferredLocale
  saveError.value = ''
  nameError.value = ''
  descriptionError.value = ''
}

const handleAvatarUploaded = async (url: string) => {
  authStore.patchSessionUser({ logo_avatar: url })
  showAvatarModal.value = false
  try {
    await authStore.refreshSession()
    toast.success(t('perfil.feedback.avatarSaved'), { title: t('perfil.feedback.savedTitle') })
  } catch {
    toast.error(t('perfil.feedback.refreshError'), { title: t('common.error') })
  }
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-4 md:gap-6">
    <header class="space-y-1">
      <h1 class="text-2xl font-bold text-text-primary">{{ t('perfil.title') }}</h1>
      <p class="text-sm leading-relaxed text-text-secondary">{{ t('perfil.subtitle') }}</p>
    </header>

    <section class="rounded-xl border-2 border-border bg-surface p-4 sm:p-6" :aria-labelledby="'profile-photo-title'">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div class="h-24 w-24 flex-shrink-0 overflow-hidden rounded-full border-2 border-shell-account-avatar-border bg-shell-account-avatar-bg">
          <img
            v-if="displayUser.avatar"
            :src="displayUser.avatar"
            :alt="t('perfil.avatar.alt', { name: displayUser.name })"
            class="h-full w-full object-cover"
          />
          <div v-else class="flex h-full w-full items-center justify-center text-2xl font-bold text-shell-account-icon-text" aria-hidden="true">
            {{ initials }}
          </div>
        </div>
        <div class="min-w-0 flex-1">
          <h2 id="profile-photo-title" class="text-base font-semibold text-text-primary">{{ t('perfil.avatar.title') }}</h2>
          <p class="mt-1 text-xs leading-relaxed text-text-secondary">{{ t('perfil.avatar.help') }}</p>
          <button
            type="button"
            class="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border-2 border-form-control-border px-4 py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-primary/30"
            @click="showAvatarModal = true"
          >
            <CameraIcon class="h-4 w-4" aria-hidden="true" />
            {{ displayUser.avatar ? t('perfil.avatar.change') : t('perfil.avatar.add') }}
          </button>
        </div>
      </div>
    </section>

    <form class="rounded-xl border-2 border-border bg-surface p-4 sm:p-6" @submit.prevent="saveProfile">
      <div class="mb-5 flex items-center gap-2">
        <UserCircleIcon class="h-5 w-5 text-primary" aria-hidden="true" />
        <h2 class="text-base font-semibold text-text-primary">{{ t('perfil.personal.title') }}</h2>
      </div>

      <div class="space-y-5">
        <div>
          <label for="profile-name" class="mb-1.5 block text-sm font-semibold text-text-primary">{{ t('perfil.personal.name') }}</label>
          <input
            id="profile-name"
            v-model="form.name"
            type="text"
            maxlength="120"
            autocomplete="name"
            :aria-invalid="!!nameError"
            :aria-describedby="nameError ? 'profile-name-error' : 'profile-name-help'"
            class="input-base min-h-11 w-full px-3 py-2 text-sm"
            :placeholder="t('perfil.personal.namePlaceholder')"
            @blur="validate"
          />
          <p v-if="nameError" id="profile-name-error" class="mt-1 text-xs text-destructive" role="alert">{{ nameError }}</p>
          <p v-else id="profile-name-help" class="mt-1 text-xs text-text-secondary">{{ t('perfil.personal.nameHelp') }}</p>
        </div>

        <div>
          <div class="mb-1.5 flex items-center justify-between gap-3">
            <label for="profile-description" class="text-sm font-semibold text-text-primary">{{ t('perfil.personal.description') }}</label>
            <span class="text-xs text-text-tertiary" aria-hidden="true">{{ form.description.length }}/500</span>
          </div>
          <textarea
            id="profile-description"
            v-model="form.description"
            rows="5"
            maxlength="500"
            :aria-invalid="!!descriptionError"
            :aria-describedby="descriptionError ? 'profile-description-error' : 'profile-description-help'"
            class="input-base w-full resize-y px-3 py-2 text-sm"
            :placeholder="t('perfil.personal.descriptionPlaceholder')"
            @blur="validate"
          />
          <p v-if="descriptionError" id="profile-description-error" class="mt-1 text-xs text-destructive" role="alert">{{ descriptionError }}</p>
          <p v-else id="profile-description-help" class="mt-1 text-xs leading-relaxed text-text-secondary">{{ t('perfil.personal.publicHelp') }}</p>
        </div>

        <div>
          <div class="mb-1.5 flex items-center gap-2">
            <LanguageIcon class="h-4 w-4 text-primary" aria-hidden="true" />
            <label for="profile-language" class="text-sm font-semibold text-text-primary">{{ t('perfil.personal.language') }}</label>
          </div>
          <LocaleSelector
            id="profile-language"
            v-model="form.preferredLocale"
            :disabled="isSaving"
            class="w-full"
          />
          <p id="profile-language-help" class="mt-1 text-xs leading-relaxed text-text-secondary">
            {{ t('perfil.personal.languageHelp') }}
          </p>
        </div>

        <p v-if="saveError" class="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{{ saveError }}</p>

        <div class="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
          <span v-if="isSaving" class="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {{ t('perfil.actions.savingStable') }}
          </span>
          <button
            type="button"
            :disabled="!hasChanges || isSaving"
            class="min-h-11 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-colors hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-50"
            @click="resetForm"
          >
            {{ t('perfil.actions.discard') }}
          </button>
          <button
            type="submit"
            :disabled="!hasChanges || isSaving"
            class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-[220px]"
          >
            <span v-if="isSaving" class="flex items-center justify-center gap-2" aria-hidden="true">
              <UiLoadingDots size="8px" color="currentColor" aria-hidden="true" />
              <span class="whitespace-nowrap">{{ savingPhrase }}</span>
            </span>
            <span v-else>{{ t('perfil.actions.save') }}</span>
          </button>
        </div>
      </div>
    </form>

    <CommonsImageUploadModal
      v-if="showAvatarModal"
      image-type="avatar"
      upload-endpoint="/api/auth/profile/avatar"
      @upload="handleAvatarUploaded"
      @close="showAvatarModal = false"
    />
  </div>
</template>
