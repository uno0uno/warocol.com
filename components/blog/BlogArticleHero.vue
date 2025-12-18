<script setup lang="ts">
interface ArticleAuthor {
  name: string
  profilePicture?: string
}

interface Props {
  title: string
  description?: string
  category?: string
  author: ArticleAuthor
  publishedDate: string | Date
}

const props = defineProps<Props>()

const formatDate = (dateString: string | Date) => {
  const date = new Date(dateString)
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const month = months[date.getMonth()]
  const day = date.getDate()
  const year = date.getFullYear()
  return `${month} ${day}, ${year}`
}

const formattedDate = computed(() => formatDate(props.publishedDate))
</script>

<template>
  <!-- Dark Hero Section with Pattern -->
  <div class="w-full bg-crocus-900 relative overflow-hidden pt-12 pb-12 lg:pt-20 lg:pb-20">
    <!-- Background Pattern & Gradient -->
    <div class="absolute inset-0 z-0">
      <!-- Radial Gradient for depth -->
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-crocus-800/50 via-transparent to-transparent"></div>
      
      <!-- Dot Pattern -->
      <div class="absolute inset-0 opacity-[0.03]" style="background-image: radial-gradient(#ffffff 1px, transparent 1px); background-size: 32px 32px;"></div>
    </div>

    <div class="article-container relative z-10">
      <!-- Grid Layout -->
      <div class="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        
        <!-- Left Column - Main Info -->
        <div class="lg:col-span-8 flex flex-col gap-6">
          <!-- Category Badge -->
          <div v-if="category">
            <span class="inline-block py-1.5 px-4 rounded bg-white/10 backdrop-blur-sm text-crocus-200 text-xs font-bold uppercase tracking-wider border-2 border-crocus-200/20">
              {{ category }}
            </span>
          </div>

          <!-- Title -->
          <h1
            class="text-4xl sm:text-5xl md:text-6xl font-black leading-[1.1] tracking-tight text-white"
            itemprop="headline"
          >
            {{ title }}
          </h1>

          <!-- Author & Date Metadata (Moved here for better hierarchy) -->
          <div class="flex items-center gap-3 text-crocus-200 mt-2">
            <!-- Author Avatar -->
            <div v-if="author.profilePicture" class="w-10 h-10 rounded-lg overflow-hidden border border-crocus-400/30">
              <img :src="author.profilePicture" :alt="author.name" class="w-full h-full object-cover">
            </div>
            
            <div class="flex flex-col">
              <span class="text-sm font-bold text-white" itemprop="author">{{ author.name }}</span>
              <time
                :datetime="new Date(publishedDate).toISOString()"
                class="text-xs font-medium opacity-80"
                itemprop="datePublished"
              >
                {{ formattedDate }}
              </time>
            </div>
          </div>
        </div>

        <!-- Right Column - Description (Desktop) -->
        <div class="lg:col-span-4 lg:pt-2">
          <h2
            v-if="description"
            class="text-xl leading-relaxed font-medium text-crocus-200/90 border-l-2 border-crocus-500/30 pl-6"
            itemprop="description"
          >
            {{ description }}
          </h2>
        </div>

      </div>
    </div>
  </div>
</template>
