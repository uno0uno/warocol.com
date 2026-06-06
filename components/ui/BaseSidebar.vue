<template>
  <aside
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    class="base-sidebar group h-screen border-r flex-shrink-0 shadow-xl flex flex-col w-16 hover:w-56 transition-all duration-200 ease-in-out overflow-hidden"
  >
    <!-- Header: Logo & Selector -->
    <div class="p-2 pb-3 flex-shrink-0">
      <!-- Logo -->
      <div class="base-sidebar-logo flex border px-2 py-2 rounded-lg mb-4 justify-center">
        <div class="rounded-lg flex items-center justify-center overflow-hidden">
          <img
            :src="logoSrc"
            alt="Waro"
            class="object-contain transition-all duration-200 w-8 h-8 group-hover:w-40 group-hover:h-auto"
            style="filter: grayscale(1) invert(1); mix-blend-mode: screen;"
          />
        </div>
      </div>

      <!-- Selector Slot — only when expanded and slot has content -->
      <div v-if="$slots.selector" class="max-h-0 opacity-0 overflow-hidden group-hover:max-h-32 group-hover:opacity-100 transition-all duration-200">
        <slot name="selector" />
      </div>
    </div>

    <!-- Navigation Slot (Scrollable area) -->
    <nav class="flex-1 overflow-y-auto px-2 py-2 scrollbar-hide">
      <slot name="navigation" :collapsed="!isHovered" />
    </nav>

    <!-- Bottom actions slot (always visible, not scrollable) -->
    <div class="px-2 pb-2 flex-shrink-0">
      <slot name="bottom" :collapsed="!isHovered" />
    </div>

    <!-- Footer Slot (User info) — only when expanded and slot has content -->
    <div v-if="$slots.footer" class="base-sidebar-footer max-h-0 opacity-0 overflow-hidden group-hover:max-h-20 group-hover:opacity-100 transition-all duration-200 border-t">
      <div class="p-3">
        <slot name="footer" />
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import logoSrc from '~/public/logo_waro_colombia.png'

const isHovered = ref(false)
</script>

<style scoped>
.base-sidebar {
  background-color: hsl(var(--nav-surface-bg));
  border-color: hsl(var(--nav-surface-border));
}

.base-sidebar-logo {
  border-color: hsl(var(--nav-surface-border));
}

.base-sidebar-footer {
  border-color: hsl(var(--nav-surface-border) / 0);
}

.base-sidebar:hover .base-sidebar-footer {
  border-color: hsl(var(--nav-surface-border));
}

.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
