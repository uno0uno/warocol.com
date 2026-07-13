<template>
  <Transition name="sheet">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-[60] flex items-end md:items-center justify-center md:p-4 bg-overlay-backdrop/50"
      @click.self="handleClose"
    >
      <div class="bottom-sheet-panel bg-surface w-full md:max-w-md border border-border flex flex-col rounded-t-2xl md:rounded-2xl shadow-2xl max-h-[85vh] md:max-h-[90vh]" @click.stop>

        <!-- Mobile drag handle -->
        <div class="flex justify-center pt-3 pb-1 md:hidden flex-shrink-0" aria-hidden="true">
          <div class="w-10 h-1 rounded-full bg-border"></div>
        </div>

        <!-- Header -->
        <div class="p-5 border-b border-border flex items-center justify-between flex-shrink-0">
          <div>
            <h2 class="text-xl font-bold text-text-primary">
              {{ headerTitle }}
            </h2>
            <p class="text-sm text-text-secondary mt-0.5">
              {{ headerSubtitle }}
            </p>
          </div>
          <button
            @click="handleClose"
            :aria-label="t('pos.customer.closeModalAria')"
            class="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors"
          >
            <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- STATE: Search -->
        <template v-if="state === 'search'">
          <!-- Search Input -->
          <div class="px-4 pt-4 pb-3 flex-shrink-0">
            <div class="relative">
              <span class="absolute start-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none">
                <svg class="h-[1em] w-[1em]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </span>
              <input
                ref="searchInputRef"
                v-model="searchQuery"
                type="text"
                :placeholder="t('pos.customer.searchPlaceholder')"
                class="w-full ps-10 pe-10 py-3 border-2 border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-text-primary bg-background text-base"
                autocomplete="off"
              />
              <button
                v-if="searchQuery"
                @click="searchQuery = ''"
                :aria-label="t('pos.customer.clearSearchAria')"
                class="absolute end-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
              >
                <svg class="h-[1em] w-[1em]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Results Area (scrollable) -->
          <div class="flex-1 overflow-y-auto">

            <!-- Empty state: no query -->
            <div v-if="!searchQuery" class="flex flex-col items-center justify-center py-8 text-text-secondary px-6">
              <svg class="h-12 w-12 mb-3 opacity-40" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
              <p class="text-sm font-medium text-text-primary">{{ t('pos.customer.searchCustomer') }}</p>
              <p class="text-xs mt-1 text-center">{{ t('pos.customer.searchEmptyHint') }}</p>
            </div>

            <!-- Loading skeleton -->
            <div v-else-if="isSearching" class="p-4 space-y-3">
              <div v-for="i in 3" :key="i" class="flex items-center gap-3 animate-pulse">
                <div class="w-10 h-10 rounded-full bg-surface-secondary flex-shrink-0"></div>
                <div class="flex-1 space-y-2">
                  <div class="h-4 bg-surface-secondary rounded w-2/3"></div>
                  <div class="h-3 bg-surface-secondary rounded w-1/2"></div>
                </div>
              </div>
            </div>

            <!-- Results list -->
            <div v-else-if="searchResults.length > 0">
              <button
                v-for="customer in searchResults"
                :key="String(customer.id)"
                @click="selectCustomer(customer)"
                class="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-secondary transition-colors text-start min-h-[56px] border-b border-border/50 last:border-b-0"
              >
                <div class="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {{ customerInitial(customer) }}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-text-primary truncate">{{ customer.name || t('pos.customer.noName') }}</p>
                  <p class="text-sm text-text-secondary truncate">{{ customer.phone_number || t('pos.customer.noPhone') }}</p>
                  <p v-if="customer.fiscal_id" class="text-xs text-text-tertiary truncate">
                    {{ customer.fiscal_id_type || t('pos.customer.docType.doc') }}: {{ customer.fiscal_id }}
                  </p>
                </div>
                <svg class="h-[1em] w-[1em] text-text-tertiary flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>

            <!-- No results found -->
            <div v-else-if="debouncedQuery && !isSearching" class="p-6 text-center">
              <div class="w-12 h-12 rounded-full bg-surface-secondary flex items-center justify-center mx-auto mb-3">
                <svg class="h-6 w-6 text-text-tertiary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.182 16.318A4.486 4.486 0 0 0 12.016 15a4.486 4.486 0 0 0-3.198 1.318M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
                </svg>
              </div>
              <p class="font-medium text-text-primary mb-1">{{ t('pos.customer.noResultsFor', { query: debouncedQuery }) }}</p>
              <p class="text-sm text-text-secondary mb-5">{{ t('pos.customer.noResultsHint') }}</p>

              <div class="space-y-3">
                <button
                  @click="state = 'create'"
                  class="w-full min-h-[44px] px-4 py-3 bg-action-primary-bg text-action-primary-text font-semibold rounded-xl hover:bg-action-primary-hover-bg active:scale-95 transition-all"
                >
                  {{ t('pos.customer.createNewCustomer') }}
                </button>
                <button
                  @click="selectGenericCustomer"
                  :disabled="isCreatingGeneric"
                  class="w-full min-h-[44px] px-4 py-3 bg-surface border border-border text-text-primary font-medium rounded-xl hover:bg-surface-secondary active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span v-if="isCreatingGeneric">{{ t('pos.customer.processing') }}</span>
                  <span v-else>{{ t('pos.customer.continueWithoutData') }}</span>
                </button>
              </div>
            </div>

          </div>

          <!-- Footer: always-visible actions as cards -->
          <div class="px-4 pt-3 pb-6 md:pb-4 border-t border-border flex-shrink-0 grid grid-cols-2 gap-3">
            <!-- New customer card -->
            <button
              @click="state = 'create'"
              class="flex flex-col items-center justify-center gap-2 py-4 bg-surface border-2 border-border rounded-xl hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all active:scale-95 min-h-[88px]"
            >
              <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <span class="font-semibold text-sm text-text-primary leading-tight text-center">{{ t('pos.customer.newCustomer') }}</span>
            </button>

            <!-- Sin datos card -->
            <button
              @click="selectGenericCustomer"
              :disabled="isCreatingGeneric"
              class="flex flex-col items-center justify-center gap-2 py-4 bg-surface border-2 border-border rounded-xl hover:bg-surface-secondary transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed min-h-[88px]"
            >
              <div class="w-10 h-10 rounded-xl bg-surface-secondary text-text-secondary flex items-center justify-center">
                <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              </div>
              <span class="font-semibold text-sm text-text-primary leading-tight text-center">
                {{ isCreatingGeneric ? t('common.loading') : t('pos.customer.noData') }}
              </span>
            </button>
          </div>
        </template>

        <!-- STATE: Create new customer -->
        <template v-if="state === 'create'">
          <form @submit.prevent="handleCreate" class="flex flex-col flex-1 overflow-hidden">
            <div class="p-5 space-y-4 flex-1 overflow-y-auto">

              <!-- Phone -->
              <div class="flex flex-col gap-1">
                <label for="new-phone" class="text-sm font-medium text-text-primary">
                  {{ t('pos.customer.phone') }} <span class="text-destructive">*</span>
                </label>
                <input
                  id="new-phone"
                  v-model="createForm.phone_number"
                  type="tel"
                  placeholder="3001234567"
                  required
                  :disabled="isCreating"
                  class="w-full px-4 py-3 border-2 border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-text-primary bg-background text-base disabled:opacity-50"
                />
              </div>

              <!-- Name -->
              <div class="flex flex-col gap-1">
                <label for="new-name" class="text-sm font-medium text-text-primary">
                  {{ t('pos.customer.name') }} <span class="text-text-tertiary text-xs">{{ t('pos.checkout.optional') }}</span>
                </label>
                <input
                  id="new-name"
                  v-model="createForm.name"
                  type="text"
                  :placeholder="t('pos.customer.namePlaceholder')"
                  :disabled="isCreating"
                  class="w-full px-4 py-3 border-2 border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-text-primary bg-background text-base disabled:opacity-50"
                />
              </div>

              <!-- Email -->
              <div class="flex flex-col gap-1">
                <label for="new-email" class="text-sm font-medium text-text-primary">
                  {{ t('pos.customer.email') }} <span class="text-text-tertiary text-xs">{{ t('pos.checkout.optional') }}</span>
                </label>
                <input
                  id="new-email"
                  v-model="createForm.email"
                  type="email"
                  placeholder="juan@email.com"
                  :disabled="isCreating"
                  class="w-full px-4 py-3 border-2 border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-text-primary bg-background text-base disabled:opacity-50"
                />
              </div>

              <!-- Toggle: datos factura electrónica -->
              <div class="border-t border-border pt-4">
                <button
                  type="button"
                  :aria-expanded="wantsInvoice ? 'true' : 'false'"
                  aria-controls="fiscal-fields"
                  @click="wantsInvoice = !wantsInvoice"
                  class="w-full min-h-[44px] flex items-center justify-between gap-2 px-3 py-2 rounded-xl hover:bg-surface-secondary transition-colors"
                >
                  <span class="flex items-center gap-2 text-text-primary font-medium">
                    <svg class="h-[1em] w-[1em] text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
                    </svg>
                    {{ t('pos.customer.needsInvoice') }}
                  </span>
                  <svg :class="['h-[1em] w-[1em] text-text-tertiary transition-transform', wantsInvoice && 'rotate-180']" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>

                <div v-if="wantsInvoice" id="fiscal-fields" class="space-y-4 mt-3">
                  <!-- Tipo doc -->
                  <div class="flex flex-col gap-1">
                    <label for="new-fiscal-type" class="text-sm font-medium text-text-primary">
	                      {{ t('pos.customer.documentType') }} <span class="text-destructive">*</span>
                    </label>
                    <select
                      id="new-fiscal-type"
                      v-model="createForm.fiscal_id_type"
                      :disabled="isCreating"
                      class="w-full min-h-[44px] px-4 py-3 border-2 border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-text-primary bg-background text-base disabled:opacity-50"
                    >
	                      <option value="" disabled>{{ t('pos.customer.selectDocumentType') }}</option>
	                      <option value="CC">{{ t('pos.customer.docType.cc') }}</option>
	                      <option value="NIT">{{ t('pos.customer.docType.nit') }}</option>
	                      <option value="CE">{{ t('pos.customer.docType.ce') }}</option>
	                      <option value="PA">{{ t('pos.customer.docType.pa') }}</option>
	                      <option value="TI">{{ t('pos.customer.docType.ti') }}</option>
                    </select>
                  </div>

                  <!-- Número doc -->
                  <div class="flex flex-col gap-1">
                    <label for="new-fiscal-id" class="text-sm font-medium text-text-primary">
	                      {{ t('pos.customer.documentNumber') }} <span class="text-destructive">*</span>
                    </label>
                    <input
                      id="new-fiscal-id"
                      v-model="createForm.fiscal_id"
                      type="text"
                      @input="createForm.fiscal_id = normalizeFiscalDocumentId(createForm.fiscal_id)"
	                      :placeholder="createForm.fiscal_id_type === 'NIT' ? t('pos.customer.nitPlaceholder') : t('pos.customer.idPlaceholder')"
                      :disabled="isCreating"
                      class="w-full px-4 py-3 border-2 border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-text-primary bg-background text-base disabled:opacity-50"
                    />
                    <p v-if="createForm.fiscal_id_type === 'NIT'" class="text-xs text-text-tertiary">
	                      {{ t('pos.customer.nitWithoutDv') }}
                    </p>
                  </div>

                  <!-- Razón social / legal name -->
                  <div class="flex flex-col gap-1">
                    <label for="new-fiscal-name" class="text-sm font-medium text-text-primary">
                      {{ createForm.fiscal_id_type === 'NIT' ? t('pos.customer.businessName') : t('pos.customer.legalName') }}
                      <span class="text-destructive">*</span>
                    </label>
                    <input
                      id="new-fiscal-name"
                      v-model="createForm.fiscal_business_name"
                      type="text"
	                      :placeholder="createForm.fiscal_id_type === 'NIT' ? t('pos.customer.businessPlaceholder') : t('pos.customer.personPlaceholder')"
                      :disabled="isCreating"
                      class="w-full px-4 py-3 border-2 border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-text-primary bg-background text-base disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              <!-- Error -->
              <div v-if="createError" class="bg-state-danger-bg  border border-state-danger-border  rounded-xl p-4 flex items-start gap-3">
                <svg class="h-[1em] w-[1em] text-state-danger-text  flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                <p class="text-sm text-state-danger-text ">{{ createError }}</p>
              </div>

            </div>

            <!-- Footer buttons -->
            <div class="p-4 pb-6 md:pb-4 border-t border-border flex-shrink-0 flex gap-3">
              <button
                type="button"
                @click="state = 'search'"
                class="min-h-[44px] px-4 py-3 bg-surface border border-border text-text-secondary font-medium rounded-xl hover:bg-surface-secondary transition-colors"
              >
	                ← {{ t('pos.customer.back') }}
              </button>
              <button
                type="submit"
                :disabled="!canSubmitCreate || isCreating"
                class="flex-1 min-h-[44px] px-4 py-3 bg-action-primary-bg text-action-primary-text font-semibold rounded-xl hover:bg-action-primary-hover-bg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CommonsTheCustomLoader v-if="isCreating" size="small" />
                <span>{{ isCreating ? t('common.loading') : t('pos.customer.saveAndContinue') }}</span>
              </button>
            </div>
          </form>
        </template>

        <!-- STATE: Edit fiscal data of an already-identified customer -->
        <template v-if="state === 'edit-fiscal'">
          <form @submit.prevent="handleSaveFiscal" class="flex flex-col flex-1 overflow-hidden">
            <div class="p-5 space-y-4 flex-1 overflow-y-auto">

              <p class="text-sm text-text-secondary">
	                {{ t('pos.customer.invoiceDataBody') }}
              </p>

              <!-- Tipo doc -->
              <div class="flex flex-col gap-1">
                <label for="edit-fiscal-type" class="text-sm font-medium text-text-primary">
	                  {{ t('pos.customer.documentType') }} <span class="text-destructive">*</span>
                </label>
                <select
                  id="edit-fiscal-type"
                  v-model="fiscalForm.fiscal_id_type"
                  :disabled="isCreating"
                  class="w-full min-h-[44px] px-4 py-3 border-2 border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-text-primary bg-background text-base disabled:opacity-50"
                >
	                  <option value="" disabled>{{ t('pos.customer.selectDocumentType') }}</option>
	                  <option value="CC">{{ t('pos.customer.docType.cc') }}</option>
	                  <option value="NIT">{{ t('pos.customer.docType.nit') }}</option>
	                  <option value="CE">{{ t('pos.customer.docType.ce') }}</option>
	                  <option value="PA">{{ t('pos.customer.docType.pa') }}</option>
	                  <option value="TI">{{ t('pos.customer.docType.ti') }}</option>
                </select>
              </div>

              <!-- Número doc -->
              <div class="flex flex-col gap-1">
                <label for="edit-fiscal-id" class="text-sm font-medium text-text-primary">
	                  {{ t('pos.customer.documentNumber') }} <span class="text-destructive">*</span>
                </label>
                <input
                  id="edit-fiscal-id"
                  v-model="fiscalForm.fiscal_id"
                  type="text"
                  @input="fiscalForm.fiscal_id = normalizeFiscalDocumentId(fiscalForm.fiscal_id)"
	                  :placeholder="fiscalForm.fiscal_id_type === 'NIT' ? t('pos.customer.nitPlaceholder') : t('pos.customer.idPlaceholder')"
                  :disabled="isCreating"
                  class="w-full px-4 py-3 border-2 border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-text-primary bg-background text-base disabled:opacity-50"
                />
                <p v-if="fiscalForm.fiscal_id_type === 'NIT'" class="text-xs text-text-tertiary">
	                  {{ t('pos.customer.nitWithoutDv') }}
                </p>
              </div>

              <!-- Razón social / legal name -->
              <div class="flex flex-col gap-1">
                <label for="edit-fiscal-name" class="text-sm font-medium text-text-primary">
                  {{ fiscalForm.fiscal_id_type === 'NIT' ? t('pos.customer.businessName') : t('pos.customer.legalName') }}
                  <span class="text-destructive">*</span>
                </label>
                <input
                  id="edit-fiscal-name"
                  v-model="fiscalForm.fiscal_business_name"
                  type="text"
	                  :placeholder="fiscalForm.fiscal_id_type === 'NIT' ? t('pos.customer.businessPlaceholder') : t('pos.customer.personPlaceholder')"
                  :disabled="isCreating"
                  class="w-full px-4 py-3 border-2 border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-text-primary bg-background text-base disabled:opacity-50"
                />
              </div>

              <!-- Error -->
              <div v-if="createError" class="bg-state-danger-bg  border border-state-danger-border  rounded-xl p-4 flex items-start gap-3">
                <svg class="h-[1em] w-[1em] text-state-danger-text  flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                <p class="text-sm text-state-danger-text ">{{ createError }}</p>
              </div>

            </div>

            <!-- Footer buttons -->
            <div class="p-4 pb-6 md:pb-4 border-t border-border flex-shrink-0 flex gap-3">
              <button
                type="button"
                @click="handleClose"
                class="min-h-[44px] px-4 py-3 bg-surface border border-border text-text-secondary font-medium rounded-xl hover:bg-surface-secondary transition-colors"
              >
	                {{ t('pos.customer.cancel') }}
              </button>
              <button
                type="submit"
                :disabled="!canSubmitFiscal || isCreating"
                class="flex-1 min-h-[44px] px-4 py-3 bg-action-primary-bg text-action-primary-text font-semibold rounded-xl hover:bg-action-primary-hover-bg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CommonsTheCustomLoader v-if="isCreating" size="small" />
                <span>{{ isCreating ? t('common.loading') : t('pos.customer.saveData') }}</span>
              </button>
            </div>
          </form>
        </template>

      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })
