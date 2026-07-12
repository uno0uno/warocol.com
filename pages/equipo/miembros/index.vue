<template>
  <div>
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <CommonsTheErrorState v-else-if="error" />

    <!-- Content -->
    <div v-else class="flex flex-col gap-3 md:gap-4">
      <UiAdvancedFiltersBar
        v-model:search="localSearchTerm"
        :search-fields="[]"
        :search-placeholder="t('equipo.miembros.search')"
        :show-date-range="false"
        :show-clear="hasActiveFilters"
        @search="performSearch"
        @clear="clearFilters"
      >
        <template #additional-filters>
          <select
            v-model="roleFilter"
            :class="[filterSelectClass, 'md:hidden']"
            :aria-label="t('equipo.miembros.filterRole')"
          >
            <option value="">{{ t('equipo.common.role') }}</option>
            <option v-for="option in roleFilterOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </template>

        <template #trailing>
          <button
            v-if="canManageTeam"
            :disabled="isAdminUsersQuotaBlocked"
            :title="isAdminUsersQuotaBlocked ? adminUsersQuotaMessage : t('equipo.miembros.invite')"
            @click="openInviteModal"
            class="btn-primary px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            {{ t('equipo.miembros.invite') }}
          </button>
        </template>
      </UiAdvancedFiltersBar>

      <div
        v-if="isAdminUsersQuotaBlocked"
        class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      >
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>{{ adminUsersQuotaMessage }}</p>
          <NuxtLink to="/gestion/billing/uso" class="font-semibold text-amber-950 underline underline-offset-2">
            {{ t('equipo.miembros.viewPlan') }}
          </NuxtLink>
        </div>
      </div>

      <!-- Responsive Data View -->
      <UiResponsiveDataView
        :columns="teamMembersTableColumns"
        :data="teamMembers"
        :empty-message="t('equipo.miembros.empty')"
        :empty-sub-message="t('equipo.miembros.emptySub')"
        variant="default"
        row-size="sm"
      >
      <template #header-role>
        <UiTableHeaderFilter
          v-model="roleFilter"
        :title="t('equipo.common.role')"
          filter-type="select"
          :options="roleFilterOptions"
        :all-label="t('equipo.common.all')"
        />
      </template>

      <!-- Mobile Card -->
      <template #card="{ item, index }">
        <div
          class="flex items-center gap-3 py-3 px-3 border-b border-border"
          :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
        >
          <!-- Avatar -->
          <div v-if="item.avatar" class="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
            <img :src="item.avatar" :alt="item.name" class="w-full h-full object-cover" />
          </div>
          <div v-else class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
            :style="{ backgroundColor: item.color }">
            {{ item.initials }}
          </div>

          <!-- Name + email -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-text-primary leading-tight truncate">{{ item.name }}</p>
            <p class="text-xs text-text-secondary truncate">{{ item.email }}</p>
          </div>

          <!-- Role badge -->
          <span
            class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
            :class="getRoleBadgeClass(item.role)"
          >
            {{ getRoleShortLabel(item.role) }}
          </span>

          <!-- Actions -->
          <div class="flex items-center gap-0.5 flex-shrink-0">
            <!-- warocol.com#642 — Ver perfil → /equipo/miembros/[id] (tip totals + recent tips) -->
            <NuxtLink :to="`/equipo/miembros/${item.id}`"
              class="flex items-center justify-center w-8 h-8 rounded-lg text-primary hover:bg-surface-secondary transition-colors"
              :title="t('equipo.miembros.viewProfile')">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            </NuxtLink>
            <button v-if="isCurrentUser(item)" @click="openEditProfileModal(item)"
              class="flex items-center justify-center w-8 h-8 rounded-lg text-primary hover:bg-surface-secondary transition-colors"
              :title="t('equipo.miembros.editMyProfile')">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </button>
            <button v-if="isSuperUser && !isCurrentUser(item)" @click="openEditRoleModal(item)"
              class="flex items-center justify-center w-8 h-8 rounded-lg text-primary hover:bg-surface-secondary transition-colors"
              :title="t('equipo.miembros.changeRole')">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </button>
            <button v-if="canManageTeam && !isCurrentUser(item)" @click="openDeleteModal(item)"
              class="flex items-center justify-center w-8 h-8 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
              :title="t('equipo.miembros.deleteMember')">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </div>
      </template>


      <!-- Desktop Table Cells -->
      <template #cell-name="{ value, row }">
        <div class="flex items-center gap-3">
          <!-- Avatar with image or initials -->
          <div v-if="row.avatar" class="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
            <img :src="row.avatar" :alt="row.name" class="w-full h-full object-cover" />
          </div>
          <div v-else class="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0"
            :style="{ backgroundColor: row.color }">
            {{ row.initials }}
          </div>
          <div class="text-sm font-medium text-text-primary">{{ value }}</div>
        </div>
      </template>

      <template #cell-email="{ value }">
        <div class="text-sm text-text-primary">{{ value }}</div>
      </template>

      <template #cell-role="{ value }">
        <span
          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
          :class="getRoleBadgeClass(value)"
        >
          {{ getRoleLabel(value) }}
        </span>
      </template>

      <template #cell-actions="{ row }">
        <div class="flex items-center gap-1">
          <!-- warocol.com#642 — Ver perfil → /equipo/miembros/[id] -->
          <NuxtLink
            :to="`/equipo/miembros/${row.id}`"
            class="text-primary hover:text-primary/70 transition-colors p-1"
            :title="t('equipo.miembros.viewProfile')"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </NuxtLink>
          <!-- Edit Profile Button (for current user) -->
          <button
            v-if="isCurrentUser(row)"
            @click="openEditProfileModal(row)"
            class="text-blue-500 hover:text-blue-700 transition-colors p-1"
            :title="t('equipo.miembros.editMyProfile')"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <!-- Edit Role Button (only for superuser, not for self) -->
          <button
            v-if="isSuperUser && !isCurrentUser(row)"
            @click="openEditRoleModal(row)"
            class="text-blue-500 hover:text-blue-700 transition-colors p-1"
            :title="t('equipo.miembros.changeRole')"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <!-- Delete Button (not for self) -->
          <button
            v-if="canManageTeam && !isCurrentUser(row)"
            @click="openDeleteModal(row)"
            class="text-red-500 hover:text-red-700 transition-colors p-1"
            :title="t('equipo.miembros.deleteMember')"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </template>
      </UiResponsiveDataView>

    <!-- Pending Invitations Section -->
    <div v-if="pendingInvitations.length > 0" class="bg-surface rounded-xl border border-border">
      <div class="p-4 border-b border-border">
        <h3 class="text-lg font-bold text-text-primary flex items-center gap-2">
          <svg class="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {{ t('equipo.miembros.pendingInvites') }}
          <span class="text-sm font-normal text-text-secondary">({{ pendingInvitations.length }})</span>
        </h3>
      </div>

      <!-- Desktop Table -->
      <div class="hidden md:block overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">{{ t('equipo.miembros.invited') }}</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">{{ t('equipo.common.email') }}</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">{{ t('equipo.common.role') }}</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">{{ t('equipo.miembros.expires') }}</th>
              <th class="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">{{ t('equipo.common.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="invitation in pendingInvitations" :key="invitation.id" class="hover:bg-gray-50">
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 bg-amber-500">
                    {{ getInitials(invitation.name, null) }}
                  </div>
                  <div class="text-sm font-medium text-text-primary">{{ invitation.name || t('equipo.miembros.noName') }}</div>
                </div>
              </td>
              <td class="px-4 py-3 text-sm text-text-primary">{{ invitation.email }}</td>
              <td class="px-4 py-3">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                  {{ getRoleLabel(invitation.role) }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-text-secondary">{{ formatExpirationDate(invitation.expiresAt) }}</td>
              <td class="px-4 py-3 text-center">
                <button
                  v-if="canManageTeam"
                  @click="openCancelInvitationModal(invitation)"
                  class="text-red-500 hover:text-red-700 transition-colors p-1"
                  :title="t('equipo.miembros.cancelInvite')"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile Cards -->
      <div class="md:hidden divide-y divide-border">
        <div v-for="invitation in pendingInvitations" :key="invitation.id" class="p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 bg-amber-500">
                {{ getInitials(invitation.name, null) }}
              </div>
              <div>
                <div class="text-sm font-medium text-text-primary">{{ invitation.name || t('equipo.miembros.noName') }}</div>
                <div class="text-xs text-text-secondary">{{ invitation.email }}</div>
              </div>
            </div>
            <button
              v-if="canManageTeam"
              @click="openCancelInvitationModal(invitation)"
              class="text-red-500 hover:text-red-700 transition-colors p-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="mt-2 flex items-center gap-2">
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
              {{ getRoleLabel(invitation.role) }}
            </span>
            <span class="text-xs text-text-secondary">{{ t('equipo.miembros.expires') }}: {{ formatExpirationDate(invitation.expiresAt) }}</span>
          </div>
        </div>
      </div>
    </div>
    </div>

    <!-- Cancel Invitation Modal -->
    <Teleport to="body">
      <div v-if="showCancelInvitationModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="closeCancelInvitationModal"></div>
        <div class="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
          <div class="text-center">
            <div class="mx-auto mb-4 w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <svg class="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 class="text-lg font-bold text-text-primary mb-2">{{ t('equipo.miembros.cancelInvite') }}</h3>
            <p class="text-sm text-text-secondary mb-6">
              {{ t('equipo.miembros.cancelInviteConfirm', { email: invitationToCancel?.email }) }}
            </p>
            <div class="flex gap-3">
              <button
                @click="closeCancelInvitationModal"
                class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-text-primary hover:bg-gray-50"
              >
                {{ t('equipo.miembros.keep') }}
              </button>
              <button
                @click="cancelInvitation"
                :disabled="cancelingInvitation"
                class="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
              >
                {{ cancelingInvitation ? t('equipo.miembros.canceling') : t('equipo.miembros.confirmCancel') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Invite Modal -->
    <Teleport to="body">
      <div v-if="showInviteModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50" @click="closeInviteModal"></div>

        <!-- Modal -->
        <div class="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-text-primary">{{ t('equipo.miembros.invite') }}</h2>
            <button @click="closeInviteModal" class="text-text-secondary hover:text-text-primary">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form @submit.prevent="sendInvitation" class="space-y-4">
            <!-- Name -->
            <div>
              <label class="block text-sm font-medium text-text-primary mb-1">{{ t('equipo.common.name') }}</label>
              <input
                v-model="inviteForm.name"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                :placeholder="t('equipo.miembros.fullName')"
              />
            </div>

            <!-- Email -->
            <div>
              <label class="block text-sm font-medium text-text-primary mb-1">{{ t('equipo.common.email') }}</label>
              <input
                v-model="inviteForm.email"
                type="email"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                :placeholder="t('equipo.miembros.emailPlaceholder')"
              />
            </div>

            <!-- Phone -->
            <div>
              <label class="block text-sm font-medium text-text-primary mb-1">{{ t('equipo.common.phone') }}</label>
              <input
                v-model="inviteForm.phone"
                type="tel"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="3001234567"
              />
            </div>

            <!-- Role -->
            <div>
              <label class="block text-sm font-medium text-text-primary mb-1">{{ t('equipo.common.role') }}</label>
              <select
                v-model="inviteForm.role"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option v-for="option in inviteRoleOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
              <p class="mt-1 text-xs text-text-secondary">
                {{ getRoleDescription(inviteForm.role) }}
              </p>
            </div>

            <!-- Error message -->
            <div v-if="inviteError" class="text-sm text-error bg-red-50 p-3 rounded-lg">
              {{ inviteError }}
            </div>

            <!-- Actions -->
            <div class="flex gap-3 pt-2">
              <button
                type="button"
                @click="closeInviteModal"
                class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-text-primary hover:bg-gray-50"
              >
                {{ t('equipo.common.cancel') }}
              </button>
              <button
                type="submit"
                :disabled="inviteSending || isAdminUsersQuotaBlocked"
                class="flex-1 btn-primary px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {{ inviteSending ? t('equipo.miembros.sending') : t('equipo.miembros.sendInvite') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <div v-if="showDeleteModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50" @click="closeDeleteModal"></div>

        <!-- Modal -->
        <div class="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
          <div class="text-center">
            <!-- Warning Icon -->
            <div class="mx-auto mb-4 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h3 class="text-lg font-bold text-text-primary mb-2">{{ t('equipo.miembros.deleteMember') }}</h3>
            <p class="text-sm text-text-secondary mb-6">
              {{ t('equipo.miembros.deleteConfirm', { name: memberToDelete?.name }) }}
            </p>

            <div class="flex gap-3">
              <button
                @click="closeDeleteModal"
                class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-text-primary hover:bg-gray-50"
              >
                {{ t('equipo.common.cancel') }}
              </button>
              <button
                @click="deleteMember"
                :disabled="deleting"
                class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {{ deleting ? t('equipo.common.deleting') : t('equipo.common.delete') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Edit Profile Modal -->
    <Teleport to="body">
      <div v-if="showEditProfileModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50" @click="closeEditProfileModal"></div>

        <!-- Modal -->
        <div class="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-text-primary">{{ t('equipo.miembros.editMyProfile') }}</h2>
            <button @click="closeEditProfileModal" class="text-text-secondary hover:text-text-primary">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form @submit.prevent="updateProfile" class="space-y-4">
            <!-- Avatar Preview -->
            <div class="flex justify-center">
              <div v-if="profileToEdit?.avatar" class="w-20 h-20 rounded-full overflow-hidden">
                <img :src="profileToEdit.avatar" :alt="profileToEdit.name" class="w-full h-full object-cover" />
              </div>
              <div v-else class="w-20 h-20 rounded-full flex items-center justify-center font-bold text-2xl text-white"
                :style="{ backgroundColor: profileToEdit?.color }">
                {{ profileToEdit?.initials }}
              </div>
            </div>

            <!-- Name -->
            <div>
              <label class="block text-sm font-medium text-text-primary mb-1">{{ t('equipo.common.name') }}</label>
              <input
                v-model="editProfileForm.name"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                :placeholder="t('equipo.miembros.yourFullName')"
              />
            </div>

            <!-- Email (read-only) -->
            <div>
              <label class="block text-sm font-medium text-text-primary mb-1">{{ t('equipo.common.email') }}</label>
              <input
                :value="profileToEdit?.email"
                type="email"
                disabled
                class="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-text-secondary cursor-not-allowed"
              />
              <p class="text-xs text-text-secondary mt-1">{{ t('equipo.miembros.emailImmutable') }}</p>
            </div>

            <!-- Error message -->
            <div v-if="editProfileError" class="text-sm text-error bg-red-50 p-3 rounded-lg">
              {{ editProfileError }}
            </div>

            <!-- Actions -->
            <div class="flex gap-3 pt-2">
              <button
                type="button"
                @click="closeEditProfileModal"
                class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-text-primary hover:bg-gray-50"
              >
                {{ t('equipo.common.cancel') }}
              </button>
              <button
                type="submit"
                :disabled="editProfileLoading"
                class="flex-1 btn-primary px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {{ editProfileLoading ? t('equipo.common.saving') : t('equipo.common.save') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Edit Role Modal -->
    <Teleport to="body">
      <div v-if="showEditRoleModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50" @click="closeEditRoleModal"></div>

        <!-- Modal -->
        <div class="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-text-primary">{{ t('equipo.miembros.changeRole') }}</h2>
            <button @click="closeEditRoleModal" class="text-text-secondary hover:text-text-primary">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form @submit.prevent="updateRole" class="space-y-4">
            <!-- Member Info -->
            <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div v-if="memberToEdit?.avatar" class="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                <img :src="memberToEdit.avatar" :alt="memberToEdit.name" class="w-full h-full object-cover" />
              </div>
              <div v-else class="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0"
                :style="{ backgroundColor: memberToEdit?.color }">
                {{ memberToEdit?.initials }}
              </div>
              <div>
                <div class="font-medium text-text-primary">{{ memberToEdit?.name }}</div>
                <div class="text-sm text-text-secondary">{{ memberToEdit?.email }}</div>
              </div>
            </div>

            <!-- Current Role -->
            <div class="text-sm text-text-secondary">
              {{ t('equipo.miembros.currentRole') }} <span class="font-medium text-text-primary">{{ getRoleLabel(memberToEdit?.role) }}</span>
            </div>

            <!-- New Role Select -->
            <div>
              <label class="block text-sm font-medium text-text-primary mb-1">{{ t('equipo.miembros.newRole') }}</label>
              <select
                v-model="editRoleForm.role"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option v-for="option in roleSelectOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
              <p class="mt-1 text-xs text-text-secondary">
                {{ getRoleDescription(editRoleForm.role) }}
              </p>
            </div>

            <!-- Error message -->
            <div v-if="editRoleError" class="text-sm text-error bg-red-50 p-3 rounded-lg">
              {{ editRoleError }}
            </div>

            <!-- Actions -->
            <div class="flex gap-3 pt-2">
              <button
                type="button"
                @click="closeEditRoleModal"
                class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-text-primary hover:bg-gray-50"
              >
                {{ t('equipo.common.cancel') }}
              </button>
              <button
                type="submit"
                :disabled="editRoleLoading || editRoleForm.role === memberToEdit?.role"
                class="flex-1 btn-primary px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {{ editRoleLoading ? t('equipo.common.saving') : t('equipo.common.save') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
import { useFormatters } from '~/composables/useFormatters'
import { filterSelectClass } from '~/composables/useFilterSelectClass'
const { formatDate: _fmtDate } = useFormatters()

definePageMeta({ layout: 'dashboard', module: 'equipo' })

useHead({ title: () => t('equipo.head.miembros') })

// Tenant reactivity
const { currentTenant } = useTenantReactive()
const toast = useToast()
const authStore = useAuthStore()
const { operationalQuotas, fetchBillingOverview } = useBilling()
const { can } = useModuleAccess()
const canManageTeam = can('equipo')

const { localSearchTerm, appliedSearch, performSearch: applySearch, clearSearch } = useAppliedSearch()
const roleFilter = ref('')
const roleDefinitions = {
  superuser: {
    label: t('equipo.roles.superuser'),
    shortLabel: t('equipo.roles.ownerShort'),
    description: t('equipo.roles.superuserDescription'),
    badgeClass: 'bg-amber-100 text-amber-800',
  },
  admin: {
    label: t('equipo.roles.admin'),
    shortLabel: t('equipo.roles.adminShort'),
    description: t('equipo.roles.adminDescription'),
    badgeClass: 'bg-blue-100 text-blue-800',
  },
  employee: {
    label: t('equipo.roles.employeeLabel'),
    shortLabel: t('equipo.roles.employeeShort'),
    description: t('equipo.roles.employeeDescription'),
    badgeClass: 'bg-slate-100 text-slate-700',
  },
  member: {
    label: t('equipo.roles.memberLabel'),
    shortLabel: t('equipo.roles.memberShort'),
    description: t('equipo.roles.memberDescription'),
    badgeClass: 'bg-green-100 text-green-800',
  },
  promotor: {
    label: t('equipo.roles.promotorLabel'),
    shortLabel: t('equipo.roles.promotor'),
    description: t('equipo.roles.promotorDescription'),
    badgeClass: 'bg-purple-100 text-purple-800',
  },
}
const roleSelectOptions = Object.entries(roleDefinitions).map(([value, meta]) => ({
  value,
  label: meta.label,
}))
const inviteRoleOptions = roleSelectOptions.filter(option => ['admin', 'superuser'].includes(option.value))
const roleFilterOptions = roleSelectOptions

const performSearch = () => applySearch()

const hasActiveFilters = computed(
  () => !!localSearchTerm.value || !!appliedSearch.value || !!roleFilter.value,
)

const clearFilters = () => {
  clearSearch()
  roleFilter.value = ''
}

// Helper function to get initials from name
const getInitials = (name, userName) => {
  if (name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }
  if (userName) {
    return userName.slice(0, 2).toUpperCase()
  }
  return '??'
}

// Helper function to generate color from string
const getColorFromString = (str) => {
  const colors = [
    '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6',
    '#ef4444', '#06b6d4', '#8b5cf6', '#f97316', '#14b8a6'
  ]
  const hash = str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

const normalizeMembersResponse = (response: any) => {
  const result = {
    members: [],
    pendingInvitations: []
  }

  if (response?.success && response.data) {
    result.members = response.data.map(member => {
      const displayName = member.profile.name || member.profile.user_name || 'Usuario sin nombre'
      return {
        id: member.id,
        name: displayName,
        email: member.profile.email,
        position: getRoleLabel(member.role),
        role: member.role,
        active: true,
        initials: getInitials(member.profile.name, member.profile.user_name),
        color: getColorFromString(member.profile.email),
        avatar: member.profile.logo_avatar
      }
    })
  }

  const invitations = response?.pending_invitations || response?.pendingInvitations || []
  result.pendingInvitations = invitations.map(inv => ({
    id: inv.id,
    email: inv.email,
    name: inv.name,
    role: inv.role,
    status: inv.status,
    expiresAt: inv.expires_at || inv.expiresAt,
    invitedByName: inv.invited_by_name || inv.invitedByName
  }))

  return result
}

// Fetch tenant members using Pinia Colada
const {
  data: membersResponse,
  asyncStatus: queryAsyncStatus,
  error: fetchError,
  refetch: refresh
} = useQuery({
  key: () => ['team-members', currentTenant.value?.id],
  query: () => $fetch('/api/tenants/members'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const membersData = computed(() => normalizeMembersResponse(membersResponse.value))
const isLoading = computed(() => !membersResponse.value && !fetchError?.value)
const isRefreshing = computed(() => queryAsyncStatus?.value === 'loading' && membersResponse.value != null)

// Team members — client-side filter (API has no search/role params; see #880)
const teamMembers = computed(() => {
  let list = membersData.value.members || []
  const q = appliedSearch.value.trim().toLowerCase()
  if (q) {
    list = list.filter(
      (m) =>
        m.name?.toLowerCase().includes(q)
        || m.email?.toLowerCase().includes(q),
    )
  }
  if (roleFilter.value) {
    list = list.filter((m) => m.role === roleFilter.value)
  }
  return list
})

// Pending invitations computed from data
const pendingInvitations = computed(() => membersData.value.pendingInvitations || [])

// Error message
const error = computed(() => fetchError?.value ? t('equipo.miembros.loadError') : null)

// Session data for current user
const { data: sessionData } = useAsyncData(
  'current-session',
  () => $fetch('/api/auth/session'),
  { server: false }
)

// Current user email from multiple sources
const currentUserEmail = computed(() => {
  // Try multiple sources for current user email
  const email = sessionData.value?.user?.email ||
                authStore.displayUser?.email ||
                authStore.session?.user?.email ||
                authStore.user?.email
  return email || null
})

// Current user role in this tenant
const currentUserRole = computed(() => {
  if (!currentUserEmail.value || !membersData.value.members.length) return null
  const currentMember = membersData.value.members.find(m =>
    m.email?.toLowerCase() === currentUserEmail.value?.toLowerCase()
  )
  return currentMember?.role || null
})

// Check if current user is superuser
const isSuperUser = computed(() => {
  const result = currentUserRole.value === 'superuser'
  return result
})

// Check if a member is the current user
const isCurrentUser = (member) => {
  return member.email?.toLowerCase() === currentUserEmail.value?.toLowerCase()
}

const getRoleLabel = (role) => {
  return roleDefinitions[role]?.label || role || t('equipo.roles.noRole')
}

const getRoleShortLabel = (role) => {
  return roleDefinitions[role]?.shortLabel || getRoleLabel(role)
}

const getRoleDescription = (role) => {
  return roleDefinitions[role]?.description || t('equipo.roles.customDescription')
}

const getRoleBadgeClass = (role) => {
  return roleDefinitions[role]?.badgeClass || 'bg-green-100 text-green-800'
}

// Table columns configuration
const teamMembersTableColumns = computed(() => [
  {
    key: 'name',
    title: t('equipo.miembros.member'),
    sortable: true,
    format: 'text',
    align: 'left'
  },
  {
    key: 'email',
    title: t('equipo.common.email'),
    sortable: true,
    format: 'text',
    align: 'left'
  },
  {
    key: 'role',
    title: t('equipo.common.role'),
    sortable: true,
    format: 'text',
    align: 'left'
  },
  {
    key: 'actions',
    title: '',
    sortable: false,
    format: 'text',
    align: 'center'
  }
])

// Invite Modal State
const showInviteModal = ref(false)
const inviteSending = ref(false)
const inviteError = ref('')
const inviteForm = reactive({
  name: '',
  email: '',
  phone: '',
  role: 'admin'
})

const adminUsersQuota = computed(() => operationalQuotas.value.admin_users)
const isAdminUsersQuotaBlocked = computed(() => adminUsersQuota.value.blocked)
const adminUsersQuotaMessage = computed(() => {
  const quota = adminUsersQuota.value
  const metric = quota.metric

  if (!metric || metric.limit === null) return quota.message

  const used = metric.used.toLocaleString('es-CO')
  const limit = metric.limit.toLocaleString('es-CO')
  return `${quota.message} Uso actual: ${used} de ${limit} ${quota.unit}. Revisa Mi Plan para ampliar tu cupo.`
})

const showAdminUsersQuotaBlocked = () => {
  const message = adminUsersQuotaMessage.value
  inviteError.value = message
  toast.warning(message, { title: t('equipo.miembros.quotaBlocked') })
}

const quotaExceededMessageFromError = (err: any) => {
  const detail = err?.data?.detail ?? err?.data ?? {}
  const used = typeof detail.used === 'number' ? detail.used : null
  const limit = typeof detail.limit === 'number' ? detail.limit : null

  if (used !== null && limit !== null) {
    return `Alcanzaste el límite de usuarios administrativos de tu plan. Uso actual: ${used.toLocaleString('es-CO')} de ${limit.toLocaleString('es-CO')} usuarios administrativos. Revisa Mi Plan para ampliar tu cupo.`
  }

  return adminUsersQuotaMessage.value
}

const isQuotaExceededError = (err: any) => {
  const detail = err?.data?.detail
  return err?.status === 429 ||
    err?.statusCode === 429 ||
    err?.data?.code === 'quota_exceeded' ||
    err?.data?.error === 'quota_exceeded' ||
    detail?.code === 'quota_exceeded' ||
    detail?.error === 'quota_exceeded'
}

// Delete Modal State
const showDeleteModal = ref(false)
const memberToDelete = ref(null)
const deleting = ref(false)

const openInviteModal = () => {
  if (!canManageTeam.value) return

  if (isAdminUsersQuotaBlocked.value) {
    showAdminUsersQuotaBlocked()
    return
  }

  inviteForm.name = ''
  inviteForm.email = ''
  inviteForm.phone = ''
  inviteForm.role = 'admin'
  inviteError.value = ''
  showInviteModal.value = true
}

const closeInviteModal = () => {
  showInviteModal.value = false
}

const sendInvitation = async () => {
  if (!canManageTeam.value) return

  if (isAdminUsersQuotaBlocked.value) {
    showAdminUsersQuotaBlocked()
    return
  }

  inviteSending.value = true
  inviteError.value = ''

  try {
    const response = await $fetch('/api/invitations/send', {
      method: 'POST',
      body: {
        name: inviteForm.name,
        email: inviteForm.email.trim().toLowerCase(),
        phone: inviteForm.phone,
        role: inviteForm.role
      }
    })

    if (response.success) {
      toast.success(t('equipo.miembros.inviteSentTo', { email: inviteForm.email }), {
        title: t('equipo.miembros.inviteSent')
      })
      closeInviteModal()
      await Promise.all([refresh(), fetchBillingOverview()])
    } else {
      inviteError.value = response.message || t('equipo.miembros.inviteError')
    }
  } catch (err) {
    console.error('Error sending invitation:', err)
    inviteError.value = isQuotaExceededError(err)
      ? quotaExceededMessageFromError(err)
      : err?.data?.message || err?.message || t('equipo.miembros.inviteError')
  } finally {
    inviteSending.value = false
  }
}

// Delete member functions
const openDeleteModal = (member) => {
  if (!canManageTeam.value) return

  memberToDelete.value = member
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
  memberToDelete.value = null
}

const deleteMember = async () => {
  if (!memberToDelete.value || !canManageTeam.value) return

  deleting.value = true
  try {
    const response = await $fetch(`/api/tenants/members/${memberToDelete.value.id}`, {
      method: 'DELETE'
    })

    if (response.success) {
      toast.success(t('equipo.miembros.memberDeleted', { name: memberToDelete.value.name }))
      closeDeleteModal()
      refresh()
    } else {
      toast.error(response.message || t('equipo.miembros.deleteError'))
    }
  } catch (err) {
    console.error('Error deleting member:', err)
    toast.error(err.data?.message || err.message || t('equipo.miembros.deleteError'))
  } finally {
    deleting.value = false
  }
}

// Edit Profile Modal State
const showEditProfileModal = ref(false)
const profileToEdit = ref(null)
const editProfileLoading = ref(false)
const editProfileError = ref('')
const editProfileForm = reactive({
  name: ''
})

const openEditProfileModal = (member) => {
  profileToEdit.value = member
  editProfileForm.name = member.name || ''
  editProfileError.value = ''
  showEditProfileModal.value = true
}

const closeEditProfileModal = () => {
  showEditProfileModal.value = false
  profileToEdit.value = null
}

const updateProfile = async () => {
  if (!profileToEdit.value) return

  editProfileLoading.value = true
  editProfileError.value = ''

  try {
    const response = await $fetch('/api/auth/update-profile', {
      method: 'PUT',
      body: {
        name: editProfileForm.name
      }
    })

    if (response.success) {
      toast.success(t('equipo.miembros.profileUpdated'))
      closeEditProfileModal()
      refresh()
    } else {
      editProfileError.value = response.message || t('equipo.miembros.profileError')
    }
  } catch (err) {
    console.error('Error updating profile:', err)
    editProfileError.value = err.data?.message || err.message || t('equipo.miembros.profileError')
  } finally {
    editProfileLoading.value = false
  }
}

// Edit Role Modal State
const showEditRoleModal = ref(false)
const memberToEdit = ref(null)
const editRoleLoading = ref(false)
const editRoleError = ref('')
const editRoleForm = reactive({
  role: 'admin'
})

const openEditRoleModal = (member) => {
  memberToEdit.value = member
  editRoleForm.role = member.role
  editRoleError.value = ''
  showEditRoleModal.value = true
}

const closeEditRoleModal = () => {
  showEditRoleModal.value = false
  memberToEdit.value = null
}

const updateRole = async () => {
  if (!memberToEdit.value) return

  editRoleLoading.value = true
  editRoleError.value = ''

  try {
    const response = await $fetch(`/api/tenants/members/${memberToEdit.value.id}/role`, {
      method: 'PUT',
      body: {
        role: editRoleForm.role
      }
    })

    if (response.success) {
      toast.success(response.message || t('equipo.miembros.roleUpdated', { role: getRoleLabel(editRoleForm.role) }))
      closeEditRoleModal()
      refresh()
    } else {
      editRoleError.value = response.message || t('equipo.miembros.roleError')
    }
  } catch (err) {
    console.error('Error updating role:', err)
    editRoleError.value = err.data?.message || err.message || t('equipo.miembros.roleError')
  } finally {
    editRoleLoading.value = false
  }
}

// Cancel Invitation Modal State
const showCancelInvitationModal = ref(false)
const invitationToCancel = ref(null)
const cancelingInvitation = ref(false)

const openCancelInvitationModal = (invitation) => {
  if (!canManageTeam.value) return

  invitationToCancel.value = invitation
  showCancelInvitationModal.value = true
}

const closeCancelInvitationModal = () => {
  showCancelInvitationModal.value = false
  invitationToCancel.value = null
}

const cancelInvitation = async () => {
  if (!invitationToCancel.value || !canManageTeam.value) return

  cancelingInvitation.value = true
  try {
    const response = await $fetch(`/api/invitations/${invitationToCancel.value.id}`, {
      method: 'DELETE'
    })

    if (response.success) {
      toast.success(t('equipo.miembros.inviteCanceledFor', { email: invitationToCancel.value.email }))
      closeCancelInvitationModal()
      await Promise.all([refresh(), fetchBillingOverview()])
    } else {
      toast.error(response.message || t('equipo.miembros.cancelInviteError'))
    }
  } catch (err) {
    console.error('Error canceling invitation:', err)
    toast.error(err.data?.message || err.message || t('equipo.miembros.cancelInviteError'))
  } finally {
    cancelingInvitation.value = false
  }
}

// Format expiration date
const formatExpirationDate = (dateString) => {
  if (!dateString) return t('equipo.miembros.noDate')
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = date - now
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return t('equipo.miembros.expired')
  if (diffDays === 0) return t('equipo.miembros.today')
  if (diffDays === 1) return t('equipo.miembros.tomorrow')
  if (diffDays <= 7) return t('equipo.miembros.days', { count: diffDays })

  return _fmtDate(date.toISOString())
}

// Inject refresh handler setter from layout
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()

// Register refresh handler for mobile bottom nav and desktop header
onMounted(() => {
  setRefreshHandler(refresh)
})
registerProgressiveLoading(isRefreshing)
onUnmounted(() => {
  clearRefreshHandler(refresh)
})
</script>
