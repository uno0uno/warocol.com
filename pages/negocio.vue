<template>
  <div class="page-layout">

    <!-- Loading / Saving -->
    <div v-if="isBusinessProfileLoading || isSaving" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- ─── Main ─── -->
    <div v-else class="space-y-4 sm:space-y-6">

      <!-- ══════ PROFILE HERO ══════ -->
      <div class="bg-surface border-2 border-border rounded-xl overflow-hidden">

        <!-- Banner strip -->
        <div
          class="relative h-28 sm:h-36"
          :style="effectiveBannerStyle"
        >
          <div class="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent" />

          <!-- First-time setup hint -->
          <div v-if="!businessProfile && isEditMode" class="absolute inset-x-0 bottom-3 flex justify-center">
            <span class="text-white/90 text-xs font-medium drop-shadow bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">
              Completa tu perfil para que tus clientes te encuentren
            </span>
          </div>

          <!-- Edit / Save buttons — top-right of banner -->
          <div class="absolute top-3 right-3 flex items-center gap-2">
            <button
              v-if="!isEditMode"
              @click="enterEditMode"
              class="px-3 py-1.5 text-xs font-medium bg-white/80 backdrop-blur-sm text-text-primary border border-white/40 rounded-lg hover:bg-white transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <PencilSquareIcon class="w-3.5 h-3.5" />
              Editar perfil
            </button>
            <template v-else>
              <button
                @click="cancelEdit"
                class="px-3 py-1.5 text-xs font-medium bg-white/80 backdrop-blur-sm text-text-secondary border border-white/40 rounded-lg hover:bg-white transition-colors shadow-sm"
              >
                Cancelar
              </button>
              <button
                @click="saveChanges"
                :disabled="isSaving || !editForm.display_name.trim()"
                class="px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                <CheckIcon class="w-3.5 h-3.5" />
                Guardar
              </button>
            </template>
          </div>
        </div>

        <!-- Profile info row (overlaps banner) -->
        <div class="px-4 sm:px-6 pb-4 sm:pb-6">
          <div class="flex items-end gap-4 -mt-8 mb-4">
            <!-- Logo -->
            <div class="flex-shrink-0 relative">
              <!-- Con logo: imagen en caja redondeada -->
              <div
                v-if="logoSrc"
                class="w-16 h-16 sm:w-20 sm:h-20 rounded-xl border-4 border-background overflow-hidden shadow-sm"
              >
                <img :src="logoSrc" :alt="businessProfile?.display_name" class="w-full h-full object-cover" />
              </div>
              <!-- Sin logo: solo el ícono -->
              <BuildingStorefrontIcon v-else class="w-10 h-10 sm:w-12 sm:h-12 text-white drop-shadow mb-1" />
            </div>

            <!-- Name + badges (view mode) -->
            <div v-if="!isEditMode" class="flex-1 min-w-0 pb-1">
              <h1 class="text-lg sm:text-xl font-bold text-text-primary truncate">
                {{ businessProfile?.display_name }}
              </h1>
              <div class="flex items-center gap-2 mt-1 flex-wrap">
                <UiStatusBadge
                  :variant="isOpenNow ? 'success' : 'destructive'"
                  :value="isOpenNow ? 'Abierto' : 'Cerrado'"
                  format="text"
                />
                <UiStatusBadge
                  :variant="businessProfile?.is_active ? 'success' : 'warning'"
                  :value="businessProfile?.is_active ? 'Activo' : 'Oculto'"
                  format="text"
                />
              </div>
            </div>

            <!-- Name edit (edit mode) -->
            <div v-else class="flex-1 min-w-0 pb-1">
              <input
                v-model="editForm.display_name"
                type="text"
                class="input-base w-full px-3 py-2 text-base font-semibold"
                placeholder="Nombre del negocio"
              />
            </div>
          </div>

          <!-- Description (view) -->
          <p v-if="!isEditMode && businessProfile?.description" class="text-sm text-text-secondary leading-relaxed">
            {{ businessProfile.description }}
          </p>
          <p v-else-if="!isEditMode && !businessProfile?.description" class="text-sm text-text-secondary italic">
            Sin descripción
          </p>

          <!-- Edit fields: description + urls -->
          <div v-if="isEditMode" class="space-y-3 mt-3">
            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1">Descripción pública</label>
              <textarea
                v-model="editForm.description"
                class="input-base w-full px-3 py-2 text-sm"
                rows="2"
                placeholder="Breve descripción de tu negocio"
              />
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          </div>
        </div>
      </div>

      <!-- ══════ STATS STRIP ══════ -->
      <div v-if="businessProfile" class="grid grid-cols-3 divide-x divide-border bg-surface border-2 border-border rounded-xl overflow-hidden">
        <div class="px-3 sm:px-5 py-3 sm:py-4 text-center">
          <p class="text-[10px] sm:text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
            Tiempo prep.
          </p>
          <p class="text-base sm:text-lg font-bold text-text-primary">
            {{ businessProfile.estimated_preparation_time }} min
          </p>
        </div>
        <div class="px-3 sm:px-5 py-3 sm:py-4 text-center">
          <p class="text-[10px] sm:text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
            Pedido mínimo
          </p>
          <p class="text-base sm:text-lg font-bold text-text-primary">
            {{ formatCurrencyCompact(businessProfile.min_order_amount) }}
          </p>
        </div>
        <div class="px-3 sm:px-5 py-3 sm:py-4 flex flex-col items-center justify-center gap-1">
          <p class="text-[10px] sm:text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Pedidos online
          </p>
          <UiStatusBadge
            :variant="businessProfile.accepts_online_orders ? 'success' : 'secondary'"
            :value="businessProfile.accepts_online_orders ? 'Activos' : 'Inactivos'"
            format="text"
            size="sm"
          />
        </div>
      </div>

      <!-- ══════ CONTACTO ══════ -->
      <div class="bg-surface border-2 border-border rounded-xl p-4 sm:p-6">
        <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <MapPinIcon class="w-5 h-5 text-primary flex-shrink-0" />
          Contacto
        </h3>

        <!-- View -->
        <template v-if="!isEditMode">
          <div class="space-y-2.5">
            <div v-if="businessProfile?.address || businessProfile?.city" class="flex items-start gap-3">
              <MapPinIcon class="w-4 h-4 text-text-secondary flex-shrink-0 mt-0.5" />
              <span class="text-sm text-text-primary leading-snug">
                {{ [businessProfile?.address, businessProfile?.neighborhood, businessProfile?.city].filter(Boolean).join(', ') }}
              </span>
            </div>
            <div v-if="businessProfile?.phone_number" class="flex items-center gap-3">
              <PhoneIcon class="w-4 h-4 text-text-secondary flex-shrink-0" />
              <span class="text-sm text-text-primary">{{ businessProfile?.phone_number }}</span>
            </div>
            <div v-if="businessProfile?.email" class="flex items-center gap-3">
              <EnvelopeIcon class="w-4 h-4 text-text-secondary flex-shrink-0" />
              <span class="text-sm text-text-primary">{{ businessProfile?.email }}</span>
            </div>
            <p
              v-if="!businessProfile?.address && !businessProfile?.city && !businessProfile?.phone_number && !businessProfile?.email"
              class="text-sm text-text-secondary italic"
            >
              Sin información de contacto
            </p>
          </div>
        </template>

        <!-- Edit -->
        <template v-else>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="sm:col-span-2">
              <label class="block text-xs font-medium text-text-secondary mb-1">Dirección</label>
              <input v-model="editForm.address" type="text" class="input-base w-full px-3 py-2 text-sm" placeholder="Calle 123 # 45-67" />
            </div>
            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1">Barrio</label>
              <input v-model="editForm.neighborhood" type="text" class="input-base w-full px-3 py-2 text-sm" placeholder="Chapinero" />
            </div>
            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1">Ciudad</label>
              <input v-model="editForm.city" type="text" class="input-base w-full px-3 py-2 text-sm" placeholder="Bogotá" />
            </div>
            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1">Teléfono</label>
              <input v-model="editForm.phone_number" type="text" class="input-base w-full px-3 py-2 text-sm" placeholder="+57 300 000 0000" />
            </div>
            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1">Email</label>
              <input v-model="editForm.email" type="email" class="input-base w-full px-3 py-2 text-sm" placeholder="contacto@negocio.com" />
            </div>
          </div>
        </template>
      </div>

      <!-- ══════ HORARIO ══════ -->
      <div v-if="businessProfile?.business_hours || isEditMode" class="bg-surface border-2 border-border rounded-xl p-4 sm:p-6">
        <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <ClockIcon class="w-5 h-5 text-primary flex-shrink-0" />
          Horario
        </h3>

        <!-- View -->
        <template v-if="!isEditMode">
          <div class="space-y-0">
            <div
              v-for="(dayKey, index) in DAY_ORDER"
              :key="dayKey"
              class="flex items-center justify-between py-2 border-b border-border/40 last:border-0"
              :class="isToday(index) ? 'bg-primary/5 -mx-2 px-2 rounded-lg' : ''"
            >
              <div class="flex items-center gap-2">
                <span
                  class="text-sm w-24"
                  :class="isToday(index) ? 'font-semibold text-primary' : 'text-text-primary'"
                >
                  {{ DAY_LABELS[dayKey] }}
                </span>
                <span v-if="isToday(index)" class="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                  hoy
                </span>
              </div>
              <span
                class="text-sm"
                :class="businessProfile.business_hours?.[dayKey]?.closed
                  ? 'text-text-secondary'
                  : isToday(index) ? 'text-primary font-semibold' : 'text-text-primary'"
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

        <!-- Edit -->
        <template v-else>
          <div class="space-y-1">
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
              <div
                class="flex items-center gap-2 flex-1 min-w-0"
                :class="editForm.business_hours[dayKey].closed ? 'opacity-30 pointer-events-none' : ''"
              >
                <input
                  v-model="editForm.business_hours[dayKey].open"
                  type="time"
                  :disabled="editForm.business_hours[dayKey].closed"
                  class="input-base px-2 py-1.5 text-sm flex-1 min-w-0"
                />
                <span class="text-text-secondary text-sm flex-shrink-0">–</span>
                <input
                  v-model="editForm.business_hours[dayKey].close"
                  type="time"
                  :disabled="editForm.business_hours[dayKey].closed"
                  class="input-base px-2 py-1.5 text-sm flex-1 min-w-0"
                />
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- ══════ PEDIDOS EN LÍNEA ══════ -->
      <div class="bg-surface border-2 border-border rounded-xl p-4 sm:p-6">
        <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <ShoppingCartIcon class="w-5 h-5 text-primary flex-shrink-0" />
          Pedidos en línea
        </h3>

        <!-- View -->
        <template v-if="!isEditMode">
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-sm text-text-secondary">Estado de pedidos</span>
              <UiStatusBadge
                :variant="businessProfile?.accepts_online_orders ? 'success' : 'secondary'"
                :value="businessProfile?.accepts_online_orders ? 'Activos' : 'Desactivados'"
                format="text"
              />
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-text-secondary">Tiempo de preparación estimado</span>
              <span class="text-sm font-semibold text-text-primary">{{ businessProfile?.estimated_preparation_time }} min</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-text-secondary">Pedido mínimo</span>
              <span class="text-sm font-semibold text-text-primary">{{ formatCurrency(businessProfile?.min_order_amount ?? 0) }}</span>
            </div>
          </div>
        </template>

        <!-- Edit -->
        <template v-else>
          <div class="space-y-4">
            <div class="flex items-center justify-between py-1">
              <div>
                <p class="text-sm font-medium text-text-primary">Pedidos en línea</p>
                <p class="text-xs text-text-secondary mt-0.5">Permite pedidos desde la plataforma</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input v-model="editForm.accepts_online_orders" type="checkbox" class="sr-only peer" />
                <div class="w-10 h-6 bg-border rounded-full peer peer-checked:bg-primary peer-focus:ring-2 peer-focus:ring-primary/30 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
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

      <!-- ══════ REDES SOCIALES ══════ -->
      <div v-if="hasSocialMedia || isEditMode" class="bg-surface border-2 border-border rounded-xl p-4 sm:p-6 pb-safe">
        <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <GlobeAltIcon class="w-5 h-5 text-primary flex-shrink-0" />
          Redes sociales
        </h3>

        <!-- View -->
        <template v-if="!isEditMode">
          <div class="space-y-2.5">
            <div v-for="(value, key) in businessProfile.social_media" :key="key">
              <div v-if="value" class="flex items-center gap-3">
                <span class="text-xs font-medium text-text-secondary uppercase tracking-wide w-20 flex-shrink-0">{{ key }}</span>
                <span class="text-sm text-text-primary truncate">{{ value }}</span>
              </div>
            </div>
          </div>
        </template>

        <!-- Edit -->
        <template v-else>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1">Instagram</label>
              <input v-model="editForm.social_media.instagram" type="text" class="input-base w-full px-3 py-2 text-sm" placeholder="@usuario o URL" />
            </div>
            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1">WhatsApp</label>
              <input v-model="editForm.social_media.whatsapp" type="text" class="input-base w-full px-3 py-2 text-sm" placeholder="+57 300 000 0000" />
            </div>
            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1">Facebook</label>
              <input v-model="editForm.social_media.facebook" type="text" class="input-base w-full px-3 py-2 text-sm" placeholder="URL o nombre de página" />
            </div>
            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1">Twitter / X</label>
              <input v-model="editForm.social_media.twitter" type="text" class="input-base w-full px-3 py-2 text-sm" placeholder="@usuario" />
            </div>
            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1">TikTok</label>
              <input v-model="editForm.social_media.tiktok" type="text" class="input-base w-full px-3 py-2 text-sm" placeholder="@usuario" />
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

