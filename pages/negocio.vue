<template>
  <div class="page-layout">
    <!-- Saving overlay -->
    <div
      v-if="isSaving"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-8 flex flex-col items-center">
        <CommonsTheCustomLoader size="large" />
        <p class="mt-4 text-lg font-semibold text-text-primary">Guardando cambios...</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isBusinessProfileLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- No Profile State -->
    <div
      v-else-if="!businessProfile"
      class="flex flex-col items-center justify-center min-h-[400px] gap-4 px-4"
    >
      <div class="w-16 h-16 rounded-full bg-surface border-2 border-border flex items-center justify-center">
        <BuildingStorefrontIcon class="w-8 h-8 text-text-secondary" />
      </div>
      <div class="text-center">
        <p class="text-base font-semibold text-text-primary">Sin perfil configurado</p>
        <p class="text-sm text-text-secondary mt-1">
          Este negocio aún no tiene un perfil público. Configúralo desde el panel de administración.
        </p>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else class="space-y-4 sm:space-y-6">

      <!-- Global edit toggle -->
      <div class="flex justify-end">
        <button
          v-if="!isEditMode"
          @click="enterEditMode"
          class="px-3 py-1.5 text-xs font-medium text-primary border border-primary rounded-lg hover:bg-primary/10 transition-colors flex items-center gap-1.5 min-h-[36px]"
        >
          <PencilSquareIcon class="w-4 h-4" />
          <span>Editar</span>
        </button>
        <div v-else class="flex items-center gap-2">
          <button
            @click="cancelEdit"
            class="px-3 py-1.5 text-xs font-medium text-text-secondary border border-border rounded-lg hover:bg-background transition-colors min-h-[36px]"
          >
            Cancelar
          </button>
          <button
            @click="saveChanges"
            :disabled="isSaving"
            class="px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5 min-h-[36px]"
          >
            <CheckIcon class="w-4 h-4" />
            <span>Guardar</span>
          </button>
        </div>
      </div>

      <!-- ─── Header: 3-column info card grid ─── -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">

        <!-- Card 1: Identidad -->
        <div class="bg-surface border-2 border-border rounded-lg p-4 sm:p-6">
          <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">Identidad</p>

          <!-- View mode -->
          <template v-if="!isEditMode">
            <div class="flex items-start gap-3">
              <div v-if="businessProfile.logo_url" class="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border border-border">
                <img :src="businessProfile.logo_url" :alt="businessProfile.display_name" class="w-full h-full object-cover" />
              </div>
              <div v-else class="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <BuildingStorefrontIcon class="w-7 h-7 text-primary" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-base font-semibold text-text-primary truncate">{{ businessProfile.display_name }}</p>
                <p v-if="businessProfile.description" class="text-sm text-text-secondary mt-1">
                  {{ businessProfile.description }}
                </p>
              </div>
            </div>
          </template>

          <!-- Edit mode -->
          <template v-else>
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-medium text-text-secondary mb-1">Nombre del negocio *</label>
                <input
                  v-model="editForm.display_name"
                  type="text"
                  class="input-base w-full px-3 py-2 text-sm"
                  placeholder="Nombre del negocio"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-text-secondary mb-1">Descripción</label>
                <textarea
                  v-model="editForm.description"
                  class="input-base w-full px-3 py-2 text-sm"
                  rows="3"
                  placeholder="Descripción pública del negocio"
                ></textarea>
              </div>
              <div>
                <label class="block text-xs font-medium text-text-secondary mb-1">URL del logo</label>
                <input
                  v-model="editForm.logo_url"
                  type="text"
                  class="input-base w-full px-3 py-2 text-sm"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-text-secondary mb-1">URL del banner</label>
                <input
                  v-model="editForm.banner_url"
                  type="text"
                  class="input-base w-full px-3 py-2 text-sm"
                  placeholder="https://..."
                />
              </div>
            </div>
          </template>
        </div>

        <!-- Card 2: Estado -->
        <div class="bg-surface border-2 border-border rounded-lg p-4 sm:p-6">
          <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">Estado</p>
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-sm text-text-secondary">Apertura</span>
              <UiStatusBadge
                :variant="isOpenNow ? 'success' : 'destructive'"
                :value="isOpenNow ? 'Abierto' : 'Cerrado'"
                format="text"
              />
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-text-secondary">Perfil público</span>
              <UiStatusBadge
                :variant="businessProfile.is_active ? 'success' : 'warning'"
                :value="businessProfile.is_active ? 'Activo' : 'Oculto'"
                format="text"
              />
            </div>
          </div>
        </div>

        <!-- Card 3: Operación (summary, view only) -->
        <div class="bg-surface border-2 border-border rounded-lg p-4 sm:p-6">
          <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">Operación</p>
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-sm text-text-secondary">Tiempo estimado</span>
              <span class="text-sm font-semibold text-text-primary">
                {{ isEditMode ? editForm.estimated_preparation_time : businessProfile.estimated_preparation_time }} min
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-text-secondary">Pedido mínimo</span>
              <span class="text-sm font-semibold text-text-primary">
                {{ formatCurrency(isEditMode ? editForm.min_order_amount : businessProfile.min_order_amount) }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-text-secondary">Pedidos en línea</span>
              <UiStatusBadge
                :variant="(isEditMode ? editForm.accepts_online_orders : businessProfile.accepts_online_orders) ? 'success' : 'secondary'"
                :value="(isEditMode ? editForm.accepts_online_orders : businessProfile.accepts_online_orders) ? 'Activos' : 'Inactivos'"
                format="text"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- ─── Contacto ─── -->
      <div class="bg-surface border-2 border-border rounded-lg p-4 sm:p-6">
        <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <MapPinIcon class="w-5 h-5 text-primary" />
          Contacto
        </h3>

        <!-- View mode -->
        <template v-if="!isEditMode">
          <div class="space-y-2">
            <div
              v-if="businessProfile.address || businessProfile.city"
              class="flex items-start gap-3"
            >
              <MapPinIcon class="w-4 h-4 text-text-secondary flex-shrink-0 mt-0.5" />
              <span class="text-sm text-text-primary">
                {{ [businessProfile.address, businessProfile.neighborhood, businessProfile.city].filter(Boolean).join(', ') }}
              </span>
            </div>
            <div v-if="businessProfile.phone_number" class="flex items-center gap-3">
              <PhoneIcon class="w-4 h-4 text-text-secondary flex-shrink-0" />
              <span class="text-sm text-text-primary">{{ businessProfile.phone_number }}</span>
            </div>
            <div v-if="businessProfile.email" class="flex items-center gap-3">
              <EnvelopeIcon class="w-4 h-4 text-text-secondary flex-shrink-0" />
              <span class="text-sm text-text-primary">{{ businessProfile.email }}</span>
            </div>
            <p
              v-if="!businessProfile.address && !businessProfile.city && !businessProfile.phone_number && !businessProfile.email"
              class="text-sm text-text-secondary italic"
            >
              Sin información de contacto configurada
            </p>
          </div>
        </template>

        <!-- Edit mode -->
        <template v-else>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1">Dirección</label>
              <input
                v-model="editForm.address"
                type="text"
                class="input-base w-full px-3 py-2 text-sm"
                placeholder="Calle 123 # 45-67"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1">Barrio</label>
              <input
                v-model="editForm.neighborhood"
                type="text"
                class="input-base w-full px-3 py-2 text-sm"
                placeholder="Chapinero"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1">Ciudad</label>
              <input
                v-model="editForm.city"
                type="text"
                class="input-base w-full px-3 py-2 text-sm"
                placeholder="Bogotá"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1">Teléfono</label>
              <input
                v-model="editForm.phone_number"
                type="text"
                class="input-base w-full px-3 py-2 text-sm"
                placeholder="+57 300 000 0000"
              />
            </div>
            <div class="sm:col-span-2">
              <label class="block text-xs font-medium text-text-secondary mb-1">Email</label>
              <input
                v-model="editForm.email"
                type="email"
                class="input-base w-full px-3 py-2 text-sm"
                placeholder="contacto@negocio.com"
              />
            </div>
          </div>
        </template>
      </div>

      <!-- ─── Horario ─── -->
      <div v-if="businessProfile.business_hours || isEditMode" class="bg-surface border-2 border-border rounded-lg p-4 sm:p-6">
        <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <ClockIcon class="w-5 h-5 text-primary" />
          Horario
        </h3>

        <!-- View mode -->
        <template v-if="!isEditMode">
          <div class="space-y-1.5">
            <div
              v-for="(dayKey, index) in DAY_ORDER"
              :key="dayKey"
              class="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0"
              :class="isToday(index) ? 'bg-primary/5 -mx-2 px-2 rounded-md' : ''"
            >
              <span
                class="text-sm w-28"
                :class="isToday(index) ? 'font-semibold text-primary' : 'text-text-primary'"
              >
                {{ DAY_LABELS[dayKey] }}
                <span v-if="isToday(index)" class="text-[10px] text-primary/60 ml-1">(hoy)</span>
              </span>
              <span
                class="text-sm"
                :class="businessProfile.business_hours?.[dayKey]?.closed
                  ? 'text-text-secondary'
                  : isToday(index) ? 'text-primary font-medium' : 'text-text-primary'"
              >
                <template v-if="!businessProfile.business_hours?.[dayKey] || businessProfile.business_hours?.[dayKey]?.closed">
                  Cerrado
                </template>
                <template v-else>
                  {{ businessProfile.business_hours[dayKey]?.open }} – {{ businessProfile.business_hours[dayKey]?.close }}
                </template>
              </span>
            </div>
          </div>
        </template>

        <!-- Edit mode -->
        <template v-else>
          <div class="space-y-2">
            <div
              v-for="(dayKey, index) in DAY_ORDER"
              :key="dayKey"
              class="flex items-center gap-3 py-2 border-b border-border/40 last:border-0"
            >
              <span
                class="text-sm w-24 flex-shrink-0"
                :class="isToday(index) ? 'font-semibold text-primary' : 'text-text-primary'"
              >
                {{ DAY_LABELS[dayKey] }}
              </span>
              <label class="flex items-center gap-1.5 cursor-pointer flex-shrink-0">
                <input
                  v-model="editForm.business_hours[dayKey].closed"
                  type="checkbox"
                  class="rounded border-border text-primary focus:ring-primary"
                />
                <span class="text-xs text-text-secondary">Cerrado</span>
              </label>
              <div class="flex items-center gap-2 flex-1" :class="editForm.business_hours[dayKey].closed ? 'opacity-40 pointer-events-none' : ''">
                <input
                  v-model="editForm.business_hours[dayKey].open"
                  type="time"
                  :disabled="editForm.business_hours[dayKey].closed"
                  class="input-base px-2 py-1.5 text-sm w-28"
                />
                <span class="text-text-secondary text-sm flex-shrink-0">–</span>
                <input
                  v-model="editForm.business_hours[dayKey].close"
                  type="time"
                  :disabled="editForm.business_hours[dayKey].closed"
                  class="input-base px-2 py-1.5 text-sm w-28"
                />
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- ─── Pedidos en línea ─── -->
      <div class="bg-surface border-2 border-border rounded-lg p-4 sm:p-6">
        <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <ShoppingCartIcon class="w-5 h-5 text-primary" />
          Pedidos en línea
        </h3>

        <!-- View mode -->
        <template v-if="!isEditMode">
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-sm text-text-secondary">Pedidos en línea</span>
              <UiStatusBadge
                :variant="businessProfile.accepts_online_orders ? 'success' : 'secondary'"
                :value="businessProfile.accepts_online_orders ? 'Activos' : 'Desactivados'"
                format="text"
              />
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-text-secondary">Tiempo de preparación estimado</span>
              <span class="text-sm font-semibold text-text-primary">{{ businessProfile.estimated_preparation_time }} min</span>
            </div>
            <div v-if="businessProfile.min_order_amount > 0" class="flex items-center justify-between">
              <span class="text-sm text-text-secondary">Pedido mínimo</span>
              <span class="text-sm font-semibold text-text-primary">{{ formatCurrency(businessProfile.min_order_amount) }}</span>
            </div>
          </div>
        </template>

        <!-- Edit mode -->
        <template v-else>
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-text-primary">Pedidos en línea</p>
                <p class="text-xs text-text-secondary">Permite a los clientes hacer pedidos en línea</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  v-model="editForm.accepts_online_orders"
                  type="checkbox"
                  class="sr-only peer"
                />
                <div class="w-10 h-6 bg-border peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-text-secondary mb-1">Tiempo de preparación (min)</label>
                <input
                  v-model.number="editForm.estimated_preparation_time"
                  type="number"
                  min="1"
                  step="5"
                  class="input-base w-full px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-text-secondary mb-1">Pedido mínimo (COP)</label>
                <input
                  v-model.number="editForm.min_order_amount"
                  type="number"
                  min="0"
                  step="1000"
                  class="input-base w-full px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- ─── Redes sociales ─── -->
      <div v-if="hasSocialMedia || isEditMode" class="bg-surface border-2 border-border rounded-lg p-4 sm:p-6">
        <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <GlobeAltIcon class="w-5 h-5 text-primary" />
          Redes sociales
        </h3>

        <!-- View mode -->
        <template v-if="!isEditMode">
          <div class="space-y-2">
            <div v-for="(value, key) in businessProfile.social_media" :key="key">
              <div v-if="value" class="flex items-center gap-3">
                <span class="text-sm text-text-secondary w-24 capitalize">{{ key }}</span>
                <span class="text-sm text-text-primary">{{ value }}</span>
              </div>
            </div>
          </div>
        </template>

        <!-- Edit mode -->
        <template v-else>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1">Instagram</label>
              <input
                v-model="editForm.social_media.instagram"
                type="text"
                class="input-base w-full px-3 py-2 text-sm"
                placeholder="@usuario o URL"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1">WhatsApp</label>
              <input
                v-model="editForm.social_media.whatsapp"
                type="text"
                class="input-base w-full px-3 py-2 text-sm"
                placeholder="+57 300 000 0000"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1">Facebook</label>
              <input
                v-model="editForm.social_media.facebook"
                type="text"
                class="input-base w-full px-3 py-2 text-sm"
                placeholder="URL o nombre de página"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1">Twitter / X</label>
              <input
                v-model="editForm.social_media.twitter"
                type="text"
                class="input-base w-full px-3 py-2 text-sm"
                placeholder="@usuario"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1">TikTok</label>
              <input
                v-model="editForm.social_media.tiktok"
                type="text"
                class="input-base w-full px-3 py-2 text-sm"
                placeholder="@usuario"
              />
            </div>
          </div>
        </template>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import {
  BuildingStorefrontIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  ClockIcon,
  ShoppingCartIcon,
  GlobeAltIcon,
  PencilSquareIcon,
  CheckIcon,
} from '@heroicons/vue/24/outline'

definePageMeta({ layout: 'dashboard' })
useHead({ title: 'Mi Negocio' })

const { businessProfile, isOpenNow } = useTenantReactive()
const tenantsStore = useTenantsStore()
const isBusinessProfileLoading = computed(() => tenantsStore.isBusinessProfileLoading)
const toast = useToast()

// ─── Edit mode state ───
const isEditMode = ref(false)
const isSaving = ref(false)

// ─── Edit form ───
const editForm = reactive({
  display_name: '',
  description: '',
  logo_url: '',
  banner_url: '',
  phone_number: '',
  email: '',
  address: '',
  city: '',
  neighborhood: '',
  accepts_online_orders: false,
  min_order_amount: 0,
  estimated_preparation_time: 30,
  business_hours: {} as Record<string, { open: string; close: string; closed: boolean }>,
  social_media: { instagram: '', whatsapp: '', facebook: '', twitter: '', tiktok: '' },
})

// ─── Constants ───
const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_LABELS: Record<string, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
}
const DAY_NAMES_JS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

