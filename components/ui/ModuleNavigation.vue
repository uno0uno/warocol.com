<template>
  <div class="bg-surface border-border border rounded-lg">
    <div class="px-4 py-4 sm:px-6 md:p-6">
      <!-- Mobile & Desktop: Horizontal scroll navigation -->
      <nav class="flex space-x-4 sm:space-x-6 md:space-x-8 overflow-x-auto scrollbar-hide -mx-2 px-2">
        <NuxtLink
          v-for="item in navigationItems"
          :key="item.to"
          :to="item.to"
          :class="getNavLinkClasses(item)"
          class="text-xs sm:text-sm transition-colors whitespace-nowrap flex-shrink-0"
        >
          {{ item.label }}
        </NuxtLink>

        <!-- Disabled items -->
        <span
          v-for="disabledItem in disabledItems"
          :key="disabledItem"
          class="text-text-tertiary opacity-50 cursor-not-allowed text-xs sm:text-sm whitespace-nowrap flex-shrink-0"
        >
          {{ disabledItem }}
        </span>
      </nav>
    </div>
  </div>
</template>

<script setup lang="ts">
interface NavigationItem {
  to: string
  label: string
  matchPath?: string // Optional custom path matching
}

interface Props {
  navigationItems: NavigationItem[]
  disabledItems?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  disabledItems: () => []
})

const route = useRoute()

function getNavLinkClasses(item: NavigationItem): string[] {
  const matchPath = item.matchPath || item.to
  const isActive = item.matchPath
    ? route.path.includes(item.matchPath)
    : route.path === item.to

  return [
    isActive
      ? 'text-primary font-medium'
      : 'text-text-secondary hover:text-primary'
  ]
}
</script>

<style scoped>
/* Hide scrollbar for Chrome, Safari and Opera */
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

/* Hide scrollbar for IE, Edge and Firefox */
.scrollbar-hide {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}

/* Smooth scroll behavior */
nav {
  scroll-behavior: smooth;
}
</style>