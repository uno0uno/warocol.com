<template>
  <div class="bg-surface border-border border rounded-lg">
    <div class="p-6">
      <nav class="flex space-x-8">
        <NuxtLink 
          v-for="item in navigationItems" 
          :key="item.to"
          :to="item.to" 
          :class="getNavLinkClasses(item)"
          class="text-sm transition-colors"
        >
          {{ item.label }}
        </NuxtLink>
        
        <!-- Disabled items -->
        <span 
          v-for="disabledItem in disabledItems"
          :key="disabledItem"
          class="text-text-tertiary opacity-50 cursor-not-allowed text-sm"
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