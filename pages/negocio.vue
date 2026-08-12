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
          <div v-if="!businessProfile && isEditingBrand" class="absolute inset-x-0 bottom-3 flex justify-center">
            <span class="text-white/90 text-xs font-medium drop-shadow bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">
              {{ t('negocio.completeProfileHint') }}
            </span>
          </div>

          <!-- Edit / Save buttons — top-right of banner -->
          <div class="absolute top-3 end-3 flex items-center gap-2">
            <button
              v-if="!isEditingAny"
              @click="enterBrandEdit"
              class="px-3 py-1.5 text-xs font-medium bg-white/80 backdrop-blur-sm text-text-primary border border-white/40 rounded-lg hover:bg-white transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <PencilSquareIcon class="w-3.5 h-3.5" />
              {{ t('negocio.editProfile') }}
            </button>
            <template v-else-if="isEditingBrand">
              <button
                @click="cancelEdit"
                class="px-3 py-1.5 text-xs font-medium bg-white/80 backdrop-blur-sm text-text-secondary border border-white/40 rounded-lg hover:bg-white transition-colors shadow-sm"
              >
                {{ t('negocio.cancel') }}
              </button>
              <button
                @click="saveBrandChanges"
                :disabled="isSaving || !editForm.display_name.trim()"
                class="px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                <CheckIcon class="w-3.5 h-3.5" />
                {{ t('negocio.save') }}
              </button>
            </template>
          </div>

          <!-- Logo — anchored to banner bottom, extends below via translate-y -->
          <div class="absolute bottom-0 start-4 sm:start-6 translate-y-1/2">
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
          <div v-if="!isEditingBrand" class="mb-2">
            <h1 class="text-xl sm:text-2xl font-bold text-text-primary leading-tight">
              {{ businessProfile?.display_name }}
            </h1>
            <div class="flex items-center gap-2 mt-2 flex-wrap">
              <UiStatusBadge
                :variant="isOpenNow ? 'success' : 'destructive'"
                :value="isOpenNow ? t('negocio.open') : t('negocio.closed')"
                format="text"
              />
              <UiStatusBadge
                :variant="businessProfile?.is_active ? 'success' : 'warning'"
                :value="businessProfile?.is_active ? t('negocio.active') : t('negocio.hidden')"
                format="text"
              />
            </div>
          </div>

          <!-- Name input (edit mode) -->
          <div v-if="isEditingBrand" class="mb-3">
            <input
              v-model="editForm.display_name"
              type="text"
              class="input-base w-full px-3 py-2 text-base font-semibold"
              :placeholder="t('negocio.businessNamePlaceholder')"
            />
          </div>

          <!-- Description (view) -->
          <p v-if="!isEditingBrand && businessProfile?.description" class="text-sm text-text-primary/80 leading-relaxed">
            {{ businessProfile.description }}
          </p>
          <p v-else-if="!isEditingBrand && !businessProfile?.description" class="text-sm text-text-secondary italic">
            {{ t('negocio.noDescription') }}
          </p>

          <!-- Edit fields: description + urls -->
          <div v-if="isEditingBrand" class="space-y-3 mt-3">
            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1">{{ t('negocio.publicDescription') }}</label>
              <textarea
                v-model="editForm.description"
                class="input-base w-full px-3 py-2 text-sm"
                rows="2"
                :placeholder="t('negocio.descriptionPlaceholder')"
              />
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-text-secondary mb-1">{{ t('negocio.logo') }}</label>
                <button
                  type="button"
                  @click="openImageModal('logo')"
                  class="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-primary border-2 border-primary/30 border-dashed rounded-lg hover:bg-primary/5 hover:border-primary/60 transition-colors"
                  :aria-label="t('negocio.uploadLogoAria')"
                >
                  <ArrowUpTrayIcon class="w-4 h-4" aria-hidden="true" />
                  {{ editForm.logo_url ? t('negocio.changeLogo') : t('negocio.uploadLogo') }}
                </button>
              </div>
              <div>
                <label class="block text-xs font-medium text-text-secondary mb-1">{{ t('negocio.banner') }}</label>
                <button
                  type="button"
                  @click="openImageModal('banner')"
                  class="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-primary border-2 border-primary/30 border-dashed rounded-lg hover:bg-primary/5 hover:border-primary/60 transition-colors"
                  :aria-label="t('negocio.uploadBannerAria')"
                >
                  <ArrowUpTrayIcon class="w-4 h-4" aria-hidden="true" />
                  {{ editForm.banner_url ? t('negocio.changeBanner') : t('negocio.uploadBanner') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ══════ DIRECTORIO TOGGLE ══════ -->
      <div
        v-if="businessProfile && !isEditingAny"
        class="flex items-center justify-between gap-4 rounded-xl border-2 px-4 py-3 transition-colors"
        :class="businessProfile.is_active
          ? 'border-border bg-surface'
          : 'border-primary/30 bg-primary/5'"
      >
        <div class="min-w-0">
          <p class="text-sm font-semibold leading-snug text-text-primary">
            {{ businessProfile.is_active ? t('negocio.visibleInDirectory') : t('negocio.hiddenBusiness') }}
          </p>
          <p class="text-xs mt-0.5 leading-snug text-text-secondary">
            {{ businessProfile.is_active ? t('negocio.appearsInDirectory', { path: publicCityPath }) : t('negocio.activateForDirectory') }}
          </p>
        </div>
        <label
          class="relative inline-flex items-center cursor-pointer flex-shrink-0"
          :class="isTogglingActive ? 'opacity-50 pointer-events-none' : ''"
          :aria-label="businessProfile.is_active ? t('negocio.disableDirectoryVisibility') : t('negocio.enableDirectoryVisibility')"
        >
          <input
            type="checkbox"
            class="sr-only peer"
            :checked="businessProfile.is_active"
            @change="toggleActive"
            :disabled="isTogglingActive"
          />
          <div class="w-10 h-6 bg-border rounded-full peer peer-checked:bg-primary peer-focus:ring-2 peer-focus:ring-primary/30 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
        </label>
      </div>

      <!-- City-missing warning (warocol.com#615): toggle is on but no city
           was picked, so the business won't appear in any directory page. -->
      <div
        v-if="directoryWarning && !isEditingAny"
        class="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/20 px-4 py-3"
      >
        <ExclamationTriangleIcon class="w-5 h-5 text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-amber-800 dark:text-amber-300 leading-snug">
            {{ t('negocio.selectCityForDirectory') }}
          </p>
          <p class="text-xs text-amber-700 dark:text-amber-400 mt-0.5 leading-snug">
            {{ t('negocio.cityRequiredForDirectory') }}
          </p>
        </div>
      </div>

      <!-- ══════ PEDIDOS ONLINE TOGGLE (warocol.com#2240) ══════ -->
      <div
        v-if="businessProfile && !isEditingAny"
        class="flex items-center justify-between gap-4 rounded-xl border-2 px-4 py-3 transition-colors"
        :class="businessProfile.accepts_online_orders
          ? 'border-border bg-surface'
          : 'border-primary/30 bg-primary/5'"
      >
        <div class="min-w-0">
          <p class="text-sm font-semibold leading-snug text-text-primary">
            {{ businessProfile.accepts_online_orders ? t('negocio.onlineOrdersActive') : t('negocio.onlineOrdersInactive') }}
          </p>
          <p class="text-xs mt-0.5 leading-snug text-text-secondary">
            {{ t('negocio.onlineOrdersHelp') }}
          </p>
        </div>
        <label
          class="relative inline-flex items-center cursor-pointer flex-shrink-0"
          :class="isTogglingOnlineOrders ? 'opacity-50 pointer-events-none' : ''"
          :aria-label="businessProfile.accepts_online_orders ? t('negocio.disableOnlineOrders') : t('negocio.enableOnlineOrders')"
        >
          <input
            type="checkbox"
            class="sr-only peer"
            :checked="businessProfile.accepts_online_orders"
            @change="toggleOnlineOrders"
            :disabled="isTogglingOnlineOrders"
          />
          <div class="w-10 h-6 bg-border rounded-full peer peer-checked:bg-primary peer-focus:ring-2 peer-focus:ring-primary/30 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
        </label>
      </div>

      <!-- ══════ PUBLIC LINK CARD ══════ -->
      <div
        v-if="publicUrl"
        class="bg-surface border-2 border-border rounded-xl p-4 sm:p-5"
      >
        <div class="flex items-center gap-2 mb-2">
          <GlobeAltIcon class="w-5 h-5 text-primary flex-shrink-0" />
          <h3 class="text-sm sm:text-base font-semibold text-text-primary">{{ t('negocio.publicLink') }}</h3>
        </div>

        <p class="text-xs text-text-secondary mb-3 leading-snug">
          {{ t('negocio.publicLinkDescription') }}
        </p>

        <div class="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
          <div class="flex items-center px-3 py-2 bg-surface-secondary border border-border rounded-lg sm:flex-1 min-w-0 min-h-[44px]">
            <span
              class="text-sm font-mono text-text-primary truncate select-all"
              :title="publicUrl"
            >{{ publicUrl }}</span>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="copyPublicLink"
              :disabled="isCopyingLink"
              :aria-label="t('negocio.copyPublicLinkAria', { url: publicUrl })"
              class="flex-1 sm:flex-none min-h-[44px] px-4 py-2 inline-flex items-center justify-center gap-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ClipboardDocumentIcon class="w-4 h-4" aria-hidden="true" />
              {{ t('negocio.copy') }}
            </button>
            <button
              type="button"
              @click="sharePublicLink"
              :disabled="isSharingLink"
              :aria-label="t('negocio.sharePublicLinkAria')"
              class="flex-1 sm:flex-none min-h-[44px] px-4 py-2 inline-flex items-center justify-center gap-2 text-sm font-semibold bg-surface-secondary text-text-primary border border-border rounded-lg hover:bg-surface-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShareIcon class="w-4 h-4" aria-hidden="true" />
              {{ t('negocio.share') }}
            </button>
          </div>
        </div>

        <div
          v-if="businessProfile && !businessProfile.is_active"
          class="flex items-start gap-2 px-3 py-2 bg-primary/5 border border-primary/30 rounded-lg"
        >
          <ExclamationTriangleIcon class="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <p class="text-xs text-text-secondary leading-snug">
            {{ t('negocio.publicPageInactive') }}
          </p>
        </div>
      </div>

      <!-- ══════ STATS STRIP ══════
           Hidden while editing (warocol.com#626): the "Pedidos en línea"
           section below owns the editable inputs for these fields,
           so showing the read-only summary at the same time duplicates
           labels and confuses the operator about where to edit. -->
      <div v-if="businessProfile && !isEditingAny" class="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border bg-surface border-2 border-border rounded-xl overflow-hidden">
        <div class="px-3 sm:px-5 py-3 sm:py-4 flex flex-col justify-between text-start sm:text-center">
          <p class="text-[10px] sm:text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
            {{ t('negocio.prepTimeShort') }}
          </p>
          <p class="text-base sm:text-lg font-bold text-text-primary">
            {{ businessProfile.estimated_preparation_time }} min
          </p>
        </div>
        <div class="px-3 sm:px-5 py-3 sm:py-4 flex flex-col justify-between text-start sm:text-center">
          <p class="text-[10px] sm:text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
            {{ t('negocio.minimumOrder') }}
          </p>
          <p class="text-base sm:text-lg font-bold text-text-primary">
            {{ formatCurrencyCompact(businessProfile.min_order_amount) }}
          </p>
        </div>
        <div class="px-3 sm:px-5 py-3 sm:py-4 flex flex-col justify-between text-start sm:text-center">
          <p class="text-[10px] sm:text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
            {{ t('negocio.onlineLimit') }}
          </p>
          <p class="text-base sm:text-lg font-bold text-text-primary">
            {{ formatOnlineOrderMaxAmountCompact(businessProfile.online_order_max_amount) }}
          </p>
        </div>
        <div class="px-3 sm:px-5 py-3 sm:py-4 flex flex-col justify-between items-start sm:items-center text-start sm:text-center">
          <p class="text-[10px] sm:text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
            {{ t('negocio.onlineOrders') }}
          </p>
          <UiStatusBadge
            :variant="businessProfile.accepts_online_orders ? 'success' : 'secondary'"
            :value="businessProfile.accepts_online_orders ? t('negocio.activePlural') : t('negocio.inactivePlural')"
            format="text"
            size="sm"
          />
        </div>
      </div>

      <!--
        Policy (#1909 / epic #1906): Starter online-orders banner is informational only.
        Do not gate Mi Negocio save/edit on plan quotas — Despacho and Mi Negocio stay ungated.
      -->
      <div
        v-if="isStarterPlan && businessProfile?.accepts_online_orders && !isEditingAny"
        class="rounded-xl border border-amber-300/80 bg-amber-50 px-4 py-3 dark:border-amber-800/40 dark:bg-amber-950/20"
      >
        <p class="text-sm font-medium text-amber-900 dark:text-amber-100">
          {{ t('billing.starterOnlineQuotaOwnerHint') }}
        </p>
        <NuxtLink
          to="/gestion/billing"
          class="mt-2 inline-flex text-sm font-semibold text-primary hover:text-primary/80"
        >
          {{ t('billing.upgrade.cta') }}
        </NuxtLink>
      </div>

      <!-- ══════ CONTACTO ══════ -->
      <div class="bg-surface border-2 border-border rounded-xl p-4 sm:p-6">
        <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 class="text-base sm:text-lg font-semibold text-text-primary flex items-center gap-2">
            <MapPinIcon class="w-5 h-5 text-primary flex-shrink-0" />
            {{ t('negocio.contact') }}
          </h3>
          <div class="flex items-center gap-2">
            <button
              v-if="!isEditingAny"
              type="button"
              @click="enterOpsEdit"
              class="px-3 py-1.5 text-xs font-medium bg-surface-secondary text-text-primary border border-border rounded-lg hover:bg-surface-secondary/80 transition-colors flex items-center gap-1.5"
            >
              <PencilSquareIcon class="w-3.5 h-3.5" />
              {{ t('negocio.editBusinessInfo') }}
            </button>
            <template v-else-if="isEditingOps">
              <button
                type="button"
                @click="cancelEdit"
                class="px-3 py-1.5 text-xs font-medium bg-surface-secondary text-text-secondary border border-border rounded-lg hover:bg-surface-secondary/80 transition-colors"
              >
                {{ t('negocio.cancel') }}
              </button>
              <button
                type="button"
                @click="saveOpsChanges"
                :disabled="isSaving"
                class="px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <CheckIcon class="w-3.5 h-3.5" />
                {{ t('negocio.save') }}
              </button>
            </template>
          </div>
        </div>

        <!-- View -->
        <template v-if="!isEditingOps">
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
              {{ t('negocio.noContact') }}
            </p>
          </div>
        </template>

        <!-- Edit -->
        <template v-else>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="sm:col-span-2">
              <label class="block text-xs font-medium text-text-secondary mb-1">{{ t('negocio.address') }}</label>
              <input v-model="editForm.address" type="text" class="input-base w-full px-3 py-2 text-sm" placeholder="Calle 123 # 45-67" />
            </div>
            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1">{{ t('negocio.neighborhood') }}</label>
              <input v-model="editForm.neighborhood" type="text" class="input-base w-full px-3 py-2 text-sm" placeholder="Chapinero" />
            </div>
            <div>
              <label for="negocio-country" class="block text-xs font-medium text-text-secondary mb-1">{{ t('negocio.country') }}</label>
              <select
                id="negocio-country"
                v-model="editForm.country"
                disabled
                aria-describedby="negocio-country-help"
                class="input-base w-full px-3 py-2 text-sm disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <option value="Colombia">Colombia</option>
              </select>
              <p id="negocio-country-help" class="text-[10px] text-text-tertiary mt-1">
                {{ t('negocio.colombiaOnly') }}
              </p>
            </div>
            <div>
              <label for="negocio-city" class="block text-xs font-medium text-text-secondary mb-1">
                {{ t('negocio.city') }}
                <span class="text-amber-600" aria-hidden="true">*</span>
              </label>
              <div ref="citySearchAnchorRef" class="relative">
                <input
                  id="negocio-city"
                  v-model="citySearchTerm"
                  type="text"
                  role="combobox"
                  aria-autocomplete="list"
                  :aria-expanded="cityDropdownOpen"
                  :aria-controls="cityListboxId"
                  :aria-activedescendant="activeCityOptionId"
                  :aria-describedby="cityHelpId"
                  autocomplete="off"
                  class="input-base w-full px-3 py-2 ps-9 pe-10 text-sm"
                  :placeholder="t('negocio.cityPlaceholder')"
                  @input="onCitySearchInput"
                  @focus="openCitySearch"
                  @blur="closeCitySearchSoon"
                  @keydown.down.prevent="moveCityHighlight(1)"
                  @keydown.up.prevent="moveCityHighlight(-1)"
                  @keydown.enter.prevent="selectHighlightedCity"
                  @keydown.esc.prevent="closeCitySearch"
                />
                <MagnifyingGlassIcon
                  class="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary"
                  aria-hidden="true"
                />
                <button
                  v-if="citySearchTerm"
                  type="button"
                  class="absolute end-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-text-tertiary hover:bg-surface-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  :aria-label="t('negocio.clearCity')"
                  @mousedown.prevent
                  @click="clearCitySelection"
                >
                  <XMarkIcon class="h-4 w-4" aria-hidden="true" />
                </button>
                <span
                  v-else-if="cityCatalogLoading"
                  class="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-text-tertiary/30 border-t-text-tertiary"
                  aria-hidden="true"
                />
              </div>
              <Teleport to="body">
                <ul
                  v-if="cityDropdownOpen"
                  :id="cityListboxId"
                  role="listbox"
                  :style="cityPanelStyle"
                  class="bg-surface border border-border rounded-lg shadow-lg overflow-y-auto"
                >
                  <li
                    v-for="(city, index) in visibleCityResults"
                    :id="cityOptionId(city)"
                    :key="city.city_slug"
                    role="option"
                    :aria-selected="index === citySearchActiveIndex"
                    :class="[
                      'min-h-[44px] cursor-pointer px-3 py-2 text-sm flex flex-col justify-center',
                      index === citySearchActiveIndex ? 'bg-surface-secondary text-text-primary' : 'text-text-primary hover:bg-surface-secondary',
                    ]"
                    @mousedown.prevent="selectCity(city)"
                  >
                    <span class="font-medium leading-snug">{{ city.city }}</span>
                    <span v-if="cityDepartment(city)" class="text-xs text-text-secondary leading-snug">
                      {{ cityDepartment(city) }}
                    </span>
                  </li>
                  <li
                    v-if="!visibleCityResults.length"
                    role="presentation"
                    aria-hidden="true"
                    class="px-3 py-2 text-sm text-text-secondary/70 select-none"
                  >
                    {{ cityEmptyMessage }}
                  </li>
                </ul>
              </Teleport>
              <p :id="cityHelpId" class="text-[10px] text-text-tertiary mt-1">
                {{ t('negocio.cityDirectoryHelp') }}
              </p>
              <p
                v-if="cityCatalogError"
                class="text-[10px] text-amber-700 dark:text-amber-400 mt-1"
              >
                {{ t('negocio.cityCatalogError') }}
              </p>
            </div>
            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1">{{ t('negocio.phone') }}</label>
              <input v-model="editForm.phone_number" type="text" class="input-base w-full px-3 py-2 text-sm" placeholder="+57 300 000 0000" />
            </div>
            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1">{{ t('negocio.email') }}</label>
              <input v-model="editForm.email" type="email" class="input-base w-full px-3 py-2 text-sm" placeholder="contacto@negocio.com" />
            </div>
          </div>
        </template>
      </div>

      <!-- ══════ HORARIO ══════ -->
      <div
        v-if="businessProfile || isEditingOps"
        class="bg-surface border-2 border-border rounded-xl p-4 sm:p-6"
      >
        <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <ClockIcon class="w-5 h-5 text-primary flex-shrink-0" />
          {{ t('negocio.hours') }}
        </h3>

        <!-- View -->
        <template v-if="!isEditingOps">
          <div class="mb-4 flex items-center justify-between gap-3 rounded-lg bg-surface-secondary px-3 py-2">
            <span class="text-sm text-text-secondary">{{ t('negocio.timezone') }}</span>
            <span class="text-sm font-semibold text-text-primary text-end">
              {{ businessTimezoneLabel }}
            </span>
          </div>
          <p
            v-if="!hasConfiguredBusinessHours"
            class="text-sm text-text-secondary italic"
          >
            {{ t('negocio.noHours') }}
          </p>
          <div v-else class="space-y-0">
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
                  {{ dayLabel(dayKey) }}
                </span>
                <span v-if="isToday(index)" class="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                  {{ t('negocio.today') }}
                </span>
              </div>
              <span
                class="text-sm"
                :class="businessProfile.business_hours?.[dayKey]?.closed
                  ? 'text-text-secondary'
                  : isToday(index) ? 'text-primary font-semibold' : 'text-text-primary'"
              >
                <template v-if="!businessProfile.business_hours?.[dayKey] || businessProfile.business_hours?.[dayKey]?.closed">
                  {{ t('negocio.closed') }}
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
          <div class="mb-4">
            <label for="negocio-timezone" class="block text-xs font-medium text-text-secondary mb-1">{{ t('negocio.timezone') }}</label>
            <select
              id="negocio-timezone"
              v-model="editForm.timezone"
              class="input-base w-full px-3 py-2 text-sm"
            >
              <option
                v-for="option in TIMEZONE_OPTIONS"
                :key="option.value"
                :value="option.value"
              >
                {{ timezoneOptionLabel(option) }}
              </option>
            </select>
            <p class="text-[10px] text-text-tertiary mt-1">
              {{ t('negocio.timezoneHelp') }}
              <span class="block mt-0.5">{{ t('negocio.timezoneFromCountryHelp') }}</span>
            </p>
          </div>
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
                {{ dayLabel(dayKey) }}
              </span>
              <label class="flex items-center gap-1.5 cursor-pointer flex-shrink-0">
                <input
                  v-model="editForm.business_hours[dayKey].closed"
                  type="checkbox"
                  class="rounded border-border text-primary focus:ring-primary"
                />
                <span class="text-xs text-text-secondary">{{ t('negocio.closed') }}</span>
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
          {{ t('negocio.onlineOrders') }}
        </h3>

        <!-- View -->
        <template v-if="!isEditingOps">
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-sm text-text-secondary">{{ t('negocio.estimatedPrepTime') }}</span>
              <span class="text-sm font-semibold text-text-primary">{{ businessProfile?.estimated_preparation_time }} min</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-text-secondary">{{ t('negocio.minimumOrder') }}</span>
              <span class="text-sm font-semibold text-text-primary">{{ formatCurrency(businessProfile?.min_order_amount ?? 0) }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-text-secondary">{{ t('negocio.maximumOnlineLimit') }}</span>
              <span class="text-sm font-semibold text-text-primary">{{ formatOnlineOrderMaxAmount(businessProfile?.online_order_max_amount) }}</span>
            </div>
          </div>
        </template>

        <!-- Edit: prep / min / max only — master online toggle lives outside Edit (#2240) -->
        <template v-else>
          <div class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-text-secondary mb-1">{{ t('negocio.prepTimeMinutes') }}</label>
                <!-- text + inputmode='numeric' instead of type='number' to
                     prevent the spinner buttons and mouse-wheel scroll
                     from accidentally incrementing the value by the
                     `step` amount — that caused values to drift up
                     (warocol.com#626 follow-up). v-model.number still
                     parses the string to a JS number. -->
                <input
                  v-model.number="editForm.estimated_preparation_time"
                  type="text"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  class="input-base w-full px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-text-secondary mb-1">{{ t('negocio.minimumOrderCop') }}</label>
                <input
                  v-model.number="editForm.min_order_amount"
                  type="text"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  class="input-base w-full px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-text-secondary mb-1">{{ t('negocio.maximumOnlineLimitCop') }}</label>
                <input
                  v-model.number="editForm.online_order_max_amount"
                  type="text"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  class="input-base w-full px-3 py-2 text-sm"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- ══════ ORDEN CATEGORÍAS MENÚ ONLINE ══════ -->
      <NegocioOnlineMenuCategoryOrder />

      <!-- ══════ ORDEN PRODUCTOS MENÚ ONLINE ══════ -->
      <NegocioOnlineMenuProductOrder />

      <!-- ══════ REDES SOCIALES ══════ -->
      <div class="bg-surface border-2 border-border rounded-xl p-4 sm:p-6 pb-safe">
        <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <GlobeAltIcon class="w-5 h-5 text-primary flex-shrink-0" />
          {{ t('negocio.socialMedia') }}
        </h3>

        <!-- View -->
        <template v-if="!isEditingOps">
          <div class="space-y-2.5">
            <p
              v-if="!hasSocialMedia"
              class="text-sm text-text-secondary italic"
            >
              {{ t('negocio.noSocial') }}
            </p>
            <div v-for="(value, key) in (businessProfile?.social_media || {})" :key="key">
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
              <label class="block text-xs font-medium text-text-secondary mb-1">{{ t('negocio.instagram') }}</label>
              <input v-model="editForm.social_media.instagram" type="text" class="input-base w-full px-3 py-2 text-sm" placeholder="@usuario o URL" />
            </div>
            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1">{{ t('negocio.whatsapp') }}</label>
              <input v-model="editForm.social_media.whatsapp" type="text" class="input-base w-full px-3 py-2 text-sm" placeholder="+57 300 000 0000" />
            </div>
            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1">{{ t('negocio.facebook') }}</label>
              <input v-model="editForm.social_media.facebook" type="text" class="input-base w-full px-3 py-2 text-sm" placeholder="URL o nombre de página" />
            </div>
            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1">{{ t('negocio.twitter') }}</label>
              <input v-model="editForm.social_media.twitter" type="text" class="input-base w-full px-3 py-2 text-sm" placeholder="@usuario" />
            </div>
            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1">{{ t('negocio.tiktok') }}</label>
              <input v-model="editForm.social_media.tiktok" type="text" class="input-base w-full px-3 py-2 text-sm" placeholder="@usuario" />
            </div>
          </div>
        </template>
      </div>

    </div>

    <!-- Image Upload Modal -->
    <CommonsImageUploadModal
      v-if="imageModalOpen"
      :image-type="imageModalType"
      upload-endpoint="/api/api/tenant/upload-image"
      :send-image-type-field="true"
      @upload="handleImageUploaded"
      @close="imageModalOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, watch } from 'vue'
import {
  useCityCatalog,
  type PublicCity,
  normalizeCitySearch,
  cityDepartmentLabel,
  filterCityCatalog,
  resolveCityFromSearchTerm,
  formatApiValidationError,
} from '~/composables/useCityCatalog'
import { useCatalogSearchDropdownPlacement } from '~/composables/useCatalogSearchDropdownPlacement'
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
  ClipboardDocumentIcon,
  ShareIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import { DEFAULT_TENANT_TIMEZONE, resolveTimezonePrefill } from '~/utils/bogotaDate'

definePageMeta({ layout: 'dashboard', module: 'mi_negocio' })
const { t, locale } = useI18n({ useScope: 'global' })
useHead({ title: () => t('negocio.pageTitle') })

const { isOpenNow, currentTenant } = useTenantReactive()
const accessStore = useAccessStore()
const isStarterPlan = computed(() => accessStore.planSlug === 'starter')
const tenantsStore = useTenantsStore()
const { profile: financialProfile } = useTenantFinancialProfile()
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

// Tax config moved to /facturacion page

// ─── Edit state ───
type NegocioEditScope = 'brand' | 'ops' | null
const editScope = ref<NegocioEditScope>(null)
const isEditingBrand = computed(() => editScope.value === 'brand')
const isEditingOps = computed(() => editScope.value === 'ops')
const isEditingAny = computed(() => editScope.value !== null)
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
  country: 'Colombia',
  city: '',
  city_slug: '',
  neighborhood: '',
  timezone: 'America/Bogota',
  accepts_online_orders: false,
  min_order_amount: 0,
  online_order_max_amount: '' as number | string,
  estimated_preparation_time: 30,
  business_hours: {} as Record<string, { open: string; close: string; closed: boolean }>,
  social_media: { instagram: '', whatsapp: '', facebook: '', twitter: '', tiktok: '' },
})

// ─── City catalog (warocol.com#615) ───
const {
  cities: cityCatalog,
  fetchCatalog: ensureCityCatalog,
  isLoading: cityCatalogLoading,
  error: cityCatalogError,
  hasLoaded: cityCatalogLoaded,
} = useCityCatalog()
// Make sure the selector has the full catalog (include_empty=true). The SSR
// plugin already warmed this — this is a no-op on subsequent visits and only
// hits the API on a fresh client load.
onMounted(() => { ensureCityCatalog({ includeEmpty: true }) })

const CITY_RESULT_LIMIT = 40
const cityListboxId = 'negocio-city-results'
const cityHelpId = 'negocio-city-help'
const citySearchAnchorRef = ref<HTMLElement | null>(null)
const citySearchTerm = ref('')
const citySearchOpen = ref(false)
const citySearchActiveIndex = ref(0)

const cityDepartment = (city: PublicCity) => cityDepartmentLabel(city)

const selectedCity = computed(() =>
  cityCatalog.value.find((c) => c.city_slug === editForm.city_slug) ?? null,
)

const visibleCityResults = computed(() =>
  filterCityCatalog(cityCatalog.value, citySearchTerm.value, CITY_RESULT_LIMIT),
)

const cityDropdownOpen = computed(() =>
  citySearchOpen.value
  && (
    visibleCityResults.value.length > 0
    || Boolean(citySearchTerm.value.trim())
    || cityCatalogLoading.value
    || cityCatalogLoaded.value
    || Boolean(cityCatalogError.value)
  ),
)

const { panelStyle: cityPanelStyle, updatePlacement: updateCitySearchPlacement } = useCatalogSearchDropdownPlacement(
  citySearchAnchorRef,
  cityDropdownOpen,
)

const cityEmptyMessage = computed(() => {
  if (cityCatalogLoading.value) return t('negocio.loadingCities')
  if (cityCatalogError.value) return t('negocio.cityCatalogUnavailable')
  if (!cityCatalog.value.length && cityCatalogLoaded.value) return t('negocio.noCities')
  return t('negocio.noResults')
})

const activeCityOptionId = computed(() => {
  const city = visibleCityResults.value[citySearchActiveIndex.value]
  return city ? cityOptionId(city) : undefined
})

const cityOptionId = (city: PublicCity) => `negocio-city-option-${city.city_slug}`

const syncCitySearchTerm = () => {
  citySearchTerm.value = selectedCity.value?.city || editForm.city || ''
}

const onCityChange = (slug: string) => {
  editForm.city_slug = slug
  const entry = cityCatalog.value.find((c) => c.city_slug === slug)
  editForm.city = entry?.city || ''
  syncCitySearchTerm()
}

const selectCity = (city: PublicCity) => {
  onCityChange(city.city_slug)
  closeCitySearch()
}

const clearCitySelection = () => {
  citySearchTerm.value = ''
  editForm.city_slug = ''
  editForm.city = ''
  citySearchActiveIndex.value = 0
  citySearchOpen.value = true
  nextTick(updateCitySearchPlacement)
}

const onCitySearchInput = () => {
  const resolved = resolveCityFromSearchTerm(cityCatalog.value, citySearchTerm.value)
  if (resolved) {
    editForm.city_slug = resolved.city_slug
    editForm.city = resolved.city
  } else {
    const currentSelection = selectedCity.value
    if (!currentSelection || normalizeCitySearch(citySearchTerm.value) !== normalizeCitySearch(currentSelection.city)) {
      editForm.city_slug = ''
      editForm.city = ''
    }
  }
  citySearchActiveIndex.value = 0
  citySearchOpen.value = true
}

const openCitySearch = () => {
  citySearchOpen.value = true
  nextTick(updateCitySearchPlacement)
}

const closeCitySearch = () => {
  if (!editForm.city_slug && citySearchTerm.value.trim()) {
    const match = resolveCityFromSearchTerm(cityCatalog.value, citySearchTerm.value)
    if (match) onCityChange(match.city_slug)
  }
  citySearchOpen.value = false
  citySearchActiveIndex.value = 0
  syncCitySearchTerm()
}

const closeCitySearchSoon = () => {
  setTimeout(closeCitySearch, 150)
}

const moveCityHighlight = (delta: number) => {
  if (!citySearchOpen.value) openCitySearch()
  const count = visibleCityResults.value.length
  if (!count) return
  citySearchActiveIndex.value = (citySearchActiveIndex.value + delta + count) % count
}

const selectHighlightedCity = () => {
  const city = visibleCityResults.value[citySearchActiveIndex.value]
  if (city) selectCity(city)
}

watch(selectedCity, (city) => {
  if (isEditingOps.value && city) citySearchTerm.value = city.city
})

watch(() => visibleCityResults.value.length, (length) => {
  if (citySearchActiveIndex.value >= length) {
    citySearchActiveIndex.value = Math.max(0, length - 1)
  }
})

const publicCityPath = computed(() => {
  const slug = businessProfile.value?.city_slug
  return slug ? `warocol.com/${slug}` : t('negocio.waroDirectory')
})

const directoryWarning = computed(() => {
  return businessProfile.value?.is_active && !businessProfile.value?.city_slug
})

// ─── Computed visuals ───
const logoSrc = computed(() => {
  if (isEditingBrand.value) return editForm.logo_url || null
  return businessProfile.value?.logo_url || null
})

const effectiveBannerStyle = computed(() => {
  const url = isEditingBrand.value ? editForm.banner_url : businessProfile.value?.banner_url
  if (url) return { backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
  return {}
})

// ─── Constants ───
const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const dayLabel = (dayKey: string) => t(`negocio.daysOfWeek.${dayKey}`)
const TIMEZONE_OPTIONS = [
  { value: 'America/Bogota', key: 'bogota' },
  { value: 'America/Lima', key: 'lima' },
  { value: 'America/Guayaquil', key: 'guayaquil' },
  { value: 'America/Panama', key: 'panama' },
  { value: 'America/Mexico_City', key: 'mexicoCity' },
  { value: 'America/Caracas', key: 'caracas' },
  { value: 'America/Santiago', key: 'santiago' },
  { value: 'America/Toronto', key: 'toronto' },
  { value: 'America/New_York', key: 'newYork' },
  { value: 'America/Santo_Domingo', key: 'santoDomingo' },
  { value: 'America/Montevideo', key: 'montevideo' },
  { value: 'Europe/Madrid', key: 'madrid' },
  { value: 'Asia/Singapore', key: 'singapore' },
  { value: 'Asia/Dubai', key: 'dubai' },
  { value: 'Asia/Kathmandu', key: 'kathmandu' },
  { value: 'Australia/Sydney', key: 'sydney' },
  { value: 'Australia/Adelaide', key: 'adelaide' },
  { value: 'Pacific/Auckland', key: 'auckland' },
  { value: 'Pacific/Apia', key: 'apia' },
  { value: 'Pacific/Kiritimati', key: 'kiritimati' },
  { value: 'Pacific/Pago_Pago', key: 'pagoPago' },
]
const timezoneOptionLabel = (option: { key: string }) => t(`negocio.timezones.${option.key}`)
const { zonedParts, normalizeTimezone } = useTenantTimezone()

const timezoneLabel = (value?: string | null) => {
  const timezone = normalizeTimezone(value)
  const option = TIMEZONE_OPTIONS.find(option => option.value === timezone)
  return option ? timezoneOptionLabel(option) : timezone
}

const businessTimezoneLabel = computed(() => timezoneLabel(businessProfile.value?.timezone))

/** True when profile has a non-empty business_hours object (all-closed still counts as configured). */
const hasConfiguredBusinessHours = computed(() => {
  const hours = businessProfile.value?.business_hours
  return !!hours && typeof hours === 'object' && Object.keys(hours).length > 0
})

const isToday = (i: number) => {
  const weekdayMap: Record<string, string> = {
    Mon: 'monday',
    Tue: 'tuesday',
    Wed: 'wednesday',
    Thu: 'thursday',
    Fri: 'friday',
    Sat: 'saturday',
    Sun: 'sunday',
  }
  return DAY_ORDER[i] === weekdayMap[zonedParts(new Date()).weekday ?? '']
}

const hasSocialMedia = computed(() => {
  const sm = businessProfile.value?.social_media
  return sm && Object.values(sm).some(v => !!v)
})

// Both formatters normalize the input to a number first because the API
// serializes Decimal fields (e.g. min_order_amount) as JSON strings like
// "0.00" — JS coerces strings in arithmetic but a string like "0.00" is
// truthy, so `if (!value)` falsely fell through and the literal "0.00"
// ended up in the template (warocol.com#626).
const formatCurrency = (value: number | string | null | undefined) => {
  const n = Number(value) || 0
  if (!n) return '$0'
  return new Intl.NumberFormat(toNumberLocaleTag(locale.value), { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
}

const formatCurrencyCompact = (value: number | string | null | undefined) => {
  const n = Number(value) || 0
  if (!n) return '$0'
  if (n >= 1000) {
    return `$${(n / 1000).toFixed(0)}k`
  }
  return `$${n}`
}

const formatOnlineOrderMaxAmount = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === '') return t('negocio.customerDetermines')
  const n = Number(value)
  if (!Number.isFinite(n)) return t('negocio.customerDetermines')
  if (n <= 0) return t('negocio.noLimit')
  return formatCurrency(n)
}

const formatOnlineOrderMaxAmountCompact = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === '') return t('negocio.customerShort')
  const n = Number(value)
  if (!Number.isFinite(n)) return t('negocio.customerShort')
  if (n <= 0) return t('negocio.noLimit')
  return formatCurrencyCompact(n)
}

const normalizeOnlineOrderMaxAmount = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return Math.max(0, Math.round(n))
}

// ─── Edit actions (warocol.com#2246 — brand vs ops scopes) ───
const loadBrandForm = () => {
  const bp = businessProfile.value
  editForm.display_name = bp?.display_name || ''
  editForm.description = bp?.description || ''
  editForm.logo_url = bp?.logo_url || ''
  editForm.banner_url = bp?.banner_url || ''
}

const loadOpsForm = () => {
  const bp = businessProfile.value
  editForm.phone_number = bp?.phone_number || ''
  editForm.email = bp?.email || ''
  editForm.address = bp?.address || ''
  editForm.country = bp?.country || 'Colombia'
  editForm.city = bp?.city || ''
  editForm.city_slug = bp?.city_slug || ''
  editForm.neighborhood = bp?.neighborhood || ''
  editForm.timezone = resolveTimezonePrefill({
    storedTimezone: bp?.timezone,
    countryCode: financialProfile.value?.country_code,
  })
  editForm.accepts_online_orders = bp?.accepts_online_orders ?? false
  editForm.min_order_amount = Number(bp?.min_order_amount) || 0
  editForm.online_order_max_amount = bp?.online_order_max_amount === null || bp?.online_order_max_amount === undefined
    ? ''
    : Number(bp.online_order_max_amount)
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
  syncCitySearchTerm()
}

const enterBrandEdit = () => {
  if (isEditingOps.value) return
  loadBrandForm()
  editScope.value = 'brand'
}

const enterOpsEdit = () => {
  if (isEditingBrand.value) return
  loadOpsForm()
  editScope.value = 'ops'
}

watch(
  () => financialProfile.value?.country_code,
  (countryCode) => {
    if (!isEditingOps.value || !countryCode) return
    if (editForm.timezone !== DEFAULT_TENANT_TIMEZONE) return
    editForm.timezone = resolveTimezonePrefill({
      storedTimezone: businessProfile.value?.timezone,
      countryCode,
    })
  },
)

const cancelEdit = () => {
  editScope.value = null
}

const saveBrandChanges = async () => {
  isSaving.value = true
  try {
    await $fetch('/api/api/tenant/public-profile', {
      method: 'PATCH',
      body: {
        display_name: editForm.display_name,
        description: editForm.description || null,
        logo_url: editForm.logo_url || null,
        banner_url: editForm.banner_url || null,
      },
    })
    await refreshBusinessProfileCaches()
    editScope.value = null
    toast.success(t('negocio.profileSaved'), { title: t('negocio.saved') })
  } catch (error: any) {
    toast.error(
      formatApiValidationError(error.data?.detail, t('negocio.saveError')),
      { title: t('negocio.error') },
    )
  } finally {
    isSaving.value = false
  }
}

const saveOpsChanges = async () => {
  isSaving.value = true
  try {
    const cleanedHours: Record<string, any> = {}
    for (const day of DAY_ORDER) {
      const d = editForm.business_hours[day]
      cleanedHours[day] = d.closed
        ? { closed: true }
        : { open: d.open, close: d.close, closed: false }
    }

    await $fetch('/api/api/tenant/public-profile', {
      method: 'PATCH',
      body: {
        phone_number: editForm.phone_number || null,
        email: editForm.email || null,
        address: editForm.address || null,
        city: editForm.city || null,
        city_slug: editForm.city_slug || null,
        neighborhood: editForm.neighborhood || null,
        timezone: normalizeTimezone(editForm.timezone),
        accepts_online_orders: businessProfile.value?.accepts_online_orders ?? editForm.accepts_online_orders,
        min_order_amount: editForm.min_order_amount,
        online_order_max_amount: normalizeOnlineOrderMaxAmount(editForm.online_order_max_amount),
        estimated_preparation_time: editForm.estimated_preparation_time,
        business_hours: cleanedHours,
        social_media: (() => {
          const smEntries = Object.entries(editForm.social_media).filter(([_, v]) => v?.trim())
          return smEntries.length > 0 ? Object.fromEntries(smEntries) : null
        })(),
      },
    })
    await refreshBusinessProfileCaches()
    editScope.value = null
    toast.success(t('negocio.profileSaved'), { title: t('negocio.saved') })
  } catch (error: any) {
    toast.error(
      formatApiValidationError(error.data?.detail, t('negocio.saveError')),
      { title: t('negocio.error') },
    )
  } finally {
    isSaving.value = false
  }
}

// ─── Public link (URL + copy + share) ───
const runtimeConfig = useRuntimeConfig()
const publicUrl = computed(() => {
  // Prefer the public profile slug (storefront URL slug, e.g. "sandwichito-monroy"),
  // not the internal tenant slug (e.g. "warocolombia"). They can differ.
  const slug = businessProfile.value?.slug || currentTenant.value?.slug
  if (!slug) return ''
  // Use the live origin so the URL matches the current environment
  // (localhost in dev, dev.warocol.com on staging, warocol.com in prod).
  // Fall back to runtime config / the production domain on SSR where window is undefined.
  const base = (typeof window !== 'undefined' && window.location?.origin)
    || (runtimeConfig.public.siteUrl as string | undefined)
    || 'https://warocol.com'
  return `${base.replace(/\/$/, '')}/${slug}`
})

const isCopyingLink = ref(false)
const copyPublicLink = async () => {
  if (!publicUrl.value || isCopyingLink.value) return
  isCopyingLink.value = true
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(publicUrl.value)
    } else {
      const textArea = document.createElement('textarea')
      textArea.value = publicUrl.value
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
    toast.success(t('negocio.linkCopied'), { title: t('negocio.linkCopiedTitle') })
  } catch {
    toast.error(t('negocio.linkCopyError'), { title: t('negocio.error') })
  } finally {
    isCopyingLink.value = false
  }
}

const isSharingLink = ref(false)
const sharePublicLink = async () => {
  if (!publicUrl.value || isSharingLink.value) return
  isSharingLink.value = true
  const shareTitle = businessProfile.value?.display_name || t('negocio.myBusiness')
  const shareText = `¡Hazme tu pedido en línea aquí! ${publicUrl.value}`
  try {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      await (navigator as any).share({
        title: shareTitle,
        text: shareText,
        url: publicUrl.value,
      })
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener,noreferrer')
    }
  } catch (err: any) {
    if (err?.name !== 'AbortError') {
      toast.error(t('negocio.linkShareError'), { title: t('negocio.error') })
    }
  } finally {
    isSharingLink.value = false
  }
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
      newState ? t('negocio.businessVisible') : t('negocio.businessHidden'),
      { title: newState ? t('negocio.businessActivated') : t('negocio.businessHiddenTitle') }
    )
  } catch (error: any) {
    toast.error(error.data?.detail || t('negocio.toggleError'), { title: t('negocio.error') })
  } finally {
    isTogglingActive.value = false
  }
}