// ─── Edit state ───
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

// ─── Computed visuals ───
const logoSrc = computed(() => {
  if (isEditMode.value) return editForm.logo_url || null
  return businessProfile.value?.logo_url || null
})

const effectiveBannerStyle = computed(() => {
  const url = isEditMode.value ? editForm.banner_url : businessProfile.value?.banner_url
  if (url) return { backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
  return {}
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

const isToday = (i: number) => {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }))
  return DAY_ORDER[i] === DAY_NAMES_JS[d.getDay()]
}

const hasSocialMedia = computed(() => {
  const sm = businessProfile.value?.social_media
  return sm && Object.values(sm).some(v => !!v)
})

const formatCurrency = (value: number) => {
  if (!value) return '$0'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)
}

const formatCurrencyCompact = (value: number) => {
  if (!value) return '$0'
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}k`
  }
  return `$${value}`
}

// ─── Edit actions ───
const enterEditMode = () => {
  const bp = businessProfile.value  // may be null for first-time setup

  editForm.display_name = bp?.display_name || ''
  editForm.description = bp?.description || ''
  editForm.logo_url = bp?.logo_url || ''
  editForm.banner_url = bp?.banner_url || ''
  editForm.phone_number = bp?.phone_number || ''
  editForm.email = bp?.email || ''
  editForm.address = bp?.address || ''
  editForm.city = bp?.city || ''
  editForm.neighborhood = bp?.neighborhood || ''
  editForm.accepts_online_orders = bp?.accepts_online_orders ?? false
  editForm.min_order_amount = Number(bp?.min_order_amount) || 0
  editForm.estimated_preparation_time = bp?.estimated_preparation_time ?? 30

  editForm.business_hours = {}
  for (const day of DAY_ORDER) {
    const d = bp?.business_hours?.[day]
    editForm.business_hours[day] = {
      open: d?.open ?? '',
      close: d?.close ?? '',
      closed: d?.closed ?? false,
    }
  }

  const sm = bp?.social_media || {}
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
    const cleanedHours: Record<string, any> = {}
    for (const day of DAY_ORDER) {
      const d = editForm.business_hours[day]
      cleanedHours[day] = d.closed
        ? { closed: true }
        : { open: d.open, close: d.close, closed: false }
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
      social_media: {
        instagram: editForm.social_media.instagram || null,
        whatsapp: editForm.social_media.whatsapp || null,
        facebook: editForm.social_media.facebook || null,
        twitter: editForm.social_media.twitter || null,
        tiktok: editForm.social_media.tiktok || null,
      },
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

// ─── Auto-enter edit mode when no profile ───
watch(
  [isBusinessProfileLoading, businessProfile] as const,
  ([loading, profile]) => {
    if (!loading && !profile && !isEditMode.value) {
      enterEditMode()
    }
  },
  { immediate: true }
)

// ─── Refresh handler ───
const setRefreshHandler = inject('setRefreshHandler', () => {})
onMounted(() => {
  setRefreshHandler(() => tenantsStore.fetchBusinessProfile())
})
</script>
