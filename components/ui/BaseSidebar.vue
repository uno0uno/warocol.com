<template>
  <div :class="wrapperClass">
    <aside
      :class="sidebarClass"
      @mouseenter="onMouseEnter"
      @mouseleave="onMouseLeave"
    >
      <!-- Header: Logo & Selector -->
      <div class="base-sidebar-header flex-shrink-0">
        <div v-if="hasMenuButton" class="base-sidebar-overlay-header">
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
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import logoSrc from '~/public/logo_waro_colombia.png'

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
])

const sidebarClass = computed(() => [
  'base-sidebar group h-screen border-r flex-shrink-0 shadow-xl flex flex-col transition-all duration-200 ease-in-out overflow-hidden',
  props.overlay
    ? [
        'base-sidebar--overlay fixed start-0 top-0 z-[2030]',
        isExpanded.value ? 'w-fit min-w-[13rem] max-w-[16rem]' : 'w-[4.25rem]',
      ]
    : [
        props.toggle ? 'base-sidebar--toggle' : '',
        isExpanded.value ? 'w-fit min-w-[13rem] max-w-[16rem]' : 'w-[4.25rem]',
        !props.toggle ? 'hover:w-56' : '',
      ],
])

const logoClass = computed(() => [
  'object-contain transition-all duration-200',
  isExpanded.value ? 'w-40 h-auto' : 'w-8 h-8',
])

watch(isExpanded, (isOpen) => {
  emit('expanded-change', isOpen)
})

function toggleSidebar() {
  if (props.overlay) {
    isOverlayOpen.value = !isOverlayOpen.value
    return
  }

  isToggleOpen.value = !isToggleOpen.value
}

function expandedSlotClass(maxClass: string) {
  return [
    'overflow-hidden transition-all duration-200',
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

.base-sidebar--toggle {
  --nav-surface-bg: var(--surface);
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
  background-color: hsl(var(--surface));
  box-shadow: none;
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

.base-sidebar-footer {
  border-color: hsl(var(--nav-surface-border) / 0);
}

.base-sidebar:hover .base-sidebar-footer {
  border-color: hsl(var(--nav-surface-border));
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
