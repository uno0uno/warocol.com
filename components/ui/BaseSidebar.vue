<template>
  <div
    :class="wrapperClass"
    :style="shellStyle"
  >
    <aside
      :class="sidebarClass"
      @mouseenter="onMouseEnter"
      @mouseleave="onMouseLeave"
    >
      <!-- Header: Logo & Selector -->
      <div class="base-sidebar-header flex-shrink-0">
        <div
          v-if="hasMenuButton"
          :class="[
            'base-sidebar-overlay-header',
            props.toggle ? 'base-sidebar-overlay-header--toggle' : '',
          ]"
        >
          <!-- Toggle (dashboard): logo then panel icon -->
          <template v-if="props.toggle">
            <Transition name="base-sidebar-brand">
              <div v-if="isExpanded && $slots.brand" class="base-sidebar-brand">
                <slot name="brand" />
              </div>
            </Transition>
            <button
              type="button"
              class="base-sidebar-menu-button"
              :aria-expanded="isExpanded"
              aria-label="Alternar navegación"
              @click.stop="toggleSidebar"
            >
              <svg class="base-sidebar-panel-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" stroke="currentColor" stroke-width="1.8" />
                <rect x="6" y="6.5" width="4" height="11" rx="1.5" fill="currentColor" />
              </svg>
            </button>
          </template>

          <!-- Overlay: hamburger then brand -->
          <template v-else>
            <button
              type="button"
              class="base-sidebar-menu-button"
              :aria-expanded="isExpanded"
              aria-label="Abrir navegación"
              @click.stop="toggleSidebar"
            >
              <span class="base-sidebar-menu-line" />
              <span class="base-sidebar-menu-line" />
              <span class="base-sidebar-menu-line" />
            </button>

            <Transition name="base-sidebar-brand">
              <div v-if="isExpanded && $slots.brand" class="base-sidebar-brand">
                <slot name="brand" />
              </div>
            </Transition>
          </template>
        </div>

        <!-- Logo -->
        <div
          v-if="!hasMenuButton"
          :class="[
            'base-sidebar-logo flex border px-2 py-2 rounded-lg mb-4 justify-center',
          ]"
        >
          <div class="rounded-lg flex items-center justify-center overflow-hidden">
            <img
              :src="logoSrc"
              alt="Waro"
              :class="logoClass"
              style="filter: grayscale(1) invert(1); mix-blend-mode: screen;"
            />
          </div>
        </div>

        <!-- Selector Slot — only when expanded and slot has content -->
        <div v-if="$slots.selector" :class="expandedSlotClass('max-h-32')">
          <slot name="selector" />
        </div>
      </div>

      <!-- Navigation Slot (Scrollable area) -->
      <nav class="base-sidebar-nav flex-1 overflow-y-auto px-2 py-2 scrollbar-hide">
        <slot name="navigation" :collapsed="!isExpanded" :close="closeOverlay" />
      </nav>

      <!-- Bottom actions slot (always visible, not scrollable) -->
      <div class="px-2 pb-2 flex-shrink-0">
        <slot name="bottom" :collapsed="!isExpanded" :close="closeOverlay" />
      </div>

      <!-- Footer Slot (User info) — only when expanded and slot has content -->
      <div v-if="$slots.footer" :class="['base-sidebar-footer border-t', expandedSlotClass('max-h-20')]">
        <div class="p-3">
          <slot name="footer" />
        </div>
      </div>

      <!-- Buzz SidebarRail: drag to resize (toggle / dashboard only) -->
      <button
        v-if="props.toggle && isExpanded"
        type="button"
        class="base-sidebar-rail"
        aria-label="Drag to resize sidebar"
        title="Drag to resize sidebar"
        @pointerdown="onRailPointerDown"
        @dblclick="resetSidebarWidth"
      />
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import logoSrc from '~/public/logo_waro_colombia.png'

