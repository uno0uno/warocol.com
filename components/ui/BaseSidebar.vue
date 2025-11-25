<template>
  <aside class="w-72 bg-ebony-900 h-screen flex flex-col border-r border-ebony-700 flex-shrink-0 shadow-xl">
    <!-- Header: Logo & Selector -->
    <div class="p-6 pb-4 flex-shrink-0">
      <!-- Logo -->
      <div class="flex border border-ebony-700 px-5 py-2 rounded-lg mb-6">
        <div class="w-full h-full rounded-lg flex items-center justify-center">
          <img
            src="/logo_waro_10_octubre.png"
            alt="Waro"
            class="w-5/6 h-full px-2 object-contain"
            style="filter: brightness(0) invert(1);"
          />
        </div>
      </div>

      <!-- Selector Slot (Tenant or Supplier) -->
      <div class="relative">
        <slot name="selector" />
      </div>
    </div>

    <!-- Navigation Slot (Scrollable area) -->
    <nav class="flex-1 overflow-y-auto px-4 space-y-1 scrollbar-hide">
      <slot name="navigation" />
    </nav>

    <!-- Footer Slot (User/Supplier Info) -->
    <div class="p-4 border-t border-ebony-700 flex-shrink-0">
      <slot name="footer" />
    </div>
  </aside>
</template>

<script setup lang="ts">
// No props needed, everything is handled via slots
</script>