// ─── Toggle online orders (warocol.com#2240) ───
const isTogglingOnlineOrders = ref(false)
const toggleOnlineOrders = async () => {
  if (!businessProfile.value || isTogglingOnlineOrders.value) return
  isTogglingOnlineOrders.value = true
  const newState = !businessProfile.value.accepts_online_orders
  try {
    await $fetch('/api/api/tenant/public-profile', {
      method: 'PATCH',
      body: { accepts_online_orders: newState },
    })
    editForm.accepts_online_orders = newState
    await refreshBusinessProfileCaches()
    toast.success(
      newState ? t('negocio.onlineOrdersEnabled') : t('negocio.onlineOrdersDisabled'),
      {
        title: newState
          ? t('negocio.onlineOrdersEnabledTitle')
          : t('negocio.onlineOrdersDisabledTitle'),
      },
    )
  } catch (error: any) {
    toast.error(
      formatApiValidationError(error.data?.detail, t('negocio.toggleError')),
      { title: t('negocio.error') },
    )
  } finally {
    isTogglingOnlineOrders.value = false
  }
}

// ─── Image upload modal ───
const imageModalOpen = ref(false)
const imageModalType = ref<'logo' | 'banner'>('logo')
type ImageField = 'logo_url' | 'banner_url'
type ProfilePatchResponse = { data?: Record<string, any> } & Record<string, any>

