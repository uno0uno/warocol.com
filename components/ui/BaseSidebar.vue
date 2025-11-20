<template>
  <aside class="w-64 py-4 px-6 bg-ebony-800 text-white h-screen flex flex-col justify-between flex-shrink-0">
    <div class="flex flex-col gap-8">
      <div class="border-b border-ebony-600 flex flex-col gap-8">
        <!-- Logo -->
        <div class="flex border border-ebony-600 px-5 py-2 rounded-lg">
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
        <div class="relative pb-6">
          <slot name="selector" />
        </div>
      </div>

      <!-- Navigation Slot -->
      <nav class="flex flex-col gap-1 overflow-y-auto">
        <slot name="navigation" />
      </nav>
    </div>

    <!-- Footer Slot (User/Supplier Info) -->
    <div>
      <slot name="footer" />
    </div>
  </aside>
</template>

<script setup lang="ts">
// No props needed, everything is handled via slots
</script>
