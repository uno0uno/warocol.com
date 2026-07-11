<template>
  <div class="page-layout">
    <UiSubmitBusyOverlay
      :busy="isSubmitting"
      :label="isDeleting ? t('finanzas.gastos.deleting') : t('finanzas.gastos.updating')"
      :hint="isDeleting ? t('finanzas.gastos.deletingBody') : t('finanzas.gastos.updatingBody')"
      variant="glass"
      indicator="matrix"
    />

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <CommonsTheErrorState v-else-if="fetchError" />

    <!-- Main Content -->
    <div v-else-if="expense">

      <!-- Navigation Header -->
      <div class="flex items-center gap-3 mb-4">
        <NuxtLink
          to='/finanzas/gastos'
          class="flex items-center gap-2 px-4 py-2 bg-surface border-2 border-border text-text-primary rounded-lg hover:border-primary transition-colors text-sm font-medium"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>{{ t('finanzas.common.back') }}</span>
        </NuxtLink>
        <button
          v-if="!isEditing"
          @click="deleteExpense"
          class="flex items-center gap-2 px-4 py-2 bg-surface border-2 border-border text-destructive rounded-lg hover:border-destructive hover:bg-destructive/10 transition-colors text-sm font-medium"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span>{{ t('finanzas.common.delete') }}</span>
        </button>
      </div>

      <!-- Header Card -->
      <div class="bg-surface border-2 border-border rounded-lg mb-6">
        <div class="p-6">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-y-8 gap-x-6">
            <!-- Expense Number -->
            <div v-if="expense.expenseNumber" class="flex items-start space-x-3">
              <div class="bg-background p-3 rounded-lg border border-border flex-shrink-0">
                <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
              </div>
              <div class="space-y-1">
                <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  {{ t('finanzas.gastos.colNumber') }}
                </p>
                <p class="text-lg font-mono font-semibold text-text-primary">
                  {{ expense.expenseNumber }}
                </p>
              </div>
            </div>

            <!-- Expense Category -->
            <div class="flex items-start space-x-3">
              <div class="bg-background p-3 rounded-lg border border-border flex-shrink-0">
                <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
                </svg>
              </div>
              <div class="space-y-1">
                <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  {{ t('finanzas.gastos.colCategory') }}
                </p>
                <p class="text-lg font-semibold text-text-primary">
                  {{ expense.category?.categoryName || t('finanzas.common.noCategory') }}
                </p>
              </div>
            </div>

            <!-- Date -->
            <div class="flex items-start space-x-3">
              <div class="bg-background p-3 rounded-lg border border-border flex-shrink-0">
                <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div class="space-y-1">
                <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  {{ t('finanzas.gastos.colDate') }}
                </p>
                <p class="text-lg font-semibold text-text-primary">
                  {{ formatCalendarDate(expense.transactionDate) }}
                </p>
              </div>
            </div>

            <!-- Amount -->
            <div class="flex items-start space-x-3">
              <div class="bg-background p-3 rounded-lg border border-border flex-shrink-0">
                <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="space-y-1">
                <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  {{ t('finanzas.gastos.colAmount') }}
                </p>
                <p class="text-lg font-semibold text-primary">
                  {{ formatCurrency(expense.amount) }}
                </p>
              </div>
            </div>

            <!-- Payment Method -->
            <div class="flex items-start space-x-3">
              <div class="bg-background p-3 rounded-lg border border-border flex-shrink-0">
                <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div class="space-y-1">
                <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  {{ t('finanzas.gastos.methodLabel').replace(':', '') }}
                </p>
                <p class="text-lg font-semibold text-text-primary">
                  {{ resolvePaymentLabel(expense.paymentMethod, expense.paymentMethodId) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Form Content -->
      <form @submit.prevent="handleSubmit">
        <div class="bg-surface border-2 border-border rounded-lg mb-4 sm:mb-6">
          <div class="p-4 sm:p-6">
            <div class="flex justify-between items-center mb-4 sm:mb-6">
              <h3 class="text-base sm:text-lg font-semibold text-text-primary flex items-center space-x-2">
                <svg class="w-5 h-5 sm:w-6 sm:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>{{ t('finanzas.gastos.detailTitle') }}</span>
              </h3>
              <button
                v-if="!isEditing"
                type="button"
                @click="startEditing"
                class="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium"
              >
                {{ t('common.edit') }}
              </button>
            </div>

            <!-- View Mode - Table Format -->
            <div v-if="!isEditing">
              <!-- Mobile: Card View -->
              <div class="md:hidden space-y-3">
                <div class="bg-surface rounded-xl transition-shadow border border-border">
                  <div class="p-4">
                    <!-- Main Content with Dashed Border -->
                    <div class="border-2 border-dashed border-border rounded-lg p-3 mb-3">
                      <!-- Description -->
                      <div class="mb-3">
                        <p class="text-xs text-text-secondary mb-1">{{ t('finanzas.gastos.colDesc') }}</p>
                        <h4 class="text-sm font-bold text-text-primary">
                          {{ expense.description || t('finanzas.gastos.noDesc') }}
                        </h4>
                      </div>

                      <!-- Amount -->
                      <div class="flex items-end justify-between pt-2 border-t border-border">
                        <div>
                          <p class="text-xs text-text-secondary mb-0.5">{{ t('finanzas.gastos.colAmount') }}</p>
                          <p class="text-2xl font-bold text-primary">
                            {{ formatCurrency(expense.amount) }}
                          </p>
                        </div>
                      </div>
                    </div>

                    <!-- Footer Stats -->
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <!-- Category -->
                        <div class="flex flex-col gap-0.5">
                          <div class="flex items-center gap-1">
                            <svg class="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            <span class="text-text-primary font-semibold text-xs">{{ expense.category?.categoryName || t('finanzas.common.noCategory') }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Recurring Info Card (Mobile) -->
                <div v-if="expense.isRecurring" class="bg-primary/5 border-l-4 border-primary rounded-lg p-4">
                  <div class="flex items-center gap-2 mb-3">
                    <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <p class="text-sm font-bold text-primary uppercase tracking-wide">{{ t('finanzas.gastos.recurringExpenseTitle') }}</p>
                  </div>
                  <div class="space-y-2">
                    <div>
                      <p class="text-xs text-text-secondary">{{ t('finanzas.gastos.frequency') }}</p>
                      <p class="text-sm font-medium text-text-primary">{{ formatFrequency(expense.frequency) }}</p>
                    </div>
                    <div>
                      <p class="text-xs text-text-secondary">{{ t('finanzas.gastos.ends') }}</p>
                      <p class="text-sm font-medium text-text-primary">
                        {{ expense.recurringEndDate ? formatDate(expense.recurringEndDate) : t('finanzas.gastos.noEndDate') }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Desktop: Table View -->
              <div class="hidden md:block overflow-x-auto">
                <table class="w-full border-2 border-border rounded-lg">
                  <thead class="bg-surface-secondary">
                    <tr>
                      <th class="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider border-b-2 border-border w-1/3">
                        {{ t('finanzas.gastos.field') }}
                      </th>
                      <th class="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider border-b-2 border-border">
                        {{ t('finanzas.gastos.value') }}
                      </th>
                    </tr>
                  </thead>
                  <tbody class="bg-surface divide-y divide-border">
                    <!-- Description Row -->
                    <tr class="hover:bg-surface-secondary/50 transition-colors">
                      <td class="px-4 py-3 text-sm font-medium text-text-secondary">
                        {{ t('finanzas.gastos.colDesc') }}
                      </td>
                      <td class="px-4 py-3 text-sm text-text-primary">
                        <p class="font-medium">{{ expense.description || t('finanzas.gastos.noDesc') }}</p>
                      </td>
                    </tr>

                    <!-- Category Row -->
                    <tr class="hover:bg-surface-secondary/50 transition-colors">
                      <td class="px-4 py-3 text-sm font-medium text-text-secondary">
                        {{ t('finanzas.gastos.colCategory') }}
                      </td>
                      <td class="px-4 py-3 text-sm text-text-primary">
                        <div class="flex items-center gap-2">
                          <svg class="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          <span class="font-medium">{{ expense.category?.categoryName || t('finanzas.common.noCategory') }}</span>
                        </div>
                      </td>
                    </tr>

                    <!-- Amount Row -->
                    <tr class="hover:bg-surface-secondary/50 transition-colors">
                      <td class="px-4 py-3 text-sm font-medium text-text-secondary">
                        {{ t('finanzas.gastos.colAmount') }}
                      </td>
                      <td class="px-4 py-3 text-sm text-text-primary">
                        <span class="font-bold text-primary text-lg">{{ formatCurrency(expense.amount) }}</span>
                      </td>
                    </tr>

                    <!-- Frequency Row -->
                    <tr v-if="expense.isRecurring" class="hover:bg-surface-secondary/50 transition-colors">
                      <td class="px-4 py-3 text-sm font-medium text-text-secondary">
                        {{ t('finanzas.gastos.frequency') }}
                      </td>
                      <td class="px-4 py-3 text-sm text-text-primary">
                        <div class="flex items-center gap-2">
                          <svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          <span class="font-medium">{{ formatFrequency(expense.frequency) }}</span>
                        </div>
                      </td>
                    </tr>

                    <!-- Recurring End Date Row -->
                    <tr v-if="expense.isRecurring" class="hover:bg-surface-secondary/50 transition-colors">
                      <td class="px-4 py-3 text-sm font-medium text-text-secondary">
                        {{ t('finanzas.gastos.ends') }}
                      </td>
                      <td class="px-4 py-3 text-sm text-text-primary">
                        <span class="font-medium">{{ expense.recurringEndDate ? formatDate(expense.recurringEndDate) : t('finanzas.gastos.noEndDate') }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Edit Mode -->
            <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <!-- Date -->
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  {{ t('finanzas.gastos.dateReq') }}
                </label>
                <input
                  type="date"
                  v-model="form.transactionDate"
                  required
                  class="input-base w-full px-4 py-2"
                />
              </div>

              <!-- Category -->
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  {{ t('finanzas.gastos.categoryReq') }}
                </label>
                <select
                  v-model="form.expenseCategoryId"
                  required
                  class="input-base w-full px-4 py-2"
                >
                  <option value="" disabled>{{ t('finanzas.gastos.selectCategory') }}</option>
                  <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                    {{ cat.categoryName }}
                  </option>
                </select>
              </div>

              <!-- Description -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-text-primary mb-2">
                  {{ t('finanzas.gastos.descReq') }}
                </label>
                <input
                  type="text"
                  v-model="form.description"
                  required
                  class="input-base w-full px-4 py-2"
                  :placeholder="t('finanzas.gastos.descPlaceholder')"
                />
              </div>

              <!-- Amount -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-text-primary mb-2">
                  {{ t('finanzas.gastos.amountReq') }}
                </label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">$</span>
                  <input
                    type="number"
                    v-model.number="form.amount"
                    required
                    min="0"
                    step="1"
                    class="input-base w-full pl-8 pr-4 py-2"
                    placeholder="0"
                  />
                </div>
              </div>

              <!-- Recurring Expense Checkbox -->
              <div class="md:col-span-2">
                <label class="flex items-center space-x-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    v-model="form.isRecurring"
                    class="w-5 h-5 text-primary border-border rounded focus:ring-2 focus:ring-primary focus:ring-offset-0"
                  />
                  <div>
                    <span class="text-sm font-medium text-text-primary group-hover:text-primary transition-colors">
                      {{ t('finanzas.gastos.recurringToggle') }}
                    </span>
                    <p class="text-xs text-text-secondary">
                      {{ t('finanzas.gastos.recurringHelp') }}
                    </p>
                  </div>
                </label>
              </div>

              <!-- Recurring Options (conditional) -->
              <div v-if="form.isRecurring" class="md:col-span-2 space-y-4 border-l-4 border-primary pl-4 sm:pl-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <!-- Frequency -->
                  <div>
                    <label class="block text-sm font-medium text-text-primary mb-2">
                      {{ t('finanzas.gastos.freqReq') }}
                    </label>
                    <select
                      v-model="form.frequency"
                      :required="form.isRecurring"
                      class="input-base w-full px-4 py-2"
                    >
                      <option value="" disabled>{{ t('finanzas.gastos.selectFrequency') }}</option>
                      <option value="weekly">{{ t('finanzas.gastos.weekly') }}</option>
                      <option value="biweekly">{{ t('finanzas.gastos.biweekly') }}</option>
                      <option value="monthly">{{ t('finanzas.gastos.monthly') }}</option>
                      <option value="quarterly">{{ t('finanzas.gastos.quarterly') }}</option>
                      <option value="yearly">{{ t('finanzas.gastos.yearly') }}</option>
                    </select>
                  </div>

                  <!-- Recurring End Date -->
                  <div>
                    <label class="block text-sm font-medium text-text-primary mb-2">
                      {{ t('finanzas.gastos.endDate') }}
                    </label>
                    <input
                      type="date"
                      v-model="form.recurringEndDate"
                      :min="form.transactionDate"
                      class="input-base w-full px-4 py-2"
                      :placeholder="t('finanzas.common.optional')"
                    />
                    <p class="text-xs text-text-secondary mt-1">
                      {{ t('finanzas.gastos.leaveEmptyNoEnd') }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Attachments Section -->
        <div class="bg-surface border-border border rounded-lg mb-4 sm:mb-6">
          <div class="p-4 sm:p-6">
            <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-4 sm:mb-6 flex items-center space-x-2">
              <svg class="w-5 h-5 sm:w-6 sm:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <span>{{ t('finanzas.gastos.attachmentsTitle') }}</span>
            </h3>

            <!-- Existing Attachments -->
            <div v-if="expense.attachments && expense.attachments.length > 0" class="mb-4">
              <p class="text-sm text-text-secondary mb-3">{{ t('finanzas.gastos.currentFiles', { count: expense.attachments.length }) }}</p>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div
                  v-for="attachment in expense.attachments"
                  :key="attachment.id"
                  class="flex items-center space-x-3 bg-background border border-border rounded-lg p-3"
                >
                  <a
                    :href="attachment.s3_url"
                    target="_blank"
                    class="flex items-center space-x-3 flex-1 min-w-0 hover:text-primary transition-colors"
                  >
                    <svg class="w-8 h-8 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-text-primary truncate">{{ attachment.original_filename }}</p>
                      <p class="text-xs text-text-secondary">{{ formatFileSize(attachment.file_size) }}</p>
                    </div>
                  </a>
                  <button
                    v-if="isEditing"
                    type="button"
                    @click="removeAttachment(attachment.id)"
                    class="text-destructive hover:text-destructive/80 flex-shrink-0"
                    :title="t('finanzas.gastos.removeFile')"
                    :aria-label="t('finanzas.gastos.removeFile')"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- Add New Attachments (Edit Mode) -->
            <div v-if="isEditing">
              <p class="text-sm text-text-secondary mb-3">{{ t('finanzas.gastos.addNewFiles') }}</p>
              <div class="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <input
                  ref="fileInput"
                  type="file"
                  @change="handleFileSelect"
                  accept="image/*,application/pdf"
                  multiple
                  class="hidden"
                />

                <div v-if="selectedFiles.length === 0">
                  <svg class="mx-auto h-12 w-12 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p class="mt-2 text-sm text-text-secondary">{{ t('finanzas.gastos.dragFiles') }}</p>
                  <button
                    type="button"
                    @click="$refs.fileInput.click()"
                    class="mt-2 btn-secondary px-4 py-2 rounded-lg text-sm"
                  >
                    {{ t('finanzas.gastos.selectFiles') }}
                  </button>
                </div>

                <div v-else class="space-y-2">
                  <div v-for="(file, index) in selectedFiles" :key="index" class="flex items-center justify-between bg-background p-3 rounded-lg">
                    <div class="flex items-center space-x-3">
                      <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div class="text-left">
                        <p class="text-sm font-medium text-text-primary">{{ file.name }}</p>
                        <p class="text-xs text-text-secondary">{{ formatFileSize(file.size) }}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      @click="removeFile(index)"
                      class="text-destructive hover:text-destructive/80"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <button
                    type="button"
                    @click="$refs.fileInput.click()"
                    class="btn-secondary px-4 py-2 rounded-lg text-sm w-full"
                  >
                    {{ t('finanzas.gastos.addFiles') }}
                  </button>
                </div>
              </div>
            </div>

            <p v-if="!isEditing && (!expense.attachments || expense.attachments.length === 0)" class="text-sm text-text-secondary text-center py-4">
              {{ t('finanzas.gastos.noAttachments') }}
            </p>
          </div>
        </div>

        <!-- Edit Actions -->
        <div v-if="isEditing" class="bg-surface border-t border-border shadow-lg mt-6">
          <div class="px-4 sm:px-6 md:px-8 py-3 sm:py-4">
            <div class="flex justify-end items-center gap-3">
              <button
                type="button"
                @click="cancelEditing"
                class="btn-secondary px-4 sm:px-6 py-2 rounded-lg text-sm sm:text-base"
              >
                {{ t('common.cancel') }}
              </button>
              <button
                type="submit"
                :disabled="isSubmitting || !isFormValid"
                class="btn-primary px-4 sm:px-6 py-2 rounded-lg disabled:opacity-50 text-sm sm:text-base bg-success hover:bg-success/90"
              >
                <span class="hidden sm:inline">{{ isSubmitting ? t('finanzas.gastos.saving') : t('finanzas.gastos.saveChanges') }}</span>
                <span class="sm:hidden">{{ isSubmitting ? '...' : t('common.save') }}</span>
              </button>
            </div>
          </div>
        </div>
      </form>

      <!-- Expense Change History Table -->
      <div class="mt-6">
        <GastosExpenseChangeHistoryTable :expense-id="expenseId" />
      </div>

      <!-- Recurring Instances Section (only for recurring expenses) -->
      <div v-if="expense?.isRecurring" class="bg-surface border-2 border-border rounded-lg p-4 md:p-6 mt-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-bold text-text-primary">{{ t('finanzas.gastos.paymentInstances') }}</h3>
          <NuxtLink
            :to="`/finanzas/gastos/${expenseId}/instancia`"
            class="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
          >
            {{ t('finanzas.gastos.newInstance') }}
          </NuxtLink>
        </div>

        <!-- Loading State -->
        <div v-if="isLoadingInstances" class="flex justify-center py-8">
          <CommonsTheCustomLoader size="medium" />
        </div>

        <!-- Empty State -->
        <div v-else-if="instances.length === 0" class="text-center py-8">
          <p class="text-sm text-text-secondary">{{ t('finanzas.gastos.noInstances') }}</p>
        </div>

        <!-- Instances Table -->
        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-border">
                <th class="text-left py-3 px-4 text-sm font-medium text-text-secondary">{{ t('finanzas.gastos.period') }}</th>
                <th class="text-left py-3 px-4 text-sm font-medium text-text-secondary">{{ t('finanzas.gastos.colDate') }}</th>
                <th class="text-right py-3 px-4 text-sm font-medium text-text-secondary">{{ t('finanzas.gastos.colAmount') }}</th>
                <th class="text-left py-3 px-4 text-sm font-medium text-text-secondary">{{ t('finanzas.common.status') }}</th>
                <th class="text-left py-3 px-4 text-sm font-medium text-text-secondary">{{ t('finanzas.gastos.files') }}</th>
                <th class="text-center py-3 px-4 text-sm font-medium text-text-secondary">{{ t('finanzas.common.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="instance in instances"
                :key="instance.id"
                class="border-b border-border hover:bg-background transition-colors"
              >
                <td class="py-3 px-4 text-sm text-text-primary">{{ formatPeriodLabel(instance.periodMonth) }}</td>
                <td class="py-3 px-4 text-sm text-text-secondary">{{ formatCalendarDate(instance.scheduledDate) }}</td>
                <td class="py-3 px-4 text-sm text-primary text-right font-medium">{{ formatCurrency(instance.amount) }}</td>
                <td class="py-3 px-4">
                  <span
                    :class="{
                      'bg-state-success-bg text-state-success-text': instance.status === 'paid',
                      'bg-state-warning-bg text-state-warning-text': instance.status === 'pending',
                      'bg-status-chip-bg text-status-chip-text': instance.status === 'skipped',
                      'bg-state-danger-bg text-state-danger-text': instance.status === 'cancelled'
                    }"
                    class="px-2 py-1 rounded-full text-xs font-medium"
                  >
                    {{ getStatusLabel(instance.status) }}
                  </span>
                </td>
                <td class="py-3 px-4">
                  <div class="flex items-center gap-2">
                    <svg class="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <span class="text-sm text-text-secondary">{{ instance.attachments?.length || 0 }}</span>
                  </div>
                </td>
                <td class="py-3 px-4">
                  <div class="flex justify-center gap-2">
                    <NuxtLink
                      :to="`/finanzas/gastos/instancias/${instance.id}`"
                      class="text-text-secondary hover:text-primary transition-colors"
                      :title="t('finanzas.gastos.viewDetailsFiles')"
                      :aria-label="t('finanzas.gastos.viewDetailsFiles')"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </NuxtLink>
                    <button
                      v-if="instance.status === 'pending'"
                      @click="markAsPaid(instance)"
                      class="text-state-success-text hover:text-state-success-text/80"
                      :title="t('finanzas.gastos.markPaid')"
                      :aria-label="t('finanzas.gastos.markPaid')"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useQuery, useQueryCache } from '@pinia/colada'
import { usePaymentMethods } from '~/composables/usePaymentMethods'
import { usePaymentLabel } from '~/composables/usePaymentLabel'
import { useFormatters } from '~/composables/useFormatters'

definePageMeta({ layout: 'dashboard', module: 'finanzas' })

const { t, locale } = useI18n({ useScope: 'global' })
const route = useRoute()
const expenseId = route.params.id as string

const { currentTenant } = useTenantReactive()
const cache = useQueryCache()

// Payment methods
const { paymentGroups, isLoading: pmGroupsLoading, fetchPaymentMethods } = usePaymentMethods()
fetchPaymentMethods()
const { resolveLabel: _resolvePaymentLabel } = usePaymentLabel(computed(() => [...paymentGroups.value]))
function resolvePaymentLabel(slug: string | null | undefined, methodId?: string | null): string {
  if (pmGroupsLoading.value) return '—'
  return _resolvePaymentLabel(slug, methodId)
}

// State
const isEditing = ref(false)
const isSubmitting = ref(false)
const isDeleting = ref(false)
const attachmentsToRemove = ref<string[]>([])

// File upload state
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFiles = ref<File[]>([])

// Shared Colada key with list/create
const { data: categoriesData } = useQuery({
  key: () => ['finance', 'expense-categories', currentTenant.value?.id],
  query: () => $fetch('/api/finance/expenses/categories'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const categories = computed(() => {
  const data = categoriesData.value as any
  if (!data) return []
  return Array.isArray(data) ? data : (data.data || [])
})

// Fetch expense data
const { data: expenseData, asyncStatus, error: fetchError, refetch } = useQuery({
  key: () => ['expense', expenseId],
  query: () => $fetch(`/api/finance/expenses/${expenseId}`),
  staleTime: 30_000,
})

const expense = computed(() => (expenseData.value as any)?.data)
const isLoading = computed(() => !expenseData.value && !fetchError.value)
const isRefreshing = computed(() => asyncStatus.value === 'loading' && expenseData.value != null)

useHead({
  title: () => expense.value
    ? t('finanzas.gastos.pageTitleExpense', { description: expense.value.description })
    : t('finanzas.gastos.pageTitleDetail')
})

// Layout actions
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
onMounted(() => { setRefreshHandler(refetch) })
registerProgressiveLoading(isRefreshing)
onUnmounted(() => { clearRefreshHandler(refetch) })

// Form state
const form = reactive({
  transactionDate: '',
  expenseCategoryId: '',
  description: '',
  amount: null as number | null,
  isRecurring: false,
  frequency: '',
  recurringEndDate: ''
})

// File handling
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) {
    selectedFiles.value.push(...Array.from(target.files))
    target.value = '' // Reset input
  }
}

const removeFile = (index: number) => {
  selectedFiles.value.splice(index, 1)
}

const removeAttachment = (attachmentId: string) => {
  if (confirm(t('finanzas.gastos.deleteAttachmentConfirm'))) {
    attachmentsToRemove.value.push(attachmentId)
  }
}

// Start editing
const startEditing = () => {
  if (expense.value) {
    form.transactionDate = expense.value.transactionDate?.split('T')[0] || ''
    form.expenseCategoryId = expense.value.expenseCategoryId || ''
    form.description = expense.value.description || ''
    form.amount = expense.value.amount || null
    form.isRecurring = expense.value.isRecurring || false
    form.frequency = expense.value.frequency || ''
    form.recurringEndDate = expense.value.recurringEndDate?.split('T')[0] || ''
    isEditing.value = true
    attachmentsToRemove.value = []
    selectedFiles.value = []
  }
}

// Cancel editing
const cancelEditing = () => {
  isEditing.value = false
  attachmentsToRemove.value = []
  selectedFiles.value = []
}

// Validation
const isFormValid = computed(() => {
  const baseValid = form.transactionDate && form.expenseCategoryId && form.description && form.amount && form.amount > 0

  // If recurring is enabled, frequency is required
  if (form.isRecurring) {
    return baseValid && form.frequency !== ''
  }

  return baseValid
})

// Submit handler
const handleSubmit = async () => {
  if (!isFormValid.value) {
    alert(t('finanzas.gastos.completeRequired'))
    return
  }

  isSubmitting.value = true
  try {
    // Create JSON payload
    const payload: any = {
      transactionDate: form.transactionDate,
      expenseCategoryId: form.expenseCategoryId,
      description: form.description,
      amount: form.amount
    }

    // Add recurring fields if applicable
    if (form.isRecurring) {
      payload.isRecurring = true
      payload.frequency = form.frequency
      if (form.recurringEndDate) {
        payload.recurringEndDate = form.recurringEndDate
      }
    } else {
      payload.isRecurring = false
    }

    await $fetch(`/api/finance/expenses/${expenseId}`, {
      method: 'PUT',
      body: payload
    })

    // Upload new files separately if present
    if (selectedFiles.value.length > 0) {
      try {
        const formData = new FormData()
        selectedFiles.value.forEach(file => formData.append('files', file))
        await $fetch(`/api/finance/expenses/${expenseId}/attachments`, {
          method: 'POST',
          body: formData
        })
      } catch (fileError) {
        console.error('Error uploading files:', fileError)
      }
    }

    // Delete removed attachments
    for (const attachmentId of attachmentsToRemove.value) {
      try {
        await $fetch(`/api/finance/expenses/${expenseId}/attachments/${attachmentId}`, {
          method: 'DELETE'
        })
      } catch (error) {
        console.error('Error deleting attachment:', error)
      }
    }

    // Invalidate list + this detail; progressive refresh via isRefreshing/header matrix
    cache.invalidateQueries({ key: ['finance', 'expenses'] })
    cache.invalidateQueries({ key: ['expense', expenseId] })
    await refetch()
    isEditing.value = false
    attachmentsToRemove.value = []
    selectedFiles.value = []
  } catch (error: any) {
    console.error('Error updating expense:', error)

    let errorMessage = t('finanzas.gastos.updateError')

    if (error?.data?.detail) {
      if (typeof error.data.detail === 'string') {
        errorMessage = error.data.detail
      } else if (Array.isArray(error.data.detail)) {
        errorMessage = error.data.detail.map((e: any) => e.msg || e.message || t('finanzas.gastos.reviewExpenseData')).join(', ')
      } else {
        errorMessage = error.data.detail.message
          || error.data.detail.msg
          || error.data.detail.error
          || error.data.detail.detail
          || t('finanzas.gastos.updateDataError')
      }
    } else if (error?.message) {
      errorMessage = error.message
    }

    alert(errorMessage)
  } finally {
    isSubmitting.value = false
  }
}

// Format functions
const { formatDate, formatCalendarDate, formatCurrency } = useFormatters()

const formatFileSize = (bytes: number) => {
  if (!bytes) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const formatFrequency = (frequency: string) => {
  const frequencies: { [key: string]: string } = {
    'weekly': t('finanzas.gastos.weekly'),
    'biweekly': t('finanzas.gastos.biweekly'),
    'monthly': t('finanzas.gastos.monthly'),
    'quarterly': t('finanzas.gastos.quarterly'),
    'yearly': t('finanzas.gastos.yearly')
  }
  return frequencies[frequency] || frequency || t('finanzas.gastos.noFrequency')
}

// Fetch recurring instances if expense is recurring
const { data: instancesData, refresh: refreshInstances, pending: instancesPending } = useAsyncData(
  `expense-instances-${expenseId}-${currentTenant.value?.id || 'default'}`,
  async () => {
    if (!expense.value) return []
    if (!expense.value.isRecurring) return []

    try {
      return await $fetch(`/api/finance/expenses/${expenseId}/instances`)
    } catch (error) {
      console.error('Error fetching instances:', error)
      return []
    }
  },
  {
    server: false,
    watch: [currentTenant, expense]
  }
)

const instances = computed(() => instancesData.value || [])
const isLoadingInstances = computed(() => instancesPending.value)

const markAsPaid = async (instance: any) => {
  try {
    const paymentDate = new Date().toISOString()
    await $fetch(`/api/finance/expenses/instances/${instance.id}`, {
      method: 'PUT',
      body: {
        status: 'paid',
        paymentDate: paymentDate
      }
    })
    await refreshInstances()
  } catch (error: any) {
    console.error('Error marking as paid:', error)
    alert(error?.data?.detail || t('finanzas.gastos.markPaidError'))
  }
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    'pending': t('finanzas.gastos.pending'),
    'paid': t('finanzas.gastos.paid'),
    'skipped': t('finanzas.gastos.skipped'),
    'cancelled': t('finanzas.gastos.cancelled')
  }
  return labels[status] || status
}

const formatPeriodLabel = (periodMonth: string) => {
  if (!periodMonth) return ''
  const [year, month] = periodMonth.split('-')
  const date = new Date(Number(year), Number(month) - 1)
  return new Intl.DateTimeFormat(locale.value === 'en' ? 'en-US' : 'es-CO', {
    month: 'long',
    year: 'numeric'
  }).format(date)
}

// Delete expense
const deleteExpense = async () => {
  if (!confirm(t('finanzas.gastos.deleteConfirm'))) {
    return
  }

  isDeleting.value = true
  isSubmitting.value = true
  try {
    await $fetch(`/api/finance/expenses/${expenseId}`, {
      method: 'DELETE'
    })

    cache.invalidateQueries({ key: ['finance', 'expenses'] })
    cache.invalidateQueries({ key: ['expense', expenseId] })
    await navigateTo('/finanzas/gastos')
  } catch (error: any) {
    console.error('Error deleting expense:', error)
    alert(error?.data?.detail || t('finanzas.gastos.deleteError'))
  } finally {
    isDeleting.value = false
    isSubmitting.value = false
  }
}
</script>
