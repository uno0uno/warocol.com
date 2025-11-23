<script setup>
const currentYear = new Date().getFullYear()
</script>

<template>
  <footer class="bg-card text-foreground border-t border-border mt-auto py-6">
    <div class="container mx-auto px-6 flex flex-col items-center gap-4">
      <NuxtLink to="/" class="font-display font-bold text-base text-main">Waro Colombia</NuxtLink>
      <div class="flex gap-4">
        <a href="https://github.com/uno0uno/warolabs.com" target="_blank" rel="noopener" class="nav-link">Github</a>
        <a href="https://www.tiktok.com/@warocolombia" target="_blank" rel="noopener" class="nav-link">Tik Tok</a>
        <NuxtLink to="/blog" class="nav-link">Blog</NuxtLink>
      </div>
      <p class="text-xs text-muted-foreground">
        &copy; 2025 Waro Colombia. Todo el código es open source. pero para waro colombia
      </p>
    </div>
  </footer>
</template>