const isToday = (dayOrderIndex: number) => {
  const bogotaDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }))
  return DAY_ORDER[dayOrderIndex] === DAY_NAMES_JS[bogotaDate.getDay()]
}

const hasSocialMedia = computed(() => {
  const sm = businessProfile.value?.social_media
  return sm && Object.values(sm).some(v => !!v)
})

const formatCurrency = (value: number) => {
  if (!value) return '$0'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}

// ─── Edit mode actions ───
const enterEditMode = () => {
  if (!businessProfile.value) return
  const bp = businessProfile.value

  editForm.display_name = bp.display_name || ''
  editForm.description = bp.description || ''
  editForm.logo_url = bp.logo_url || ''
  editForm.banner_url = bp.banner_url || ''
  editForm.phone_number = bp.phone_number || ''
  editForm.email = bp.email || ''
  editForm.address = bp.address || ''
  editForm.city = bp.city || ''
  editForm.neighborhood = bp.neighborhood || ''
  editForm.accepts_online_orders = bp.accepts_online_orders ?? false
  editForm.min_order_amount = Number(bp.min_order_amount) ?? 0
  editForm.estimated_preparation_time = bp.estimated_preparation_time ?? 30

  // Deep copy business_hours — guard missing open/close on closed days (e.g. Sunday)
  editForm.business_hours = {}
  for (const day of DAY_ORDER) {
    const d = bp.business_hours?.[day]
    editForm.business_hours[day] = {
      open: d?.open ?? '',
      close: d?.close ?? '',
      closed: d?.closed ?? false,
    }
  }

  // Deep copy social_media
  const sm = bp.social_media || {}
  editForm.social_media = {
    instagram: sm.instagram || '',
    whatsapp: sm.whatsapp || '',
    facebook: sm.facebook || '',
    twitter: sm.twitter || '',
    tiktok: sm.tiktok || '',
  }

  isEditMode.value = true
}

