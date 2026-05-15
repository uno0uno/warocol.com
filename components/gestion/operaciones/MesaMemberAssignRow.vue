<template>
  <div class="flex items-center justify-between p-4 bg-surface border border-border rounded-xl hover:border-primary/30 transition-colors group">
    <div class="flex items-center gap-3 min-w-0 flex-1">
      <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0">
        {{ table.name.substring(0, 2).toUpperCase() }}
      </div>
      <div class="min-w-0">
        <p class="text-sm font-bold text-text-primary truncate">{{ table.name }}</p>
        <p class="text-[10px] text-text-tertiary font-medium uppercase tracking-wider">
          {{ table.capacity ? `${table.capacity} personas` : tableSingular }}
        </p>
      </div>
    </div>

    <div class="flex items-center gap-2 flex-shrink-0">
      <!-- Current assignment badge (only on sm+) -->
      <span
        v-if="table.assigned_member_name"
        class="hidden sm:inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight bg-primary/10 text-primary border border-primary/20"
      >
        <UserIcon class="w-3 h-3" aria-hidden="true" />
        {{ table.assigned_member_name }}
      </span>

      <!-- Member dropdown -->
      <select
        :value="table.assigned_member_id || ''"
        :disabled="loading"
        :aria-label="`Asignar mesero a ${table.name}`"
        class="min-w-[140px] min-h-[36px] px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
        @change="handleSelect"
      >
        <option value="">(Sin asignar)</option>
        <option
          v-for="m in members"
          :key="m.id"
          :value="m.id"
        >
          {{ m.name }} ({{ m.role }})
        </option>
      </select>

      <!-- History trigger -->
      <button
        type="button"
        :aria-label="`Ver historial de ${table.name}`"
        class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
        @click="emit('view-history')"
      >
        <ClockIcon class="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { UserIcon, ClockIcon } from '@heroicons/vue/24/outline'

const { singular: tableSingular } = useTableLabel()

interface Member {
  id: string
  name: string
  role: string
}

interface Table {
  id: string
  name: string
  capacity?: number | null
  assigned_member_id?: string | null
  assigned_member_name?: string | null
  assigned_member_role?: string | null
}

const props = defineProps<{
  table: Table
  members: Member[]
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'assign', memberId: string | null): void
  (e: 'view-history'): void
}>()

const handleSelect = (event: Event) => {
  const val = (event.target as HTMLSelectElement).value
  emit('assign', val || null)
}
</script>
