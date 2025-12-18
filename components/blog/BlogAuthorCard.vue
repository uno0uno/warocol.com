<script setup lang="ts">
interface Author {
  name: string
  userName?: string
  profilePicture: string
  description?: string
  city?: string
  country?: string
  socialLinks?: {
    twitter?: string
    linkedin?: string
    website?: string
  }
}

interface Props {
  author: Author
}

const props = defineProps<Props>()

const locationText = computed(() => {
  if (props.author.city && props.author.country) {
    return `${props.author.city}, ${props.author.country}`
  }
  return props.author.country || props.author.city || ''
})
</script>

<template>
  <div
    class="w-full lg:max-w-3xl p-6 lg:p-8 flex flex-col gap-6 bg-white border-2 border-crocus-600/30 rounded shadow-sm hover:border-crocus-600/80 transition-colors duration-300"
    itemscope
    itemtype="https://schema.org/Person"
  >
    <!-- Header with Avatar and Basic Info -->
    <div class="flex items-start gap-6">
      <!-- Avatar -->
      <div class="flex-shrink-0">
        <div class="w-16 h-16 lg:w-20 lg:h-20 rounded-xl overflow-hidden ring-2 ring-titan-200">
          <img
            :src="author.profilePicture"
            :alt="`${author.name} profile picture`"
            class="w-full h-full object-cover"
            itemprop="image"
          >
        </div>
      </div>

      <!-- Name and Location -->
      <div class="flex flex-col gap-2 flex-1">
        <div>
          <h3
            class="text-xl lg:text-2xl font-semibold text-ebony-900"
            itemprop="name"
          >
            {{ author.name }}
          </h3>
          <p
            v-if="author.userName"
            class="text-sm lg:text-base text-ebony-500"
          >
            @{{ author.userName }}
          </p>
        </div>

        <!-- Location -->
        <div v-if="locationText" class="flex items-center gap-2">
          <svg
            class="w-4 h-4 lg:w-5 lg:h-5 text-ebony-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p class="text-sm lg:text-base text-ebony-600 capitalize">
            <span itemprop="addressLocality">{{ author.city }}</span>
            <span v-if="author.city && author.country">, </span>
            <span itemprop="addressCountry">{{ author.country }}</span>
          </p>
        </div>
      </div>
    </div>

    <!-- Description -->
    <div v-if="author.description" class="w-full">
      <p
        class="text-base lg:text-lg text-ebony-600 leading-relaxed"
        itemprop="description"
      >
        {{ author.description }}
      </p>
    </div>

    <!-- Social Links -->
    <div
      v-if="author.socialLinks && Object.keys(author.socialLinks).length > 0"
      class="flex gap-4 pt-2 border-t border-titan-200"
    >
      <!-- Twitter -->
      <a
        v-if="author.socialLinks.twitter"
        :href="author.socialLinks.twitter"
        target="_blank"
        rel="noopener noreferrer"
        class="text-ebony-500 hover:text-crocus-600 transition-colors"
        aria-label="Twitter profile"
      >
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </a>

      <!-- LinkedIn -->
      <a
        v-if="author.socialLinks.linkedin"
        :href="author.socialLinks.linkedin"
        target="_blank"
        rel="noopener noreferrer"
        class="text-ebony-500 hover:text-crocus-600 transition-colors"
        aria-label="LinkedIn profile"
      >
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      </a>

      <!-- Website -->
      <a
        v-if="author.socialLinks.website"
        :href="author.socialLinks.website"
        target="_blank"
        rel="noopener noreferrer"
        class="text-ebony-500 hover:text-crocus-600 transition-colors"
        aria-label="Personal website"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
          />
        </svg>
      </a>
    </div>
  </div>
</template>
