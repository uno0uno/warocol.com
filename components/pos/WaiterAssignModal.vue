<script setup lang="ts">
/**
 * WaiterAssignModal — single-step picker for "¿Quién atiende esta mesa?".
 *
 * Skippable by design. Pre-selects `defaultMemberId` (typically the
 * table's `assigned_member_id` from #573) so the cashier can confirm
 * with Enter. Choosing "Continuar sin asignar" leaves the session
 * `attended_by_member_id` NULL — the resolver falls back to the
 * table default.
 *
 * Issue: warocol.com#574
 */
import { ref, computed, watch, nextTick } from 'vue'

interface Member {
  id: string
  name: string
  role: string
}

const props = defineProps<{
  show: boolean
  tableName: string
  defaultMemberId: string | null
  members: Member[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm', memberId: string | null): void
}>()

const selectedId = ref<string | null>(props.defaultMemberId)
const selectRef = ref<HTMLSelectElement | null>(null)

// Reset selection + autofocus each time modal opens
watch(
  () => props.show,
  async (isOpen) => {
    if (isOpen) {
      selectedId.value = props.defaultMemberId
      await nextTick()
      selectRef.value?.focus()
    }
  },
)

const selectedMember = computed(() =>
  props.members.find((m) => m.id === selectedId.value) ?? null,
)

const handleConfirm = () => {
  emit('confirm', selectedId.value)
}

const handleSkip = () => {
  emit('confirm', null)
}

const onSelectChange = (e: Event) => {
  const val = (e.target as HTMLSelectElement).value
  selectedId.value = val || null
}

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    handleConfirm()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50"
        role="dialog"
        aria-modal="true"
        :aria-label="`¿Quién atiende la ${tableName}?`"
        @click.self="$emit('close')"
        @keydown="onKeydown"
      >
        <div class="bg-surface w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
          <!-- Header -->
          <div class="px-5 pt-5 pb-3 border-b border-border">
            <h3 class="text-base font-bold text-text-primary">¿Quién atiende?</h3>
            <p class="text-xs text-text-secondary mt-0.5">{{ tableName }}</p>
          </div>

          <!-- Body -->
          <div class="px-5 py-4 space-y-3">
            <label for="waiter-select" class="text-sm font-medium text-text-primary">
              Mesero asignado
            </label>
            <select
              id="waiter-select"
              ref="selectRef"
              :value="selectedId || ''"
              class="w-full min-h-[44px] px-3 py-2 bg-background border border-border rounded-lg text-sm font-medium text-text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none"
              @change="onSelectChange"
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

            <p v-if="selectedMember" class="text-xs text-text-secondary">
              Atribución para esta sesión. Se puede cambiar después desde el banner.
            </p>
          </div>

          <!-- Footer -->
          <div class="px-5 pb-5 pt-2 flex flex-col-reverse sm:flex-row gap-2">
            <button
              type="button"
              class="flex-1 min-h-[44px] rounded-xl border border-border bg-surface text-sm font-semibold text-text-secondary hover:bg-surface-secondary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              @click="handleSkip"
            >
              Sin asignar
            </button>
            <button
              type="button"
              class="flex-1 min-h-[44px] rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 active:scale-[0.98] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              @click="handleConfirm"
            >
              Abrir mesa
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
