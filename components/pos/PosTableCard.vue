<script setup lang="ts">
import { useTableCard } from '~/composables/useTableCard'

const props = withDefaults(
  defineProps<{
    table: any
    disabled?: boolean
    /** Adds grab cursor + handle class for zone-matrix DnD */
    dragHandle?: boolean
    showMove?: boolean
    comandasEnabled?: boolean
    waiterAttributionEnabled?: boolean
  }>(),
  { disabled: false, dragHandle: false, showMove: false },
)

const emit = defineEmits<{
  (e: 'open', table: any): void
  (e: 'move', payload: { table: any; event: Event }): void
}>()

const { t } = useI18n({ useScope: 'global' })
const {
  formatCurrency,
  formatDuration,
  cardClass,
  focusRingClass,
  tableCardBodyPanelClass,
  tableCardFooterPanelClass,
  themeTitleClass,
  themeMetaClass,
  themeAmountClass,
  themeTimeClass,
  themeWaiterClass,
  themeStatusLabelClass,
  tableCardTitleTextClass,
  tableCardPrimaryTextClass,
  tableCardSecondaryTextClass,
  tableCardTertiaryTextClass,
  tableCardTitle,
  tableCardSecondaryParts,
  tableCardWaiterLine,
  tableCardAriaLabel,
  dotClass,
  moveButtonClass,
  moveAriaLabel,
} = useTableCard()

const onMove = (event: Event) => {
  event.stopPropagation()
  emit('move', { table: props.table, event })
}
</script>

<template>
  <button
    class="table-card group w-full h-full flex flex-col rounded-xl overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed hover:brightness-[0.97] active:brightness-[0.95]"
    :class="[cardClass(table.status), focusRingClass(table.status), dragHandle ? 'table-zone-handle cursor-grab active:cursor-grabbing' : '']"
    :disabled="disabled"
    :aria-label="tableCardAriaLabel(table)"
    @click="emit('open', table)"
  >
    <!-- Body panel — same chrome as footer -->
    <div :class="tableCardBodyPanelClass(table.status)">
      <p
        class="uppercase tracking-wide line-clamp-2 min-h-[2.75rem]"
        :class="[tableCardTitleTextClass, themeTitleClass(table.status)]"
      >
        {{ tableCardTitle(table) }}
      </p>
      <p
        class="line-clamp-2 min-h-[1.125rem]"
        :class="tableCardSecondaryTextClass"
      >
        <span v-if="tableCardSecondaryParts(table).length" :class="themeMetaClass(table.status)">
          <template v-for="(part, partIdx) in tableCardSecondaryParts(table)" :key="partIdx">
            <span v-if="partIdx > 0" class="font-normal opacity-70"> · </span>
            <span :class="part.bold ? 'font-bold' : 'font-normal'">{{ part.text }}</span>
          </template>
        </span>
        <span v-else aria-hidden="true">&nbsp;</span>
      </p>
    </div>

    <!-- Footer panel -->
    <div :class="tableCardFooterPanelClass(table.status)">
      <div class="flex items-center min-h-[1.75rem]">
        <template v-if="table.status !== 'free'">
          <div class="flex w-full items-center justify-between gap-2">
            <span class="truncate min-w-0" :class="[tableCardPrimaryTextClass, themeAmountClass(table.status)]">
              {{ formatCurrency(table.session?.running_total ?? 0) }}
            </span>
            <div class="flex items-center gap-1 flex-shrink-0">
              <span class="w-1.5 h-1.5 rounded-full" :class="dotClass(table.status)" aria-hidden="true" />
              <span class="whitespace-nowrap" :class="[tableCardSecondaryTextClass, themeTimeClass(table.status)]">
                {{ formatDuration(table.session.opened_at) }}
              </span>
              <template v-if="props.comandasEnabled && table.session?.unfired_count > 0">
                <span class="relative flex h-2 w-2 flex-shrink-0" aria-hidden="true">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span class="relative inline-flex rounded-full h-2 w-2 bg-state-danger-icon" />
                </span>
              </template>
              <button
                v-if="showMove"
                type="button"
                class="min-h-7 min-w-7 flex items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 -me-0.5 text-text-tertiary"
                :class="moveButtonClass(table.status)"
                :aria-label="moveAriaLabel(table)"
                @click="onMove"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </button>
            </div>
          </div>
        </template>
        <template v-else>
          <span class="uppercase tracking-wide" :class="[tableCardPrimaryTextClass, themeStatusLabelClass(table.status)]">
            {{ t('pos.floor.free') }}
          </span>
        </template>
      </div>
      <p
        v-if="waiterAttributionEnabled"
        class="w-full text-start min-h-[1rem]"
        :class="[tableCardTertiaryTextClass, themeWaiterClass(table.status), !table.effective_waiter_member_name && tableCardWaiterLine(table) && 'italic']"
      >
        {{ tableCardWaiterLine(table) || '\u00A0' }}
      </p>
    </div>
  </button>
</template>