const unwrapProfileResponse = (response: ProfilePatchResponse | null | undefined) => {
  return response?.data && typeof response.data === 'object' ? response.data : response
}

const refreshBusinessProfileCaches = async () => {
  await Promise.all([refreshProfile(), tenantsStore.fetchBusinessProfile()])
}

const openImageModal = (type: 'logo' | 'banner') => {
  imageModalType.value = type
  imageModalOpen.value = true
}

const handleImageUploaded = async (url: string) => {
  const field: ImageField = imageModalType.value === 'logo' ? 'logo_url' : 'banner_url'
  imageModalOpen.value = false

  // If profile exists, auto-save the image URL immediately via PATCH
  if (businessProfile.value) {
    try {
      const res = await $fetch<ProfilePatchResponse>('/api/api/tenant/public-profile', {
        method: 'PATCH',
        body: { [field]: url },
      })
      const patchedProfile = unwrapProfileResponse(res)
      if (patchedProfile?.[field] !== url) {
        throw new Error('Image URL was not persisted')
      }
      editForm[field] = url
      await refreshBusinessProfileCaches()
      toast.success(t('negocio.imageSaved'), { title: t('negocio.imageUploaded') })
    } catch {
      toast.error(t('negocio.imageSaveError'), { title: t('negocio.error') })
    }
    return
  }

  // No profile yet — enter edit mode so user can complete required fields
  if (!isEditingAny.value) enterBrandEdit()
  editForm[field] = url
  toast.success(t('negocio.imageReady'), { title: t('negocio.imageUploaded') })
}

// ─── Auto-enter edit mode when no profile ───
// NOTE: No { immediate: true } — with server: false, useAsyncData hasn't started
// on the first synchronous tick (pending=false, data=null), which would incorrectly
// trigger enterBrandEdit() on every navigation. This watch fires once the fetch
// actually completes (pending goes true→false), so the nil-profile check is reliable.
watch(
  [isBusinessProfileLoading, businessProfile] as const,
  ([loading, profile]) => {
    if (!loading && !profile && !isEditingAny.value) {
      enterBrandEdit()
    }
  }
)

// ─── Refresh handler ───
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
onMounted(() => { setRefreshHandler(refreshProfile) })
registerProgressiveLoading(isRefreshing)
onUnmounted(() => { clearRefreshHandler(refreshProfile) })
</script>
