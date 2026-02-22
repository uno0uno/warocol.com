<template>
  <aside
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    :class="[
      'bg-ebony-900 h-screen border-r border-ebony-700 flex-shrink-0 shadow-xl flex flex-col transition-all duration-300 ease-in-out',
      isHovered ? 'w-56' : 'w-16'
    ]"
  >
    <!-- Header: Logo & Selector -->
    <div class="p-2 pb-3 flex-shrink-0">
      <!-- Logo -->
      <div class="flex border border-ebony-700 px-2 py-2 rounded-lg mb-4 justify-center">
        <div class="rounded-lg flex items-center justify-center overflow-hidden">
          <img
            src="/logo_waro_colombia.png"
            alt="Waro"
            :class="[
              'object-contain transition-all duration-200',
              isHovered ? 'w-40 h-auto' : 'w-8 h-8'
            ]"
            style="filter: grayscale(1) invert(1); mix-blend-mode: screen;"
          />
        </div>
      </div>

      <!-- Selector Slot (Tenant or Supplier) - only show when expanded -->
      <div v-if="isHovered" class="relative transition-opacity duration-200">
        <slot name="selector" />
      </div>
    </div>

    <!-- Navigation Slot (Scrollable area) -->
    <nav class="flex-1 overflow-y-auto px-2 py-2 scrollbar-hide">
      <slot name="navigation" :collapsed="!isHovered" />
    </nav>

    <!-- Footer Slot (User/Supplier Info) - only show when expanded -->
    <div v-if="isHovered" class="p-3 border-t border-ebony-700 flex-shrink-0 transition-opacity duration-200">
      <slot name="footer" />
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const isHovered = ref(false)
</script>
