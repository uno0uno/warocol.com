<script setup lang="ts">
import { computed } from 'vue'

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
  readingTime?: number
}

const props = withDefaults(defineProps<Props>(), {
  readingTime: 5
})

const formatDate = (dateString: string | Date) => {
  const date = new Date(dateString)
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

const formattedDate = computed(() => formatDate(props.publishedDate))
</script>

<template>
  <!-- Light elevated article hero over the content surface -->
  <div class="w-full bg-surface relative overflow-hidden border-b border-border shadow-sm pt-8 pb-8 sm:pt-12 sm:pb-12 lg:pt-20 lg:pb-20">

    <!-- Textura food emoji — misma técnica que blog index y home -->
    <div class="food-bg" aria-hidden="true">
      <div class="food-item">🍞</div>
      <div class="food-item">🥖</div>
      <div class="food-item">🥐</div>
      <div class="food-item">🍕</div>
      <div class="food-item">🍔</div>
      <div class="food-item">🌮</div>
      <div class="food-item">🍟</div>
      <div class="food-item">🥪</div>
      <div class="food-item">🍖</div>
      <div class="food-item">🥙</div>
      <div class="food-item">🍗</div>
      <div class="food-item">🥓</div>
      <div class="food-item">🥩</div>
      <div class="food-item">🍳</div>
      <div class="food-item">🧀</div>
      <div class="food-item">🍱</div>
      <div class="food-item">🥗</div>
      <div class="food-item">🍝</div>
      <div class="food-item">🍜</div>
      <div class="food-item">🍲</div>
    </div>

    <div class="article-container relative z-10">
      <div class="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">

        <!-- Left Column — Title + Meta -->
        <div class="lg:col-span-7 flex flex-col gap-5">

          <!-- Title -->
          <h1
            class="text-3xl sm:text-4xl md:text-5xl font-black leading-[1.1] tracking-tight text-text-primary"
            itemprop="headline"
          >
            {{ title }}
          </h1>

          <!-- Author + Date + Reading time row -->
          <div class="flex items-center gap-3 pt-1">
            <!-- Avatar -->
            <div
              v-if="author.profilePicture"
              class="w-9 h-9 rounded-full overflow-hidden ring-2 ring-border flex-shrink-0"
            >
              <img :src="author.profilePicture" :alt="author.name" class="w-full h-full object-cover">
            </div>
            <div
              v-else
              class="w-9 h-9 rounded-full bg-badge-primary-bg flex items-center justify-center flex-shrink-0"
            >
              <span class="text-badge-primary-text text-sm font-bold">{{ author.name?.charAt(0) || 'W' }}</span>
            </div>

            <!-- Meta text -->
            <div class="flex flex-wrap items-center gap-1.5 text-sm text-text-secondary">
              <span class="font-semibold text-text-primary" itemprop="author">{{ author.name }}</span>
              <span class="text-text-tertiary">·</span>
              <time :datetime="new Date(publishedDate).toISOString()" itemprop="datePublished">
                {{ formattedDate }}
              </time>
              <span class="text-text-tertiary">·</span>
              <span>{{ readingTime }} min de lectura</span>
            </div>
          </div>
        </div>

        <!-- Right Column — Description as pull-quote (hidden on mobile) -->
        <div class="hidden lg:block lg:col-span-5 lg:pt-14">
          <p
            v-if="description"
            class="text-base lg:text-lg leading-relaxed text-text-secondary border-s-2 border-badge-primary-border ps-5"
            itemprop="description"
          >
            {{ description }}
          </p>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.food-bg {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  overflow: hidden;
  z-index: 1;
  pointer-events: none;
}

.food-item {
  position: absolute;
  font-size: 44px;
  opacity: 0.05;
  filter: grayscale(100%) brightness(0.7);
}

/* Fila 1 */
.food-item:nth-child(1)  { left:  2%; top: 12%; }
.food-item:nth-child(2)  { left: 14%; top: 12%; }
.food-item:nth-child(3)  { left: 26%; top: 12%; }
.food-item:nth-child(4)  { left: 38%; top: 12%; }
.food-item:nth-child(5)  { left: 50%; top: 12%; }
.food-item:nth-child(6)  { left: 62%; top: 12%; }
.food-item:nth-child(7)  { left: 74%; top: 12%; }
.food-item:nth-child(8)  { left: 86%; top: 12%; }
.food-item:nth-child(9)  { left: 95%; top: 12%; }
.food-item:nth-child(10) { left:  8%; top: 12%; }

/* Fila 2 */
.food-item:nth-child(11) { left:  2%; top: 65%; }
.food-item:nth-child(12) { left: 14%; top: 65%; }
.food-item:nth-child(13) { left: 26%; top: 65%; }
.food-item:nth-child(14) { left: 38%; top: 65%; }
.food-item:nth-child(15) { left: 50%; top: 65%; }
.food-item:nth-child(16) { left: 62%; top: 65%; }
.food-item:nth-child(17) { left: 74%; top: 65%; }
.food-item:nth-child(18) { left: 86%; top: 65%; }
.food-item:nth-child(19) { left: 95%; top: 65%; }
.food-item:nth-child(20) { left:  8%; top: 65%; }
</style>
