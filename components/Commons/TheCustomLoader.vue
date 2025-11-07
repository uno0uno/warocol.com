<template>
  <div :class="loaderClass"></div>
</template>

<script setup lang="ts">
interface Props {
  size?: 'small' | 'medium' | 'large'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'medium'
})

const loaderClass = computed(() => {
  const baseClass = 'loader'
  return `${baseClass} ${baseClass}-${props.size}`
})
</script>

<style scoped>
/* Custom loader using system colors */
.loader {
  display: inline-grid;
  padding: 5px;
  background: #fff;
  filter: blur(4px) contrast(12);
}

.loader:before {
  content: "";
  height: 40px;
  aspect-ratio: 3;
  --c: #0000 64%, #374151 66% 98%, #0000 101%; /* Using ebony color (secondary) */
  background:
    radial-gradient(35% 146% at 50% 159%, var(--c)) 0 0,
    radial-gradient(35% 146% at 50% -59%, var(--c)) 100% 100%;
  background-size: calc(200%/3) 50%;
  background-repeat: repeat-x;
  -webkit-mask: repeating-linear-gradient(90deg, #000 0 10%, #0000 0 20%);
  animation: l12 .8s infinite linear;
}

/* Small variant for inline use */
.loader-small {
  padding: 2px;
}

.loader-small:before {
  height: 16px;
  aspect-ratio: 2;
}

/* Medium variant (default) */
.loader-medium:before {
  height: 40px;
  aspect-ratio: 3;
}

/* Large variant for full page loading */
.loader-large {
  padding: 8px;
}

.loader-large:before {
  height: 60px;
  aspect-ratio: 4;
}

@keyframes l12 {
  to { background-position: -200% 0, -100% 100% }
}
</style>