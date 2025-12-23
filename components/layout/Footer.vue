<script setup>
const { public: config } = useRuntimeConfig()
const currentYear = new Date().getFullYear()
const siteName = config.siteName || 'Waro Colombia'
const instagramUrl = config.instagramUrl
</script>

<template>
  <footer class="bg-card text-foreground border-t border-border mt-auto py-6">
    <div class="container mx-auto px-6 flex flex-col items-center gap-4">
      <NuxtLink to="/" class="font-display font-bold text-base text-main">{{ siteName }}</NuxtLink>
      <div class="flex gap-4">
        <a href="https://github.com/uno0uno/warocol.com" target="_blank" rel="noopener" class="nav-link">Github</a>
        <a v-if="instagramUrl" :href="instagramUrl" target="_blank" rel="noopener" class="nav-link">Instagram</a>
        <NuxtLink to="/blog" class="nav-link">Blog</NuxtLink>
      </div>
      <p class="text-xs text-muted-foreground">
        &copy; {{ currentYear }} {{ siteName }}. Todos los derechos reservados.
      </p>
    </div>
  </footer>
</template>