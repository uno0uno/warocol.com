<script setup lang="ts">
import MarkdownIt from 'markdown-it'

interface Props {
  content: string
  showBreadcrumb?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showBreadcrumb: true
})

// Initialize markdown renderer
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true
})

// Render markdown content
const renderedContent = computed(() => md.render(props.content))
</script>

<template>
  <div class="w-full bg-[#F9FAFB] py-8 lg:py-12">
    <div class="article-container">
      <!-- Breadcrumb -->
      <div v-if="showBreadcrumb" class="mb-8">
        <slot name="breadcrumb" />
      </div>

      <!-- Content Grid Layout -->
      <div class="grid grid-cols-12 gap-8">
        <!-- Left Spacer - Hidden on mobile -->
        <div class="hidden lg:block lg:col-span-1" />

        <!-- Main Content -->
        <div class="col-span-12 lg:col-span-10">
          <article
            class="article-style"
            itemprop="articleBody"
            v-html="renderedContent"
          />

          <!-- Author Card Slot -->
          <div class="mt-12 lg:mt-16">
            <slot name="author" />
          </div>
        </div>

        <!-- Right Spacer - Hidden on mobile -->
        <div class="hidden lg:block lg:col-span-1" />
      </div>
    </div>
  </div>
</template>
