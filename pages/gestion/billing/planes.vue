<template>
  <div class="page-layout space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-text-primary">Gestión de Planes</h1>
      <button
        @click="openCreate"
        class="btn-primary px-4 py-2 rounded-lg text-sm font-semibold min-h-[44px] flex items-center gap-2"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Nuevo plan
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center min-h-[300px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-surface border border-border rounded-xl p-6 text-center">
      <p class="text-sm text-error mb-3">{{ error }}</p>
      <button @click="fetchAdminPlans" class="text-sm text-primary hover:underline">Reintentar</button>
    </div>

    <!-- Plan cards -->
    <div v-else class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="plan in plans"
        :key="plan.id"
        class="bg-surface border border-border rounded-xl p-5 space-y-4"
        :class="{ 'opacity-60': !plan.is_active }"
      >
        <div class="flex items-start justify-between gap-2">
          <div>
            <h2 class="text-base font-semibold text-text-primary">{{ plan.name }}</h2>
            <p class="text-xs text-text-secondary">{{ plan.slug }}</p>
          </div>
          <span
            class="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
            :class="plan.is_active ? 'bg-green-100 text-green-700' : 'bg-surface-secondary text-text-secondary'"
          >
            <span aria-hidden="true">●</span>
            {{ plan.is_active ? 'Activo' : 'Inactivo' }}
          </span>
        </div>

        <div class="space-y-1">
          <p class="text-sm text-text-secondary">
            <span class="font-medium text-text-primary">{{ formatCOP(plan.price_monthly) }}</span> / mes
          </p>
          <p class="text-sm text-text-secondary">
            <span class="font-medium text-text-primary">{{ formatCOP(plan.price_annual) }}</span> / año
          </p>
          <p class="text-sm text-text-secondary">
            <span class="font-medium text-text-primary">{{ plan.scan_limit.toLocaleString('es-CO') }}</span> escaneos / período
          </p>
        </div>

        <p v-if="plan.description" class="text-sm text-text-secondary leading-relaxed">{{ plan.description }}</p>

        <div class="flex gap-2 pt-1">
          <button
            @click="openEdit(plan)"
            class="flex-1 min-h-[40px] px-3 py-2 rounded-lg text-sm font-medium border border-border hover:bg-surface-secondary transition-colors focus:ring-2 focus:ring-primary/30"
          >
            Editar
          </button>
          <button
            v-if="plan.is_active"
            @click="confirmDeactivate(plan)"
            class="flex-1 min-h-[40px] px-3 py-2 rounded-lg text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors focus:ring-2 focus:ring-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="loading"
          >
            Desactivar
          </button>
        </div>
      </div>
    </div>

    <!-- Create / Edit modal -->
    <Teleport to="body">
      <div
        v-if="showForm"
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        @click.self="closeForm"
        role="dialog"
        aria-modal="true"
        :aria-label="editingPlan ? 'Editar plan' : 'Crear plan'"
      >
        <div class="bg-surface rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-5">
          <h2 class="text-lg font-semibold text-text-primary">
            {{ editingPlan ? 'Editar plan' : 'Nuevo plan' }}
          </h2>

          <form @submit.prevent="submitForm" class="space-y-4">
            <div class="flex flex-col gap-1">
              <label for="plan-name" class="text-sm font-medium text-text-primary">Nombre</label>
              <input
                id="plan-name"
                v-model="form.name"
                type="text"
                required
                placeholder="ej. Pro"
                class="input-base px-3 py-2 rounded-lg"
                @input="autoSlug"
              />
            </div>

            <div class="flex flex-col gap-1">
              <label for="plan-slug" class="text-sm font-medium text-text-primary">Slug</label>
              <input
                id="plan-slug"
                v-model="form.slug"
                type="text"
                required
                placeholder="ej. pro"
                class="input-base px-3 py-2 rounded-lg"
                :disabled="!!editingPlan"
              />
            </div>

            <div class="flex flex-col gap-1">
              <label for="plan-desc" class="text-sm font-medium text-text-primary">Descripción <span class="text-text-secondary font-normal">(opcional)</span></label>
              <textarea
                id="plan-desc"
                v-model="form.description"
                rows="2"
                class="input-base px-3 py-2 rounded-lg resize-none"
                placeholder="Descripción del plan"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col gap-1">
                <label for="plan-monthly" class="text-sm font-medium text-text-primary">Precio mensual (COP)</label>
                <input
                  id="plan-monthly"
                  v-model.number="form.price_monthly"
                  type="number"
                  required
                  min="0"
                  step="100"
                  class="input-base px-3 py-2 rounded-lg"
                />
                <p class="text-xs text-text-secondary">{{ formatCOP(form.price_monthly || 0) }}</p>
              </div>
              <div class="flex flex-col gap-1">
                <label for="plan-annual" class="text-sm font-medium text-text-primary">Precio anual (COP)</label>
                <input
                  id="plan-annual"
                  v-model.number="form.price_annual"
                  type="number"
                  required
                  min="0"
                  step="1000"
                  class="input-base px-3 py-2 rounded-lg"
                />
                <p class="text-xs text-text-secondary">{{ formatCOP(form.price_annual || 0) }}</p>
              </div>
            </div>

            <div class="flex flex-col gap-1">
              <label for="plan-scans" class="text-sm font-medium text-text-primary">Escaneos por período</label>
              <input
                id="plan-scans"
                v-model.number="form.scan_limit"
                type="number"
                required
                min="1"
                class="input-base px-3 py-2 rounded-lg"
              />
            </div>

            <div v-if="formError" class="flex items-center gap-2 text-sm text-error">
              <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {{ formError }}
            </div>

            <div class="flex gap-3 pt-2">
              <button
                type="button"
                @click="closeForm"
                class="flex-1 min-h-[44px] px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-surface-secondary transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                :disabled="loading"
                class="flex-1 min-h-[44px] px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span v-if="loading">Guardando...</span>
                <span v-else>{{ editingPlan ? 'Guardar cambios' : 'Crear plan' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { useAdminBilling } from '~/composables/useAdminBilling'
import type { BillingPlan } from '~/composables/useBilling'

definePageMeta({ layout: 'admin', middleware: 'admin-only' })
useHead({ title: 'Gestión de Planes — WaRo Admin' })

const { plans, loading, error, fetchAdminPlans, createPlan, updatePlan, deactivatePlan } = useAdminBilling()

// Form state
const showForm = ref(false)
const editingPlan = ref<BillingPlan | null>(null)
const formError = ref<string | null>(null)
const form = ref({
  name: '',
  slug: '',
  description: '',
  price_monthly: 0,
  price_annual: 0,
  scan_limit: 1000,
  features: {} as Record<string, unknown>,
})

const formatCOP = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)

const autoSlug = () => {
  if (!editingPlan.value) {
    form.value.slug = form.value.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  }
}

const openCreate = () => {
  editingPlan.value = null
  formError.value = null
  form.value = { name: '', slug: '', description: '', price_monthly: 0, price_annual: 0, scan_limit: 1000, features: {} }
  showForm.value = true
}

const openEdit = (plan: BillingPlan) => {
  editingPlan.value = plan
  formError.value = null
  form.value = {
    name: plan.name,
    slug: plan.slug,
    description: plan.description ?? '',
    price_monthly: plan.price_monthly,
    price_annual: plan.price_annual,
    scan_limit: plan.scan_limit,
    features: plan.features ?? {},
  }
  showForm.value = true
}

const closeForm = () => {
  showForm.value = false
  editingPlan.value = null
  formError.value = null
}

const submitForm = async () => {
  formError.value = null
  if (editingPlan.value) {
    const ok = await updatePlan(editingPlan.value.id, {
      name: form.value.name,
      description: form.value.description || null,
      price_monthly: form.value.price_monthly,
      price_annual: form.value.price_annual,
      scan_limit: form.value.scan_limit,
    })
    if (ok) closeForm()
    else formError.value = error.value
  } else {
    const result = await createPlan({
      name: form.value.name,
      slug: form.value.slug,
      description: form.value.description || null,
      price_monthly: form.value.price_monthly,
      price_annual: form.value.price_annual,
      scan_limit: form.value.scan_limit,
      features: form.value.features,
    })
    if (result) closeForm()
    else formError.value = error.value
  }
}

const confirmDeactivate = async (plan: BillingPlan) => {
  const confirmed = window.confirm(`¿Desactivar el plan "${plan.name}"? Los tenants existentes no serán afectados.`)
  if (!confirmed) return
  await deactivatePlan(plan.id)
}

onMounted(fetchAdminPlans)
</script>
