<script setup lang="ts">
const route = useRoute()

interface BreadcrumbItem {
  label: string
  path?: string
}

const breadcrumbs = computed<BreadcrumbItem[]>(() => {
  const segments = route.path.split('/').filter(Boolean)

  const items: BreadcrumbItem[] = [
    { label: 'Inicio', path: '/' }
  ]

  segments.forEach((segment, index) => {
    let decodedSegment = decodeURIComponent(segment).replace(/-/g, ' ')

    // Truncate if too long
    if (decodedSegment.length > 40) {
      decodedSegment = decodedSegment.substring(0, 40).trim() + '...'
    }

    // Build path for intermediate segments
    const path = index < segments.length - 1
      ? '/' + segments.slice(0, index + 1).join('/')
      : undefined

    items.push({
      label: decodedSegment,
      path
    })
  })

  return items
})
</script>

<template>
  <nav aria-label="Breadcrumb" class="flex items-center gap-2 text-sm lg:text-base">
    <template v-for="(item, index) in breadcrumbs" :key="index">
      <!-- Home Icon for first item -->
      <NuxtLink
        v-if="index === 0"
        :to="item.path || '/'"
        class="text-ebony-500 hover:text-crocus-600 transition-colors"
        aria-label="Inicio"
      >
        <svg
          class="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
        </svg>
      </NuxtLink>

      <!-- Other items -->
      <template v-else>
        <!-- Separator -->
        <svg
          class="w-5 h-5 text-ebony-400"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fill-rule="evenodd"
            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
            clip-rule="evenodd"
          />
        </svg>

        <!-- Link or text -->
        <NuxtLink
          v-if="item.path"
          :to="item.path"
          class="text-ebony-600 hover:text-crocus-600 capitalize transition-colors whitespace-nowrap"
        >
          {{ item.label }}
        </NuxtLink>
        <span
          v-else
          class="text-ebony-900 capitalize whitespace-nowrap font-medium"
          aria-current="page"
        >
          {{ item.label }}
        </span>
      </template>
    </template>
  </nav>
</template>