import { ref, computed, watch, nextTick } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { $fetch } from 'ofetch'
import { normalizeFiscalDocumentId } from '~/utils/fiscalDocument'
import { posDebugLog, posDebugSerializeError } from '~/utils/posDebugLog'

type FiscalIdType = 'CC' | 'NIT' | 'CE' | 'PA' | 'TI' | ''

interface FiscalFields {
  fiscal_id_type: FiscalIdType | null
  fiscal_id: string | null
  fiscal_business_name: string | null
  fiscal_email: string | null
}

interface CustomerSummary {
  id: string
  name: string | null
  phone_number: string | null
  email: string | null
  fiscal_id: string | null
  fiscal_id_type: string | null
}

interface SelectedCustomer extends FiscalFields {
  id: string
  name: string | null
  phone_number: string | null
  email: string | null
}

interface Props {
  modelValue: boolean
  // When provided, the modal opens directly into the fiscal-edit state for an
  // already-identified customer (used by the POS checkout t('pos.customer.requestInvoiceData') button).
  editCustomer?: SelectedCustomer | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'customer-identified', customer: SelectedCustomer): void
  (e: 'fiscal-updated', customer: SelectedCustomer): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// UI state
const state = ref<'search' | 'create' | 'edit-fiscal'>('search')
const searchInputRef = ref<HTMLInputElement | null>(null)

