<template>
  <div class="page-layout">

    <!-- Loading / Saving -->
    <div v-if="isBusinessProfileLoading || isSaving" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <CommonsTheErrorState v-else-if="profileError" />

    <!-- ─── Main ─── -->
    <div v-else class="space-y-4 sm:space-y-6">
      <!-- ══════ PROFILE HERO ══════ -->
      <div class="bg-surface border-2 border-border rounded-xl overflow-hidden">

        <!-- Banner strip -->
        <div
          class="relative h-32 sm:h-40"
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

          <!-- Logo — anchored to banner bottom, extends below via translate-y -->
          <div class="absolute bottom-0 left-4 sm:left-6 translate-y-1/2">
            <div
              v-if="logoSrc"
              class="w-16 h-16 sm:w-20 sm:h-20 rounded-xl border-4 border-background overflow-hidden shadow-md"
            >
              <img :src="logoSrc" :alt="businessProfile?.display_name" class="w-full h-full object-cover" />
            </div>
            <BuildingStorefrontIcon v-else class="w-12 h-12 sm:w-14 sm:h-14 text-white drop-shadow" />
          </div>
        </div>

        <!-- Profile info — pt clears the logo overlap -->
        <div class="px-4 sm:px-6 pb-4 sm:pb-6 pt-10 sm:pt-12">

          <!-- Name + badges (view mode) -->
          <div v-if="!isEditMode" class="mb-2">
            <h1 class="text-xl sm:text-2xl font-bold text-text-primary leading-tight">
              {{ businessProfile?.display_name }}
            </h1>
            <div class="flex items-center gap-2 mt-2 flex-wrap">
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

          <!-- Name input (edit mode) -->
          <div v-else class="mb-3">
            <input
              v-model="editForm.display_name"
              type="text"
              class="input-base w-full px-3 py-2 text-base font-semibold"
              placeholder="Nombre del negocio"
            />
          </div>

          <!-- Description (view) -->
          <p v-if="!isEditMode && businessProfile?.description" class="text-sm text-text-primary/80 leading-relaxed">
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
                <label class="block text-xs font-medium text-text-secondary mb-1">Logo</label>
                <button
                  type="button"
                  @click="openImageModal('logo')"
                  class="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-primary border-2 border-primary/30 border-dashed rounded-lg hover:bg-primary/5 hover:border-primary/60 transition-colors"
                  aria-label="Subir imagen de logo"
                >
                  <ArrowUpTrayIcon class="w-4 h-4" aria-hidden="true" />
                  {{ editForm.logo_url ? 'Cambiar logo' : 'Subir logo' }}
                </button>
              </div>
              <div>
                <label class="block text-xs font-medium text-text-secondary mb-1">Banner</label>
                <button
                  type="button"
                  @click="openImageModal('banner')"
                  class="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-primary border-2 border-primary/30 border-dashed rounded-lg hover:bg-primary/5 hover:border-primary/60 transition-colors"
                  aria-label="Subir imagen de banner"
                >
                  <ArrowUpTrayIcon class="w-4 h-4" aria-hidden="true" />
                  {{ editForm.banner_url ? 'Cambiar banner' : 'Subir banner' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ══════ DIRECTORIO TOGGLE ══════ -->
      <div
        v-if="businessProfile && !isEditMode"
        class="flex items-center justify-between gap-4 rounded-xl border-2 px-4 py-3 transition-colors"
        :class="businessProfile.is_active
          ? 'border-border bg-surface'
          : 'border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/20'"
      >
        <div class="min-w-0">
          <p
            class="text-sm font-semibold leading-snug"
            :class="businessProfile.is_active ? 'text-text-primary' : 'text-amber-800 dark:text-amber-300'"
          >
            {{ businessProfile.is_active ? 'Visible en el directorio' : 'Tu negocio está oculto' }}
          </p>
          <p
            class="text-xs mt-0.5 leading-snug"
            :class="businessProfile.is_active ? 'text-text-secondary' : 'text-amber-700 dark:text-amber-400'"
          >
            {{ businessProfile.is_active ? 'Aparece en warocol.com/bogota' : 'Actívalo para aparecer en el directorio de WaRo Colombia' }}
          </p>
        </div>
        <label
          class="relative inline-flex items-center cursor-pointer flex-shrink-0"
          :class="isTogglingActive ? 'opacity-50 pointer-events-none' : ''"
          :aria-label="businessProfile.is_active ? 'Desactivar visibilidad en el directorio' : 'Activar visibilidad en el directorio'"
        >
          <input
            type="checkbox"
            class="sr-only peer"
            :checked="businessProfile.is_active"
            @change="toggleActive"
            :disabled="isTogglingActive"
          />
          <div class="w-10 h-6 bg-border rounded-full peer peer-checked:bg-primary peer-focus:ring-2 peer-focus:ring-primary/30 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
        </label>
      </div>

      <!-- ══════ STATS STRIP ══════ -->
      <div v-if="businessProfile" class="grid grid-cols-3 divide-x divide-border bg-surface border-2 border-border rounded-xl overflow-hidden">
        <div class="px-3 sm:px-5 py-3 sm:py-4 flex flex-col justify-between text-left sm:text-center">
          <p class="text-[10px] sm:text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
            Tiempo prep.
          </p>
          <p class="text-base sm:text-lg font-bold text-text-primary">
            {{ businessProfile.estimated_preparation_time }} min
          </p>
        </div>
        <div class="px-3 sm:px-5 py-3 sm:py-4 flex flex-col justify-between text-left sm:text-center">
          <p class="text-[10px] sm:text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
            Pedido mínimo
          </p>
          <p class="text-base sm:text-lg font-bold text-text-primary">
            {{ formatCurrencyCompact(businessProfile.min_order_amount) }}
          </p>
        </div>
        <div class="px-3 sm:px-5 py-3 sm:py-4 flex flex-col justify-between items-start sm:items-center text-left sm:text-center">
          <p class="text-[10px] sm:text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
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

      <!-- ══════ CONFIGURACIÓN FISCAL ══════ -->
      <div class="bg-surface border-2 border-border rounded-xl p-4 sm:p-6">
        <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <ReceiptPercentIcon class="w-5 h-5 text-primary flex-shrink-0" />
          Configuración fiscal
        </h3>

        <div class="space-y-5">

          <!-- INC -->
          <div class="space-y-3">
            <div class="flex items-center justify-between py-1">
              <div>
                <p class="text-sm font-medium text-text-primary">INC — Impoconsumo 8%</p>
                <p class="text-xs text-text-secondary mt-0.5">Restaurantes y bares sin franquicia (Art. 512-1 ET)</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-4">
                <input v-model="taxForm.inc_applicable" type="checkbox" class="sr-only peer" />
                <div class="w-10 h-6 bg-border rounded-full peer peer-checked:bg-primary peer-focus:ring-2 peer-focus:ring-primary/30 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
              </label>
            </div>
            <div v-if="taxForm.inc_applicable" class="grid grid-cols-2 gap-2 mt-1" role="group" aria-label="Cómo aplicar el INC">
              <button
                type="button"
                @click="taxForm.inc_included_in_price = true"
                :class="[
                  'flex flex-col items-start gap-1.5 py-3 px-3 rounded-xl border-2 transition-all focus:outline-none text-left',
                  taxForm.inc_included_in_price
                    ? 'border-primary bg-primary/8 text-primary shadow-md shadow-primary/10'
                    : 'border-border bg-background text-text-tertiary hover:border-primary/30 hover:text-text-secondary hover:bg-surface-secondary/60'
                ]"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M7 7h10M7 12h10M7 17h6" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 6a1 1 0 011-1h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6z" />
                </svg>
                <span class="text-xs font-bold leading-tight">Incluido en el precio</span>
                <span :class="['text-[10px] leading-snug', taxForm.inc_included_in_price ? 'text-primary/80' : 'text-text-tertiary']">El 8% ya está dentro del precio. Ej: $10.800 → base $10.000 + INC $800</span>
              </button>
              <button
                type="button"
                @click="taxForm.inc_included_in_price = false"
                :class="[
                  'flex flex-col items-start gap-1.5 py-3 px-3 rounded-xl border-2 transition-all focus:outline-none text-left',
                  !taxForm.inc_included_in_price
                    ? 'border-primary bg-primary/8 text-primary shadow-md shadow-primary/10'
                    : 'border-border bg-background text-text-tertiary hover:border-primary/30 hover:text-text-secondary hover:bg-surface-secondary/60'
                ]"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span class="text-xs font-bold leading-tight">Se suma al precio</span>
                <span :class="['text-[10px] leading-snug', !taxForm.inc_included_in_price ? 'text-primary/80' : 'text-text-tertiary']">El 8% se agrega encima. Ej: $10.000 base → cobro $10.800</span>
              </button>
            </div>
          </div>

          <div class="border-t border-border/40" />

          <!-- IVA -->
          <div class="space-y-3">
            <div class="flex items-center justify-between py-1">
              <div>
                <p class="text-sm font-medium text-text-primary">IVA — 19%</p>
                <p class="text-xs text-text-secondary mt-0.5">Solo para establecimientos bajo franquicia (Form. DIAN 300)</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-4">
                <input v-model="taxForm.iva_applicable" type="checkbox" class="sr-only peer" />
                <div class="w-10 h-6 bg-border rounded-full peer peer-checked:bg-primary peer-focus:ring-2 peer-focus:ring-primary/30 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
              </label>
            </div>
            <div v-if="taxForm.iva_applicable" class="grid grid-cols-2 gap-2 mt-1" role="group" aria-label="Cómo aplicar el IVA">
              <button
                type="button"
                @click="taxForm.iva_included_in_price = true"
                :class="[
                  'flex flex-col items-start gap-1.5 py-3 px-3 rounded-xl border-2 transition-all focus:outline-none text-left',
                  taxForm.iva_included_in_price
                    ? 'border-primary bg-primary/8 text-primary shadow-md shadow-primary/10'
                    : 'border-border bg-background text-text-tertiary hover:border-primary/30 hover:text-text-secondary hover:bg-surface-secondary/60'
                ]"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M7 7h10M7 12h10M7 17h6" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 6a1 1 0 011-1h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6z" />
                </svg>
                <span class="text-xs font-bold leading-tight">Incluido en el precio</span>
                <span :class="['text-[10px] leading-snug', taxForm.iva_included_in_price ? 'text-primary/80' : 'text-text-tertiary']">El 19% ya está dentro del precio. Ej: $11.900 → base $10.000 + IVA $1.900</span>
              </button>
              <button
                type="button"
                @click="taxForm.iva_included_in_price = false"
                :class="[
                  'flex flex-col items-start gap-1.5 py-3 px-3 rounded-xl border-2 transition-all focus:outline-none text-left',
                  !taxForm.iva_included_in_price
                    ? 'border-primary bg-primary/8 text-primary shadow-md shadow-primary/10'
                    : 'border-border bg-background text-text-tertiary hover:border-primary/30 hover:text-text-secondary hover:bg-surface-secondary/60'
                ]"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span class="text-xs font-bold leading-tight">Se suma al precio</span>
                <span :class="['text-[10px] leading-snug', !taxForm.iva_included_in_price ? 'text-primary/80' : 'text-text-tertiary']">El 19% se agrega encima. Ej: $10.000 base → cobro $11.900</span>
              </button>
            </div>
          </div>

          <div class="border-t border-border/40" />

          <!-- IVA Licores -->
          <div class="flex items-center justify-between py-1">
            <div>
              <p class="text-sm font-medium text-text-primary">IVA Licores para llevar — 5%</p>
              <p class="text-xs text-text-secondary mt-0.5">Si vendés botellas o licores para llevar (siempre se suma al precio base)</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-4">
              <input v-model="taxForm.liquor_tax_applicable" type="checkbox" class="sr-only peer" />
              <div class="w-10 h-6 bg-border rounded-full peer peer-checked:bg-primary peer-focus:ring-2 peer-focus:ring-primary/30 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
            </label>
          </div>

        </div>

        <!-- Save button -->
        <div class="mt-5 flex justify-end">
          <button
            @click="saveTaxConfig"
            :disabled="isSavingTax"
            class="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-h-[44px]"
          >
            <CheckIcon v-if="!isSavingTax" class="w-4 h-4" aria-hidden="true" />
            <span>{{ isSavingTax ? 'Guardando...' : 'Guardar configuración' }}</span>
          </button>
        </div>
      </div>

      <!-- ══════ COMANDAS Y COCINA — TOGGLES ══════ -->
      <div class="bg-surface border-2 border-border rounded-xl p-4 sm:p-6">
        <div class="flex items-center gap-2 mb-5">
          <FireIcon class="w-5 h-5 text-primary flex-shrink-0" />
          <h3 class="text-base sm:text-lg font-semibold text-text-primary">Comandas y Cocina</h3>
        </div>

        <div class="space-y-5">
          <!-- Activar comandas -->
          <div class="space-y-2">
            <div class="flex items-center justify-between py-1">
              <div>
                <p class="text-sm font-medium text-text-primary">Activar comandas</p>
                <p class="text-xs text-text-secondary mt-0.5">
                  Al vender un producto se genera una comanda para cada estación de preparación configurada.
                </p>
              </div>
              <label
                class="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-4"
                :class="{ 'opacity-50 pointer-events-none': isTogglingComandas }"
              >
                <input
                  type="checkbox"
                  class="sr-only peer"
                  :checked="businessProfile?.comandas_enabled"
                  @change="handleToggleComandas"
                  :disabled="isTogglingComandas"
                />
                <div class="w-10 h-6 bg-border rounded-full peer peer-checked:bg-primary peer-focus:ring-2 peer-focus:ring-primary/30 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
              </label>
            </div>
            <!-- Inline disable-warning banner -->
            <div v-if="showDisableComandasWarning" class="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-start justify-between gap-3">
              <p class="text-xs text-amber-800 leading-relaxed">
                Las comandas activas no serán afectadas. Los nuevos pedidos no generarán comandas mientras esté desactivado.
              </p>
              <div class="flex items-center gap-2 flex-shrink-0">
                <button @click="showDisableComandasWarning = false" class="text-xs text-amber-700 font-medium hover:underline">Cancelar</button>
                <button
                  @click="confirmDisableComandas"
                  class="text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 px-3 py-1 rounded-lg transition-colors min-h-[32px]"
                >
                  Sí, desactivar
                </button>
              </div>
            </div>
          </div>

          <div class="border-t border-border/40" />

          <!-- Activar KDS (only when comandas ON) -->
          <div v-if="businessProfile?.comandas_enabled" class="space-y-2">
            <div class="flex items-center justify-between py-1">
              <div>
                <p class="text-sm font-medium text-text-primary">Activar pantallas KDS</p>
                <p class="text-xs text-text-secondary mt-0.5">
                  Habilita rutas <span class="font-mono text-[11px]">/cocina/[estacion]</span> para pantallas de cocina independientes.
                </p>
              </div>
              <label
                class="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-4"
                :class="{ 'opacity-50 pointer-events-none': isTogglingKds }"
              >
                <input
                  type="checkbox"
                  class="sr-only peer"
                  :checked="businessProfile?.kds_enabled"
                  @change="handleToggleKds"
                  :disabled="isTogglingKds"
                />
                <div class="w-10 h-6 bg-border rounded-full peer peer-checked:bg-primary peer-focus:ring-2 peer-focus:ring-primary/30 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
              </label>
            </div>
            <!-- KDS station URLs (when KDS enabled) -->
            <div v-if="businessProfile?.kds_enabled" class="mt-2 space-y-1.5">
              <div
                v-for="st in stations.filter((s: any) => s.is_active)"
                :key="st.id"
                class="flex items-center justify-between rounded-lg bg-background border border-border px-3 py-2"
              >
                <span class="text-xs font-mono text-text-secondary truncate">warocol.com/cocina/{{ st.id }}</span>
                <button
                  @click="copyKdsUrl(st.id)"
                  class="ml-2 p-1 rounded text-text-tertiary hover:text-primary hover:bg-primary/5 transition-colors flex-shrink-0"
                  title="Copiar URL"
                >
                  <ClipboardIcon class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ══════ ESTACIONES DE PREPARACIÓN (shown when comandas ON) ══════ -->
      <div v-if="businessProfile?.comandas_enabled" class="bg-surface border-2 border-border rounded-xl p-4 sm:p-6">
        <div class="flex items-center justify-between mb-5">
          <div class="flex items-center gap-2">
            <QueueListIcon class="w-5 h-5 text-primary flex-shrink-0" />
            <h3 class="text-base sm:text-lg font-semibold text-text-primary">Estaciones de preparación</h3>
          </div>
          <button
            @click="openCreateStation"
            class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors min-h-[36px]"
          >
            <PlusIcon class="w-3.5 h-3.5" />
            Nueva
          </button>
        </div>

        <UiResponsiveDataView
          :data="stations"
          :columns="stationColumns"
          empty-message="Sin estaciones configuradas"
          empty-sub-message="Crea la primera estación para empezar."
          item-key="id"
          row-size="sm"
        >
          <template #card="{ item: st }">
            <GestionCocinaStationCard
              :station="st"
              :is-toggling="togglingStationId === st.id"
              @edit="openEditStation"
              @toggle="handleToggleStation"
            />
          </template>
          <template #cell-name="{ item: st }">
            <div class="flex items-center gap-2">
              <span class="inline-block w-3 h-3 rounded-full flex-shrink-0" :style="{ backgroundColor: st.color }" />
              <span class="text-sm font-medium text-text-primary">{{ st.name }}</span>
            </div>
          </template>
          <template #cell-monitor="{ item: st }">
            <span v-if="st.kitchen_name" class="text-sm text-text-secondary font-mono">{{ st.kitchen_name }}</span>
            <span v-else class="text-xs text-text-tertiary italic">—</span>
          </template>
          <template #cell-status="{ item: st }">
            <UiStatusBadge
              :variant="st.is_active ? 'success' : 'secondary'"
              :value="st.is_active ? 'Activa' : 'Inactiva'"
              format="text"
              size="sm"
            />
          </template>
          <template #cell-thresholds="{ item: st }">
            <span class="text-xs text-text-secondary">{{ st.alert_threshold_1_min }}m / {{ st.alert_threshold_2_min }}m</span>
          </template>
          <template #cell-actions="{ item: st }">
            <div class="flex items-center gap-1">
              <button
                @click="openEditStation(st)"
                class="p-1.5 rounded-lg text-text-secondary hover:text-primary hover:bg-primary/5 transition-colors"
              >
                <PencilSquareIcon class="w-4 h-4" />
              </button>
              <button
                @click="handleToggleStation(st)"
                :disabled="togglingStationId === st.id"
                class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                :class="st.is_active ? 'text-amber-600 hover:bg-amber-50 border border-amber-200' : 'text-emerald-600 hover:bg-emerald-50 border border-emerald-200'"
              >
                <UiLoadingDots v-if="togglingStationId === st.id" size="7px" color="currentColor" />
                <span v-else>{{ st.is_active ? 'Desactivar' : 'Activar' }}</span>
              </button>
            </div>
          </template>
        </UiResponsiveDataView>
      </div>

      <!-- ══════ ROUTING DE CATEGORÍAS (shown when comandas ON) ══════ -->
      <div v-if="businessProfile?.comandas_enabled" class="bg-surface border-2 border-border rounded-xl p-4 sm:p-6">
        <div class="flex items-center gap-2 mb-1">
          <ArrowsRightLeftIcon class="w-5 h-5 text-primary flex-shrink-0" />
          <h3 class="text-base sm:text-lg font-semibold text-text-primary">Routing de categorías</h3>
        </div>
        <p class="text-xs text-text-secondary mb-4">
          Define a qué estación deben enviarse los productos de cada categoría. Sin estación asignada = no genera comanda.
        </p>
        <UiResponsiveDataView
          :data="mappedCategoriesForNegocio"
          :columns="categoryColumns"
          empty-message="Sin categorías"
          empty-sub-message="Crea categorías en el menú para asignarlas."
          item-key="id"
          row-size="sm"
        >
          <template #card="{ item: cat }">
            <GestionCocinaCategoryMappingRow
              :category="cat"
              :stations="stations"
              :loading="isAssigningCategoryId === cat.id"
              @assign="(stId) => handleAssignCategoryInNegocio(cat.id, stId)"
            />
          </template>
          <template #cell-name="{ item: cat }">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0">
                {{ cat.name.substring(0, 2).toUpperCase() }}
              </div>
              <span class="text-sm font-medium text-text-primary">{{ cat.name }}</span>
            </div>
          </template>
          <template #cell-station="{ item: cat }">
            <template v-if="stations.find((s: any) => s.id === cat.station_id)">
              <span
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border"
                :style="{
                  backgroundColor: `${stations.find((s: any) => s.id === cat.station_id)?.color}15`,
                  color: stations.find((s: any) => s.id === cat.station_id)?.color,
                  borderColor: `${stations.find((s: any) => s.id === cat.station_id)?.color}30`,
                }"
              >
                <span
                  class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  :style="{ backgroundColor: stations.find((s: any) => s.id === cat.station_id)?.color }"
                />
                {{ stations.find((s: any) => s.id === cat.station_id)?.name }}
              </span>
            </template>
            <span v-else class="text-xs text-text-tertiary italic">Sin asignar</span>
          </template>
          <template #cell-assign="{ item: cat }">
            <div class="flex justify-end">
              <select
                :value="cat.station_id || ''"
                @change="(e) => handleAssignCategoryInNegocio(cat.id, (e.target as HTMLSelectElement).value || null)"
                :disabled="isAssigningCategoryId === cat.id"
                class="min-w-[130px] px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-text-primary disabled:opacity-50"
              >
                <option value="">(Sin asignar)</option>
                <option v-for="st in stations" :key="st.id" :value="st.id">{{ st.name }}</option>
              </select>
            </div>
          </template>
        </UiResponsiveDataView>
      </div>

    </div>

    <!-- Station Deactivate Confirmation Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="deactivateModalOpen"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          @click.self="deactivateModalOpen = false"
        >
          <Transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 scale-95 translate-y-2"
            enter-to-class="opacity-100 scale-100 translate-y-0"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 scale-100 translate-y-0"
            leave-to-class="opacity-0 scale-95 translate-y-2"
            appear
          >
            <div v-if="deactivateModalOpen" class="bg-surface rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

              <!-- Header strip with station color accent -->
              <div class="relative px-5 pt-5 pb-4 border-b border-border/60">
                <div class="flex items-start gap-3">
                  <!-- Icon badge -->
                  <div class="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50 border border-amber-200">
                    <ExclamationTriangleIcon class="w-5 h-5 text-amber-600" />
                  </div>
                  <div class="min-w-0 flex-1 pt-0.5">
                    <h3 class="text-base font-bold text-text-primary leading-tight">Desactivar estación</h3>
                    <!-- Station name with color dot -->
                    <div class="flex items-center gap-1.5 mt-1">
                      <span
                        class="inline-block w-2 h-2 rounded-full flex-shrink-0"
                        :style="{ backgroundColor: deactivateModalStation?.color ?? '#6B7280' }"
                      />
                      <span class="text-sm text-text-secondary font-medium truncate">{{ deactivateModalStation?.name }}</span>
                    </div>
                  </div>
                </div>
                <!-- Close button -->
                <button
                  type="button"
                  @click="deactivateModalOpen = false"
                  aria-label="Cerrar"
                  class="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-text-tertiary hover:bg-surface-secondary hover:text-text-secondary transition-colors"
                >
                  <XMarkIcon class="w-4 h-4" />
                </button>
              </div>

              <!-- Body -->
              <div class="px-5 py-4 flex flex-col gap-4">

                <!-- Loading -->
                <div v-if="isLoadingDeactivateInfo" class="flex flex-col items-center justify-center py-8 gap-3">
                  <UiLoadingDots size="10px" />
                  <p class="text-xs text-text-tertiary">Verificando estado...</p>
                </div>

                <!-- Info loaded -->
                <template v-else-if="deactivateInfo">

                  <!-- BLOCKED: active comandas -->
                  <div v-if="deactivateInfo.active_comandas_count > 0" class="rounded-xl bg-destructive/8 border border-destructive/20 p-4">
                    <div class="flex items-start gap-3">
                      <div class="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                        <ExclamationTriangleIcon class="w-4 h-4 text-destructive" />
                      </div>
                      <div>
                        <p class="text-sm font-semibold text-destructive leading-snug">No se puede desactivar ahora</p>
                        <p class="text-xs text-destructive/80 mt-1 leading-relaxed">
                          Hay <strong>{{ deactivateInfo.active_comandas_count }} comanda{{ deactivateInfo.active_comandas_count !== 1 ? 's' : '' }} activa{{ deactivateInfo.active_comandas_count !== 1 ? 's' : '' }}</strong> en esta estación. Resuélvelas antes de desactivarla.
                        </p>
                      </div>
                    </div>
                  </div>

                  <!-- Affected categories -->
                  <div v-if="deactivateInfo.affected_categories.length > 0" class="rounded-xl bg-amber-50 border border-amber-200/70 p-4">
                    <p class="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">
                      {{ deactivateInfo.affected_categories.length }} categoría{{ deactivateInfo.affected_categories.length !== 1 ? 's' : '' }} afectada{{ deactivateInfo.affected_categories.length !== 1 ? 's' : '' }}
                    </p>
                    <p class="text-xs text-amber-700/80 leading-relaxed mb-3">
                      Sus productos dejarán de generar comandas mientras la estación esté inactiva.
                    </p>
                    <div class="flex flex-wrap gap-1.5">
                      <span
                        v-for="cat in deactivateInfo.affected_categories"
                        :key="cat.id"
                        class="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-amber-800"
                      >{{ cat.name }}</span>
                    </div>
                  </div>

                  <!-- Clean: no impact -->
                  <div
                    v-if="deactivateInfo.affected_categories.length === 0 && deactivateInfo.active_comandas_count === 0"
                    class="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200/70 px-4 py-3"
                  >
                    <div class="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <svg class="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <p class="text-sm text-emerald-700 leading-snug">Sin impacto activo. Se puede desactivar de forma segura.</p>
                  </div>

                </template>
              </div>

              <!-- Footer -->
              <div class="px-5 pb-5 flex gap-2.5">
                <button
                  type="button"
                  @click="deactivateModalOpen = false"
                  class="flex-1 min-h-[44px] rounded-xl border border-border text-sm font-semibold text-text-secondary hover:bg-surface-secondary hover:border-border/80 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  v-if="deactivateInfo"
                  type="button"
                  :disabled="deactivateInfo.active_comandas_count > 0 || isConfirmingDeactivate"
                  class="flex-1 min-h-[44px] rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-destructive text-white hover:bg-destructive/90 active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm"
                  @click="confirmDeactivateStation"
                >
                  <UiLoadingDots v-if="isConfirmingDeactivate" size="8px" color="currentColor" />
                  <template v-else>
                    <span>Desactivar</span>
                  </template>
                </button>
              </div>

            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <!-- Station Form Modal -->
    <GestionCocinaStationFormModal
      v-if="stationModalOpen"
      v-model="stationModalOpen"
      :initial-data="editingStation"
      :loading="isSavingStation"
      @close="stationModalOpen = false"
      @submit="handleSaveStation"
    />

    <!-- Image Upload Modal -->
    <NegocioImageUploadModal
      v-if="imageModalOpen"
      :image-type="imageModalType"
      @upload="handleImageUploaded"
      @close="imageModalOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { usePOSStore } from '~/stores/usePOSStore'
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
  ArrowUpTrayIcon,
  ReceiptPercentIcon,
  FireIcon,
  QueueListIcon,
  PlusIcon,
  PowerIcon,
  PlayIcon,
  ClipboardIcon,
  ArrowsRightLeftIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from '@heroicons/vue/24/outline'