const SIDEBAR_WIDTH_STORAGE_KEY = 'waro-dashboard-sidebar-width'
const SIDEBAR_WIDTH_DEFAULT_PX = 224
const SIDEBAR_WIDTH_MIN_PX = 180
const SIDEBAR_WIDTH_MAX_PX = 360

const props = withDefaults(defineProps<{
  overlay?: boolean
  toggle?: boolean
}>(), {
  overlay: false,
  toggle: false,
})

const emit = defineEmits<{
  (e: 'expanded-change', value: boolean): void
}>()

const isHovered = ref(false)
const isOverlayOpen = ref(false)
const isToggleOpen = ref(false)
const sidebarWidthPx = ref(SIDEBAR_WIDTH_DEFAULT_PX)
const isResizing = ref(false)

const hasMenuButton = computed(() => props.overlay || props.toggle)
const isExpanded = computed(() => {
  if (props.overlay) return isOverlayOpen.value
  if (props.toggle) return isToggleOpen.value
  return isHovered.value
})

const wrapperClass = computed(() => [
  'base-sidebar-shell',
  props.overlay ? 'base-sidebar-shell--overlay' : '',
  props.toggle ? 'base-sidebar-shell--toggle' : '',
  isExpanded.value ? 'base-sidebar-shell--expanded' : '',
  isResizing.value ? 'base-sidebar-shell--resizing' : '',
])

const shellStyle = computed(() => {
  if (!props.toggle) return undefined
  if (!isExpanded.value) return undefined
  return {
    width: `${sidebarWidthPx.value}px`,
    minWidth: `${sidebarWidthPx.value}px`,
    maxWidth: `${sidebarWidthPx.value}px`,
  }
})

const sidebarClass = computed(() => [
  'base-sidebar group flex-shrink-0 shadow-xl flex flex-col transition-all duration-200 ease-in-out overflow-hidden border-r',
  props.toggle ? 'h-full' : 'h-screen',
  props.overlay
    ? [
        'base-sidebar--overlay fixed start-0 top-0 z-[2030] h-screen',
        isExpanded.value ? 'w-fit min-w-[13rem] max-w-[16rem]' : 'w-[4.25rem]',
      ]
    : [
        props.toggle ? 'base-sidebar--toggle' : '',
        props.toggle
          ? (isExpanded.value ? 'w-full' : 'w-[4.25rem]')
          : (isExpanded.value ? 'w-fit min-w-[13rem] max-w-[16rem]' : 'w-[4.25rem]'),
        !props.toggle ? 'hover:w-56' : '',
      ],
])

const logoClass = computed(() =>
  isExpanded.value
    ? 'h-8 w-auto max-w-full object-contain transition-all'
    : 'h-8 w-8 object-cover object-left transition-all',
)

watch(isExpanded, (value) => {
  emit('expanded-change', value)
}, { immediate: true })

function clampWidth(width: number) {
  return Math.min(SIDEBAR_WIDTH_MAX_PX, Math.max(SIDEBAR_WIDTH_MIN_PX, Math.round(width)))
}

function persistSidebarWidth(width: number) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(width))
  } catch {
    // ignore quota / private mode
  }
}

function loadSidebarWidth() {
  if (typeof window === 'undefined') return SIDEBAR_WIDTH_DEFAULT_PX
  try {
    const raw = window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY)
    const parsed = raw ? Number.parseInt(raw, 10) : NaN
    if (Number.isFinite(parsed)) return clampWidth(parsed)
  } catch {
    // ignore
  }
  return SIDEBAR_WIDTH_DEFAULT_PX
}

function resetSidebarWidth() {
  sidebarWidthPx.value = SIDEBAR_WIDTH_DEFAULT_PX
  persistSidebarWidth(SIDEBAR_WIDTH_DEFAULT_PX)
}