// Search state (two-tier: raw input + committed debounced value)
const searchQuery = ref('')
const debouncedQuery = ref('')
const isSearching = ref(false)
const searchResults = ref<CustomerSummary[]>([])
const isCreatingGeneric = ref(false)

// Create form state
const wantsInvoice = ref(false)
const createForm = ref({
  phone_number: '',
  name: '',
  email: '',
  fiscal_id_type: '' as FiscalIdType,
  fiscal_id: '',
  fiscal_business_name: '',
})
const isCreating = ref(false)
const createError = ref('')

// Fiscal-only edit form (state === 'edit-fiscal')
const fiscalForm = ref({
  customer_id: '',
  fiscal_id_type: '' as FiscalIdType,
  fiscal_id: '',
  fiscal_business_name: '',
})

const headerTitle = computed(() => {
  if (state.value === 'create') return t('pos.customer.newCustomer')
  if (state.value === 'edit-fiscal') return t('pos.customer.invoiceData')
  return t('pos.customer.searchCustomer')
})
const headerSubtitle = computed(() => {
  if (state.value === 'create') return t('pos.customer.newCustomerHint')
  if (state.value === 'edit-fiscal') return t('pos.customer.invoiceDataHint')
  return t('pos.customer.searchHint')
})

const canSubmitCreate = computed(() => {
  if (!createForm.value.phone_number) return false
  if (!wantsInvoice.value) return true
  return Boolean(
    createForm.value.fiscal_id_type
      && createForm.value.fiscal_id
      && createForm.value.fiscal_business_name,
  )
})

