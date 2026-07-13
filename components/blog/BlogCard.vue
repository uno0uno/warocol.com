<script setup lang="ts">
interface Author {
  name: string
  avatar: string
}

interface Props {
  slug: string
  title: string
  excerpt: string
  date: string
  author: Author
  category: string
  readingTime?: number
  gradient?: 'purple' | 'blue' | 'orange' | 'dark' | 'teal'
  imageText?: string
}

const props = withDefaults(defineProps<Props>(), {
  gradient: 'purple',
  imageText: '',
  readingTime: 5
})

const { formatDate } = useArticle()

const gradientClasses = {
  purple: 'bg-gradient-to-br from-badge-info-bg via-badge-primary-text to-badge-primary-bg',
  blue: 'bg-gradient-to-br from-blue-300 via-blue-500 to-cyan-400',
  orange: 'bg-gradient-to-br from-orange-300 via-orange-500 to-pink-400',
  dark: 'bg-gradient-to-br from-gray-600 via-gray-700 to-gray-500',
  teal: 'bg-gradient-to-br from-teal-300 via-teal-500 to-cyan-400'
}
</script>

<template>
  <article
    class="group relative bg-surface rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
  >
    <NuxtLink :to="`/blog/${slug}`" class="block">
      <!-- Bookmark Icon -->
      <div class="absolute top-6 end-6 z-10">
        <div class="w-10 h-10 bg-surface rounded-lg flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
          <svg class="w-5 h-5 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </div>
      </div>

      <!-- Image/Gradient Header -->
      <div
        :class="[
          'h-64 flex items-center justify-center relative overflow-hidden',
          gradientClasses[gradient]
        ]"
      >
        <!-- Dark overlay for better text contrast -->
        <div class="absolute inset-0 bg-overlay-backdrop/20" />

        <p
          v-if="imageText"
          class="relative z-10 text-action-primary-text text-3xl font-bold text-center px-8 leading-tight drop-shadow-lg"
          style="text-shadow: 0 2px 8px hsl(var(--overlay-backdrop-bg) / 0.3)"
        >
          {{ imageText }}
        </p>
      </div>

      <!-- Card Body -->
      <div class="p-8">
        <!-- Title -->
        <h3 class="text-2xl font-bold text-text-primary mb-4 leading-tight group-hover:text-badge-primary-text transition-colors">
          {{ title }}
        </h3>

        <!-- Excerpt -->
        <p class="text-base text-text-secondary leading-relaxed line-clamp-3 mb-6">
          {{ excerpt }}
        </p>

        <!-- Author & Meta Info -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <!-- Author Avatar -->
            <img
              :src="author.avatar"
              :alt="author.name"
              class="w-10 h-10 rounded-full object-cover"
            >

            <!-- Author Info -->
            <div class="flex items-center gap-1.5 text-sm text-text-secondary">
              <span class="font-normal">by</span>
              <span class="font-semibold">{{ author.name }}</span>
              <span class="font-normal">in</span>
              <span class="font-semibold">{{ category }}</span>
            </div>
          </div>

          <!-- Reading Time -->
          <div class="flex items-center gap-1.5 text-sm text-text-secondary">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke-width="2" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6l4 2" />
            </svg>
            <span>{{ readingTime }} min.</span>
          </div>
        </div>
      </div>
    </NuxtLink>
  </article>
</template>