function onRailPointerDown(event: PointerEvent) {
  if (!props.toggle || !isExpanded.value) return
  isResizing.value = true
  const target = event.currentTarget as HTMLElement | null
  target?.setPointerCapture?.(event.pointerId)
  event.preventDefault()

  const onMove = (moveEvent: PointerEvent) => {
    sidebarWidthPx.value = clampWidth(moveEvent.clientX)
  }
  const onUp = (upEvent: PointerEvent) => {
    isResizing.value = false
    persistSidebarWidth(sidebarWidthPx.value)
    target?.releasePointerCapture?.(upEvent.pointerId)
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onUp)
  }

  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onUp)
}

onMounted(() => {
  if (props.toggle) {
    sidebarWidthPx.value = loadSidebarWidth()
  }
})

onBeforeUnmount(() => {
  isResizing.value = false
})

function toggleSidebar() {
  if (props.overlay) {
    isOverlayOpen.value = !isOverlayOpen.value
    return
  }
  if (props.toggle) {
    isToggleOpen.value = !isToggleOpen.value
  }
}

function expandedSlotClass(maxClass: string) {
  return [
    'overflow-hidden transition-all duration-300 ease-in-out',
    isExpanded.value ? `${maxClass} opacity-100` : 'max-h-0 opacity-0',
  ]
}

function onMouseEnter() {
  if (!props.overlay) isHovered.value = true
}

function onMouseLeave() {
  if (!props.overlay) isHovered.value = false
}

function closeOverlay() {
  if (props.overlay) isOverlayOpen.value = false
}
</script>

<style scoped>
.base-sidebar-shell {
  height: 100vh;
  min-height: 0;
  width: 4.25rem;
  flex-shrink: 0;
  transition: width 0.2s ease-in-out;
  overflow: hidden;
  position: relative;
}

.base-sidebar-shell:hover {
  width: 14rem;
}

.base-sidebar-shell--toggle:hover {
  width: 4.25rem;
}

.base-sidebar-shell--expanded,
.base-sidebar-shell--toggle.base-sidebar-shell--expanded {
  width: fit-content;
  min-width: 13rem;
  max-width: 16rem;
}

/* Toggle + expanded width comes from inline style (resize) */
.base-sidebar-shell--toggle.base-sidebar-shell--expanded {
  width: var(--shell-sidebar-width-default);
  min-width: var(--shell-sidebar-width-min);
  max-width: var(--shell-sidebar-width-max);
}

.base-sidebar-shell--resizing {
  transition: none;
}

.base-sidebar-shell--overlay {
  width: 4.25rem;
}

.base-sidebar-shell--overlay:hover {
  width: 4.25rem;
}

.base-sidebar {
  background-color: hsl(var(--nav-surface-bg));
  border-color: hsl(var(--nav-surface-border));
  width: 100%;
  min-height: 0;
  position: relative;
}

.base-sidebar-nav {
  min-height: 0;
}

.base-sidebar--overlay {
  --nav-surface-bg: var(--background);
  --nav-surface-border: var(--border);
  --nav-item-hover-bg: var(--neutral-950);
  --nav-item-active-bg: var(--neutral-950);
  --nav-icon-idle: var(--neutral-950);
  --nav-icon-hover: var(--neutral-950);
  --nav-icon-active: var(--neutral-950);
  --nav-label-idle: var(--neutral-950);
  --nav-label-hover: var(--neutral-950);
  --nav-label-active: var(--neutral-950);
  --nav-section-label: var(--neutral-850);
  --nav-divider: var(--neutral-200);
  --nav-focus-ring: var(--neutral-950);
  --nav-logout-text: var(--neutral-850);
  --nav-logout-icon: var(--neutral-850);
  background-color: hsl(var(--background));
  box-shadow: none;
}

/* Dashboard toggle: transparent chrome over shell canvas (Buzz pattern) */
.base-sidebar--toggle {
  --nav-surface-bg: transparent;
  --nav-surface-border: transparent;
  --nav-item-hover-bg: var(--neutral-950);
  --nav-item-active-bg: var(--neutral-950);
  --nav-icon-idle: var(--neutral-950);
  --nav-icon-hover: var(--neutral-950);
  --nav-icon-active: var(--neutral-950);
  --nav-label-idle: var(--neutral-950);
  --nav-label-hover: var(--neutral-950);
  --nav-label-active: var(--neutral-950);
  --nav-section-label: var(--neutral-850);
  --nav-divider: var(--neutral-200);
  --nav-focus-ring: var(--neutral-950);
  --nav-logout-text: var(--neutral-850);
  --nav-logout-icon: var(--neutral-850);
  background-color: transparent;
  border-color: transparent;
  box-shadow: none;
}

