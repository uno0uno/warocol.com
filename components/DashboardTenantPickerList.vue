<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="px-4 py-3 flex-shrink-0">
      <div
        class="flex items-center gap-2 px-3 py-2 border-b border-form-control-border focus-within:border-form-control-focus-border transition-colors"
        role="search"
      >
        <MagnifyingGlassIcon class="w-4 h-4 text-form-control-placeholder flex-shrink-0" aria-hidden="true" />
        <input
          :id="searchId"
          ref="searchInputRef"
          v-model="tenantSearch"
          type="text"
          :placeholder="t('shell.searchTenants')"
          :aria-label="t('shell.searchTenants')"
          autocomplete="off"
          class="flex-1 bg-transparent text-sm text-form-control-text placeholder-form-control-placeholder outline-none"
        >
        <button
          v-if="tenantSearch"
          type="button"
          class="p-1 rounded-md text-form-control-placeholder hover:text-form-control-text focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring"
          :aria-label="t('shell.clearTenantSearch')"
          @click="tenantSearch = ''"
        >
          <XMarkIcon class="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div
      class="overflow-y-auto overscroll-y-contain px-3 pb-4 space-y-0.5 min-h-0 flex-1"
      role="listbox"
      :aria-label="t('shell.selectTenant')"
    >
      <div v-if="isLoadingTenants" class="px-3 py-3 text-sm text-form-control-help text-center">
        {{ t('shell.loadingTenants') }}
      </div>
      <template v-else>
        <div v-if="filteredTenants.length === 0" class="px-3 py-3 text-sm text-form-control-help text-center">
          {{ tenants.length === 0 ? t('shell.noTenants') : t('shell.noTenantResults') }}
        </div>
        <button
          v-for="tenant in filteredTenants"
          :id="`tenant-option-${tenant.id}`"
          :key="tenant.id"
          type="button"
          role="option"
          :aria-selected="selectedTenant?.id === tenant.id"
          :disabled="isLoadingTenants"
          class="w-full flex items-center gap-3 px-3 py-2.5 min-h-11 rounded-lg text-sm transition-colors text-start disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-shell-action-focus-ring"
          :class="selectedTenant?.id === tenant.id
            ? 'bg-shell-notification-accent-bg text-badge-primary-text font-medium'
            : 'text-shell-notification-muted-text hover:bg-shell-notification-hover-bg'"
          @click="emit('select', tenant)"
        >
          <span
            class="w-2 h-2 rounded-full flex-shrink-0"
            :class="selectedTenant?.id === tenant.id ? 'bg-shell-account-indicator-bg' : 'bg-primary/25'"
            aria-hidden="true"
          />
          <span class="truncate">{{ tenant.name }}</span>
          <CheckIcon
            v-if="selectedTenant?.id === tenant.id"
            class="w-4 h-4 ms-auto text-badge-primary-text flex-shrink-0"
            aria-hidden="true"
          />
        </button>
        <button
          v-if="isSuperuser"
          type="button"
          class="w-full flex items-center gap-3 px-3 py-2.5 mt-1 min-h-11 rounded-lg text-sm font-medium text-shell-notification-text hover:bg-shell-notification-hover-bg transition-colors text-start focus:outline-none focus:ring-2 focus:ring-inset focus:ring-shell-action-focus-ring"
          @click="emit('create')"
        >
          <PlusIcon class="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>{{ t('shell.createTenant') }}</span>
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { XMarkIcon, MagnifyingGlassIcon, CheckIcon, PlusIcon } from '@heroicons/vue/24/outline'
import type { Tenant } from '~/stores/tenants'
import { useAuthStore } from '~/stores/auth'

const emit = defineEmits<{
  select: [tenant: Tenant]
  create: []
}>()

const { t } = useI18n()
const searchId = useId()
const tenantSearch = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)

const tenantsStore = useTenantsStore()
const tenants = computed(() => tenantsStore.tenants)
const selectedTenant = computed(() => tenantsStore.selectedTenant)
const isLoadingTenants = computed(() => tenantsStore.isLoading)

const authStore = useAuthStore()
const isSuperuser = computed(() =>
  authStore.displayUser?.role === 'superuser' ||
  authStore.session?.user?.role === 'superuser'
)

const filteredTenants = computed(() => {
  const query = tenantSearch.value.trim().toLowerCase()
  if (!query) return tenants.value
  return tenants.value.filter((tenant: Tenant) => tenant.name.toLowerCase().includes(query))
})

const resetAndFocus = async () => {
  tenantSearch.value = ''
  await nextTick()
  searchInputRef.value?.focus()
}

defineExpose({ resetAndFocus })
</script>