const canSubmitFiscal = computed(() => Boolean(
  fiscalForm.value.fiscal_id_type
    && fiscalForm.value.fiscal_id
    && fiscalForm.value.fiscal_business_name,
))

// Debounced search — commits query and triggers fetch after 300ms
const commitSearch = useDebounceFn(async (q: string) => {
  debouncedQuery.value = q
  if (!q) {
    searchResults.value = []
    isSearching.value = false
    return
  }
  try {
    const data = await $fetch<{ success: boolean; data: CustomerSummary[] }>(
      '/api/customers/search-by-query',
      { query: { q, limit: 20 } }
    )
    searchResults.value = data?.data ?? []
  } catch {
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}, 300)

watch(searchQuery, (val) => {
  const trimmed = val.trim()
  if (!trimmed) {
    debouncedQuery.value = ''
    searchResults.value = []
    isSearching.value = false
    return
  }
  isSearching.value = true
  commitSearch(trimmed)
})

// Reset when modal opens
watch(() => props.modelValue, (open) => {
  if (!open) return

  searchQuery.value = ''
  debouncedQuery.value = ''
  searchResults.value = []
  isSearching.value = false
  wantsInvoice.value = false
  createForm.value = {
    phone_number: '', name: '', email: '',
    fiscal_id_type: '', fiscal_id: '', fiscal_business_name: '',
  }
  createError.value = ''
  isCreatingGeneric.value = false
  isHydratingSelection.value = false
  selectionError.value = ''

  if (props.editCustomer) {
    // Fiscal-edit flow: skip search/create and prefill from the active customer
    state.value = 'edit-fiscal'
    fiscalForm.value = {
      customer_id: props.editCustomer.id,
      fiscal_id_type: (props.editCustomer.fiscal_id_type as FiscalIdType) || '',
      fiscal_id: props.editCustomer.fiscal_id || '',
      fiscal_business_name:
        props.editCustomer.fiscal_business_name
          || props.editCustomer.name
          || '',
    }
  } else {
    state.value = 'search'
    fiscalForm.value = {
      customer_id: '', fiscal_id_type: '', fiscal_id: '', fiscal_business_name: '',
    }
    nextTick(() => searchInputRef.value?.focus())
  }
})

// Helper
const customerInitial = (c: CustomerSummary) => {
  const n = c.name?.trim()
  if (n) return n.charAt(0).toUpperCase()
  const p = c.phone_number?.trim()
  if (p) return p.charAt(0)
  return '?'
}

// Select from results
const isHydratingSelection = ref(false)
const selectionError = ref('')

const selectCustomer = async (customer: CustomerSummary) => {
  if (isHydratingSelection.value) return
  isHydratingSelection.value = true
  selectionError.value = ''
  try {
    const res = await $fetch<CustomerApiResponse>(`/api/customers/${customer.id}`)
    if (res?.success) {
      emit('customer-identified', toSelected(res.data))
      emit('update:modelValue', false)
      return
    }
    // Fallback: emit what we have (no fiscal fields)
    emit('customer-identified', {
      id: String(customer.id),
      name: customer.name,
      phone_number: customer.phone_number,
      email: customer.email,
      fiscal_id_type: null,
      fiscal_id: null,
      fiscal_business_name: null,
      fiscal_email: null,
    })
    emit('update:modelValue', false)
  } catch (e: any) {
    selectionError.value = e?.data?.detail || e?.data?.message || e?.message || t('pos.customer.loadError')
  } finally {
    isHydratingSelection.value = false
  }
}

type CustomerApiResponse = {
  success: boolean
  data: {
    id: string
    name: string | null
    phone_number: string | null
    email: string | null
    fiscal_id_type?: FiscalIdType | null
    fiscal_id?: string | null
    fiscal_business_name?: string | null
    fiscal_email?: string | null
  }
}

const toSelected = (data: CustomerApiResponse['data']): SelectedCustomer => ({
  id: data.id,
  name: data.name,
  phone_number: data.phone_number,
  email: data.email,
  fiscal_id_type: (data.fiscal_id_type as FiscalIdType) ?? null,
  fiscal_id: data.fiscal_id ?? null,
  fiscal_business_name: data.fiscal_business_name ?? null,
  fiscal_email: data.fiscal_email ?? null,
})

// Generic/walk-in customer
const selectGenericCustomer = async () => {
  isCreatingGeneric.value = true
  try {
    const response = await $fetch<CustomerApiResponse>('/api/customers/search-or-create', {
      method: 'POST',
      body: { phone_number: '0000000000', name: t('pos.customer.customerNoData') }
    })
    if (response.success) {
      emit('customer-identified', toSelected(response.data))
      emit('update:modelValue', false)
    }
  } catch (e: any) {
    console.error('Error creating generic customer:', e)
  } finally {
    isCreatingGeneric.value = false
  }
}

// Create new customer (with optional fiscal data)
const handleCreate = async () => {
  if (!canSubmitCreate.value) return
  isCreating.value = true
  createError.value = ''
  posDebugLog('customer-modal', 'handleCreate:start', {
    phone: createForm.value.phone_number,
    wantsInvoice: wantsInvoice.value,
  })
  try {
    const fiscalPayload = wantsInvoice.value ? {
      fiscal_id_type: createForm.value.fiscal_id_type || null,
      fiscal_id: normalizeFiscalDocumentId(createForm.value.fiscal_id) || null,
      fiscal_business_name: createForm.value.fiscal_business_name?.trim() || null,
      fiscal_email: createForm.value.email?.trim() || null,
    } : {}

    const response = await $fetch<CustomerApiResponse>('/api/customers/search-or-create', {
      method: 'POST',
      body: {
        phone_number: createForm.value.phone_number,
        name: createForm.value.name || null,
        email: createForm.value.email || null,
        ...fiscalPayload,
      }
    })
    if (response.success) {
      posDebugLog('customer-modal', 'handleCreate:ok', {
        customerId: response.data.id,
        phone: response.data.phone_number,
      })
      emit('customer-identified', toSelected(response.data))
      emit('update:modelValue', false)
    } else {
      posDebugLog('customer-modal', 'handleCreate:unexpected-response', { success: response.success })
    }
  } catch (e: any) {
    posDebugLog('customer-modal', 'handleCreate:failed', {
      ...posDebugSerializeError(e),
    })
    createError.value = e.data?.message || e.message || t('pos.customer.saveCustomerError')
  } finally {
    isCreating.value = false
  }
}

// Save fiscal data on an already-identified customer
const handleSaveFiscal = async () => {
  if (!canSubmitFiscal.value || !fiscalForm.value.customer_id) return
  isCreating.value = true
  createError.value = ''
  try {
    const response = await $fetch<CustomerApiResponse>(
      `/api/customers/${fiscalForm.value.customer_id}`,
      {
        method: 'PATCH',
        body: {
          fiscal_id_type: fiscalForm.value.fiscal_id_type || null,
          fiscal_id: normalizeFiscalDocumentId(fiscalForm.value.fiscal_id) || null,
          fiscal_business_name: fiscalForm.value.fiscal_business_name?.trim() || null,
        },
      },
    )
    if (response.success) {
      emit('fiscal-updated', toSelected(response.data))
      emit('update:modelValue', false)
    }
  } catch (e: any) {
    createError.value = e.data?.message || e.message || t('pos.customer.saveDataError')
  } finally {
    isCreating.value = false
  }
}

const handleClose = () => {
  emit('update:modelValue', false)
}
</script>

<style scoped>
/* Backdrop fade */
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.25s ease;
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

/* Panel — mobile: slide up from bottom */
.sheet-enter-active .bottom-sheet-panel,
.sheet-leave-active .bottom-sheet-panel {
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}
.sheet-enter-from .bottom-sheet-panel,
.sheet-leave-to .bottom-sheet-panel {
  transform: translateY(100%);
}

/* Panel — desktop: no slide, just backdrop fade */
@media (min-width: 768px) {
  .sheet-enter-from .bottom-sheet-panel,
  .sheet-leave-to .bottom-sheet-panel {
    transform: translateY(0);
  }
}
</style>