definePageMeta({ layout: 'dashboard' })
useHead({ title: 'Mi Negocio' })

const { isOpenNow, currentTenant } = useTenantReactive()
const tenantsStore = useTenantsStore()
const { data: profileData, status: profileStatus, asyncStatus: profileAsyncStatus, error: profileError, refetch: refreshProfile } = useQuery({
  key: () => ['tenant', 'negocio-profile', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any }>('/api/api/tenant/public-profile'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const isBusinessProfileLoading = computed(() => !profileData.value && !profileError.value)
const isRefreshing = computed(() => profileAsyncStatus.value === 'loading' && profileData.value != null)
const businessProfile = computed(() => profileData.value?.data ?? null)
const toast = useToast()

// ─── Tax config ───
const { data: taxConfigData, refetch: refreshTaxConfig } = useQuery({
  key: () => ['tenant', 'tax-config', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any }>('/api/api/tenant/tax-config'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})
const taxConfig = computed(() => taxConfigData.value?.data ?? null)

const taxForm = reactive({
  inc_applicable: false,
  inc_included_in_price: true,
  iva_applicable: false,
  iva_included_in_price: false,
  liquor_tax_applicable: false,
})
const isSavingTax = ref(false)

watch(taxConfig, (cfg) => {
  if (!cfg) return
  taxForm.inc_applicable = cfg.inc_applicable
  taxForm.inc_included_in_price = cfg.inc_included_in_price
  taxForm.iva_applicable = cfg.iva_applicable
  taxForm.iva_included_in_price = cfg.iva_included_in_price
  taxForm.liquor_tax_applicable = cfg.liquor_tax_applicable
}, { immediate: true })

// ─── Stations & categories (Comandas section) ───
const { data: stationsData, refetch: refetchStations } = useQuery({
  key: () => ['tenant', 'stations', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any[] }>('/api/api/stations'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})
const stations = computed(() => stationsData.value?.data ?? [])

const { data: categoryStationsData, refetch: refetchCategoryStations } = useQuery({
  key: () => ['tenant', 'category-stations', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any[] }>('/api/api/stations/categories'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const { data: categoriesData } = useQuery({
  key: () => ['tenant', 'menu-categories', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any[] }>('/api/menu/categories'),
  enabled: () => !!currentTenant.value,
  staleTime: 60_000,
})

const mappedCategoriesForNegocio = computed(() => {
  const cats = categoriesData.value?.data ?? []
  const maps = categoryStationsData.value?.data ?? []
  return cats.map((cat: any) => {
    const m = maps.find((x: any) => x.category_id === cat.id)
    return { ...cat, station_id: m?.station_id ?? null }
  })
})

// ─── Comandas / KDS toggles ───
const isTogglingComandas = ref(false)
const isTogglingKds = ref(false)
const showDisableComandasWarning = ref(false)

const handleToggleComandas = async (event: Event) => {
  const newState = (event.target as HTMLInputElement).checked
  if (!newState) {
    // intercept disable — show warning instead of toggling immediately
    ;(event.target as HTMLInputElement).checked = true // revert visual
    showDisableComandasWarning.value = true
    return
  }
  if (isTogglingComandas.value) return
  isTogglingComandas.value = true
  try {
    await $fetch('/api/api/tenant/public-profile', { method: 'PATCH', body: { comandas_enabled: true } })
    await refreshProfile()
    toast.success('Módulo de comandas activado', { title: 'Activado' })
  } catch (error: any) {
    toast.error(error.data?.detail || 'Error al activar comandas', { title: 'Error' })
  } finally {
    isTogglingComandas.value = false
  }
}

const confirmDisableComandas = async () => {
  showDisableComandasWarning.value = false
  if (isTogglingComandas.value) return
  isTogglingComandas.value = true
  try {
    await $fetch('/api/api/tenant/public-profile', { method: 'PATCH', body: { comandas_enabled: false } })
    await refreshProfile()
    toast.success('Módulo de comandas desactivado', { title: 'Desactivado' })
  } catch (error: any) {
    toast.error(error.data?.detail || 'Error al desactivar comandas', { title: 'Error' })
  } finally {
    isTogglingComandas.value = false
  }
}

const handleToggleKds = async (event: Event) => {
  if (isTogglingKds.value) return
  const newState = (event.target as HTMLInputElement).checked
  isTogglingKds.value = true
  try {
    await $fetch('/api/api/tenant/public-profile', { method: 'PATCH', body: { kds_enabled: newState } })
    await refreshProfile()
    toast.success(
      newState ? 'Pantallas KDS activadas' : 'Pantallas KDS desactivadas',
      { title: newState ? 'Activado' : 'Desactivado' }
    )
  } catch (error: any) {
    toast.error(error.data?.detail || 'Error al cambiar estado KDS', { title: 'Error' })
  } finally {
    isTogglingKds.value = false
  }
}

const copyKdsUrl = (stationId: string) => {
  navigator.clipboard.writeText(`https://warocol.com/cocina/${stationId}`)
  toast.success('URL copiada al portapapeles')
}

// ─── Station CRUD (from negocio.vue comandas section) ───
const stationColumns = [
  { key: 'name', title: 'Nombre', sortable: false },
  { key: 'monitor', title: 'Monitor', sortable: false },
  { key: 'status', title: 'Estado', sortable: false },
  { key: 'thresholds', title: 'Alertas', sortable: false },
  { key: 'actions', title: '', sortable: false },
]

const categoryColumns = [
  { key: 'name', title: 'Categoría', sortable: false },
  { key: 'station', title: 'Estación asignada', sortable: false },
  { key: 'assign', title: '', sortable: false },
]
const togglingStationId = ref<string | null>(null)
const stationModalOpen = ref(false)
const editingStation = ref<any>(null)
const isSavingStation = ref(false)
const isAssigningCategoryId = ref<string | null>(null)

// Station deactivate modal
const deactivateModalOpen = ref(false)
const deactivateModalStation = ref<any>(null)
const deactivateInfo = ref<{ active_comandas_count: number; affected_categories: { id: string; name: string }[] } | null>(null)
const isLoadingDeactivateInfo = ref(false)
const isConfirmingDeactivate = ref(false)

const openCreateStation = () => { editingStation.value = null; stationModalOpen.value = true }
const openEditStation = (st: any) => { editingStation.value = st; stationModalOpen.value = true }

const handleSaveStation = async (formData: any) => {
  isSavingStation.value = true
  try {
    if (editingStation.value) {
      await $fetch(`/api/api/stations/${editingStation.value.id}`, { method: 'PATCH', body: formData })
      toast.success('Estación actualizada', { title: 'Guardado' })
    } else {
      await $fetch('/api/api/stations', { method: 'POST', body: formData })
      toast.success('Estación creada', { title: 'Creado' })
    }
    stationModalOpen.value = false
    await refetchStations()
  } catch {
    toast.error('Error al guardar la estación', { title: 'Error' })
  } finally {
    isSavingStation.value = false
  }
}

const handleToggleStation = async (station: any) => {
  if (togglingStationId.value === station.id) return
  // Activating — no restrictions, do it directly
  if (!station.is_active) {
    togglingStationId.value = station.id
    try {
      await $fetch(`/api/api/stations/${station.id}/toggle`, { method: 'PATCH', body: { is_active: true } })
      toast.success('Estación activada')
      await refetchStations()
    } catch {
      toast.error('Error al activar la estación', { title: 'Error' })
    } finally {
      togglingStationId.value = null
    }
    return
  }
  // Deactivating — fetch info first
  togglingStationId.value = station.id
  try {
    const res = await $fetch<{ success: boolean; data: any }>(`/api/api/stations/${station.id}/deactivate-info`)
    const info = res.data
    // Only open modal if there's something to show
    if (info.active_comandas_count > 0 || info.affected_categories.length > 0) {
      deactivateModalStation.value = station
      deactivateInfo.value = info
      deactivateModalOpen.value = true
      togglingStationId.value = null
      return
    }
    // Nothing to warn about — deactivate directly
    await $fetch(`/api/api/stations/${station.id}/toggle`, { method: 'PATCH', body: { is_active: false } })
    toast.success('Estación desactivada')
    await refetchStations()
  } catch (e: any) {
    toast.error(e.data?.detail || 'Error al desactivar la estación', { title: 'Error' })
  } finally {
    togglingStationId.value = null
  }
}

const confirmDeactivateStation = async () => {
  if (!deactivateModalStation.value) return
  isConfirmingDeactivate.value = true
  try {
    await $fetch(`/api/api/stations/${deactivateModalStation.value.id}/toggle`, {
      method: 'PATCH',
      body: { is_active: false },
    })
    toast.success('Estación desactivada')
    deactivateModalOpen.value = false
    await refetchStations()
  } catch (e: any) {
    toast.error(e.data?.detail || 'Error al desactivar la estación', { title: 'Error' })
  } finally {
    isConfirmingDeactivate.value = false
  }
}

const handleAssignCategoryInNegocio = async (categoryId: string, stationId: string | null) => {
  isAssigningCategoryId.value = categoryId
  try {
    await $fetch(`/api/api/stations/categories/${categoryId}`, {
      method: 'POST',
      body: { station_id: stationId },
    })
    toast.success('Asignación actualizada')
    await refetchCategoryStations()
  } catch (e: any) {
    const detail = e.data?.detail || e.message
    toast.error(`Error al asignar categoría: ${detail}`, { title: 'Error' })
  } finally {
    isAssigningCategoryId.value = null
  }
}

// INC and IVA are mutually exclusive
watch(() => taxForm.inc_applicable, (val) => { if (val) taxForm.iva_applicable = false })
watch(() => taxForm.iva_applicable, (val) => { if (val) taxForm.inc_applicable = false })

const saveTaxConfig = async () => {
  isSavingTax.value = true
  try {
    await $fetch('/api/api/tenant/tax-config', { method: 'PUT', body: { ...taxForm } })
    await refreshTaxConfig()
    toast.success('Configuración fiscal guardada correctamente', { title: 'Guardado' })
  } catch (error: any) {
    toast.error(error.data?.detail || 'Error al guardar configuración fiscal', { title: 'Error' })
  } finally {
    isSavingTax.value = false
  }
}

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

// ─── Toggle active ───
const isTogglingActive = ref(false)
const toggleActive = async () => {
  if (!businessProfile.value || isTogglingActive.value) return
  isTogglingActive.value = true
  const newState = !businessProfile.value.is_active
  try {
    await $fetch('/api/api/tenant/public-profile/toggle', {
      method: 'POST',
      body: { is_active: newState },
    })
    await refreshProfile()
    toast.success(
      newState ? 'Tu negocio ahora es visible en el directorio' : 'Tu negocio está oculto del directorio',
      { title: newState ? '¡Negocio activado!' : 'Negocio oculto' }
    )
  } catch (error: any) {
    toast.error(error.data?.detail || 'Error al cambiar estado', { title: 'Error' })
  } finally {
    isTogglingActive.value = false
  }
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
      social_media: (() => {
        const smEntries = Object.entries(editForm.social_media).filter(([_, v]) => v?.trim())
        return smEntries.length > 0 ? Object.fromEntries(smEntries) : null
      })(),
    }

    await $fetch('/api/api/tenant/public-profile', { method: 'PATCH', body: payload })
    await Promise.all([refreshProfile(), tenantsStore.fetchBusinessProfile()])
    isEditMode.value = false
    toast.success('Perfil actualizado exitosamente', { title: 'Guardado' })
  } catch (error: any) {
    toast.error(error.data?.detail || 'Error al guardar el perfil', { title: 'Error' })
  } finally {
    isSaving.value = false
  }
}

// ─── Image upload modal ───
const imageModalOpen = ref(false)
const imageModalType = ref<'logo' | 'banner'>('logo')

const openImageModal = (type: 'logo' | 'banner') => {
  imageModalType.value = type
  imageModalOpen.value = true
}

const handleImageUploaded = async (url: string) => {
  const field = imageModalType.value === 'logo' ? 'logo_url' : 'banner_url'
  imageModalOpen.value = false

  // If profile exists, auto-save the image URL immediately via PATCH
  if (businessProfile.value) {
    try {
      const res = await $fetch<{ success: boolean; data: any }>('/api/api/tenant/public-profile', {
        method: 'PATCH',
        body: { [field]: url },
      })
      // Update store directly from PATCH response — avoids a second GET that can fail
      if (res?.data) await refreshProfile()
      toast.success('Imagen guardada correctamente.', { title: 'Imagen subida' })
    } catch {
      toast.error('La imagen se subió pero no se pudo guardar. Inténtalo de nuevo.', { title: 'Error' })
    }
    return
  }

  // No profile yet — enter edit mode so user can complete required fields
  if (!isEditMode.value) enterEditMode()
  editForm[field] = url
  toast.success('Imagen lista. Completa los datos y guarda el perfil.', { title: 'Imagen subida' })
}

// ─── Auto-enter edit mode when no profile ───
// NOTE: No { immediate: true } — with server: false, useAsyncData hasn't started
// on the first synchronous tick (pending=false, data=null), which would incorrectly
// trigger enterEditMode() on every navigation. This watch fires once the fetch
// actually completes (pending goes true→false), so the nil-profile check is reliable.
watch(
  [isBusinessProfileLoading, businessProfile] as const,
  ([loading, profile]) => {
    if (!loading && !profile && !isEditMode.value) {
      enterEditMode()
    }
  }
)

// ─── Refresh handler ───
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
onMounted(() => { setRefreshHandler(refreshProfile) })
registerProgressiveLoading(isRefreshing)
onUnmounted(() => { clearRefreshHandler(refreshProfile) })
</script>