.base-sidebar-shell--toggle {
  height: 100%;
  align-self: stretch;
}

.base-sidebar--toggle.base-sidebar {
  height: 100%;
}

.base-sidebar-logo {
  border-color: hsl(var(--nav-surface-border));
}

.base-sidebar-header {
  padding: 1rem 0.5rem 0.25rem;
}

.base-sidebar-overlay-header {
  display: flex;
  min-height: 3rem;
  align-items: center;
  gap: 0.5rem;
}

.base-sidebar-overlay-header--toggle {
  justify-content: space-between;
  padding-inline: 0.25rem;
}

.base-sidebar-brand {
  display: flex;
  min-width: 0;
  max-width: 7.5rem;
  flex: 1 1 auto;
  align-items: center;
  overflow: hidden;
}

.base-sidebar-brand-enter-active,
.base-sidebar-brand-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.base-sidebar-brand-enter-from,
.base-sidebar-brand-leave-to {
  opacity: 0;
  transform: translateX(-0.375rem);
}

.base-sidebar-menu-button {
  display: inline-flex;
  width: 3rem;
  min-height: 3rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 0.3125rem;
  border-radius: 0.5rem;
  color: hsl(var(--nav-icon-idle));
  transition: background-color 0.15s, color 0.15s;
}

.base-sidebar-menu-button:hover,
.base-sidebar-menu-button:focus-visible {
  background-color: hsl(var(--nav-item-hover-bg) / 0.08);
  color: hsl(var(--nav-icon-hover));
  outline: none;
}

.base-sidebar-menu-line {
  display: block;
  width: 1.125rem;
  height: 2px;
  border-radius: 999px;
  background-color: currentColor;
}

.base-sidebar-panel-icon {
  width: 24px;
  height: 24px;
  display: block;
}

.base-sidebar-footer {
  border-color: hsl(var(--nav-surface-border) / 0);
}

.base-sidebar:hover .base-sidebar-footer {
  border-color: hsl(var(--nav-surface-border));
}

.base-sidebar-rail {
  position: absolute;
  top: 0;
  right: -6px;
  z-index: 30;
  width: 12px;
  height: 100%;
  padding: 0;
  border: none;
  background: transparent;
  cursor: col-resize;
}

.base-sidebar-rail::after {
  content: "";
  position: absolute;
  top: 12%;
  bottom: 12%;
  left: 50%;
  width: 2px;
  transform: translateX(-50%);
  border-radius: 2px;
  background: transparent;
  transition: background 0.15s;
}

.base-sidebar-rail:hover::after,
.base-sidebar-shell--resizing .base-sidebar-rail::after {
  background: hsl(var(--ebony-900) / 0.22);
}

.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

@media (max-height: 820px) {
  .base-sidebar-nav {
    padding-top: 0.25rem;
    padding-bottom: 0.25rem;
  }

  .base-sidebar-header {
    padding-top: 0.875rem;
    padding-bottom: 0.1875rem;
  }

  .base-sidebar-overlay-header {
    min-height: 2.75rem;
  }

  .base-sidebar-menu-button {
    min-height: 2.75rem;
  }

}

@media (max-height: 700px) {
  .base-sidebar-nav {
    padding-top: 0.125rem;
    padding-bottom: 0.125rem;
  }

  .base-sidebar-header {
    padding-top: 0.75rem;
    padding-bottom: 0.125rem;
  }

  .base-sidebar-overlay-header {
    min-height: 2.5rem;
  }

  .base-sidebar-menu-button {
    min-height: 2.5rem;
  }

}
</style>