const cancelEdit = () => {
  isEditMode.value = false
}

const saveChanges = async () => {
  isSaving.value = true
  try {
    // Build clean business_hours — omit open/close when closed (matches DB shape)
    const cleanedHours: Record<string, any> = {}
    for (const day of DAY_ORDER) {
      const d = editForm.business_hours[day]
      cleanedHours[day] = d.closed
        ? { closed: true }
        : { open: d.open, close: d.close, closed: false }
    }

    // Build social_media — send empty strings as null (backend handles Optional)
    const cleanedSocialMedia = {
      instagram: editForm.social_media.instagram || null,
      whatsapp: editForm.social_media.whatsapp || null,
      facebook: editForm.social_media.facebook || null,
      twitter: editForm.social_media.twitter || null,
      tiktok: editForm.social_media.tiktok || null,
    }

    const payload = {
      display_name: editForm.display_name,
      description: editForm.description || null,
      logo_url: editForm.logo_url || null,
      banner_url: editForm.banner_url || null,
      phone_number: editForm.phone_number || null,
      email: editForm.email || null,
      address: editForm.address || null,
      city: editForm.city || null,
      neighborhood: editForm.neighborhood || null,
      accepts_online_orders: editForm.accepts_online_orders,
      min_order_amount: editForm.min_order_amount,
      estimated_preparation_time: editForm.estimated_preparation_time,
      business_hours: cleanedHours,
      social_media: cleanedSocialMedia,
    }

    await $fetch('/api/api/tenant/public-profile', { method: 'PATCH', body: payload })
    await tenantsStore.fetchBusinessProfile()
    isEditMode.value = false
    toast.success('Perfil actualizado exitosamente', { title: 'Guardado' })
  } catch (error: any) {
    toast.error(error.data?.detail || 'Error al guardar el perfil', { title: 'Error' })
  } finally {
    isSaving.value = false
  }
}

// ─── Refresh handler for dashboard layout ───
const setRefreshHandler = inject('setRefreshHandler', () => {})
onMounted(() => {
  setRefreshHandler(() => tenantsStore.fetchBusinessProfile())
})
</script>
