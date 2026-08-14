<script setup lang="ts">
const error = useError()
const is404 = computed(() => Number(error.value?.statusCode) === 404)

useHead({
  title: () => (is404.value ? 'Página no encontrada | Waro Colombia' : 'Error | Waro Colombia'),
  meta: [{ name: 'robots', content: 'noindex, follow' }],
})

const goHome = async () => {
  await clearError({ redirect: '/' })
}

const goBlog = async () => {
  await clearError({ redirect: '/blog' })
}
</script>

<template>
  <div class="error-page">
    <PublicHomeFoodBackground />
    <div class="error-copy">
      <p class="error-code font-quantico">{{ is404 ? '404' : (error?.statusCode || 500) }}</p>
      <h1 class="font-quantico">
        {{ is404 ? 'No encontramos esta página' : 'Algo salió mal' }}
      </h1>
      <p class="error-body">
        {{ is404
          ? 'El enlace no existe o ya no está publicado. Prueba el inicio o el blog.'
          : 'No pudimos cargar esta página. Vuelve al inicio e inténtalo de nuevo.' }}
      </p>
      <div class="error-actions">
        <button class="btn btn-primary" type="button" @click="goHome">
          Ir al inicio
        </button>
        <button v-if="is404" class="btn btn-secondary" type="button" @click="goBlog">
          Ir al blog
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.error-page {
  position: relative;
  display: flex;
  flex: 1 1 auto;
  min-height: 100dvh;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: transparent;
  color: hsl(250, 30%, 16%);
  padding: 1.5rem 1.25rem;
}

.error-copy {
  position: relative;
  z-index: 5;
  max-width: 40rem;
  text-align: center;
}

.error-code {
  font-size: clamp(3rem, 8vw, 6rem);
  font-weight: 900;
  letter-spacing: -0.08em;
  line-height: 0.9;
  margin: 0 0 0.75rem;
  text-transform: uppercase;
  color: hsl(262, 83%, 58%);
}

h1 {
  font-size: clamp(1.75rem, 4vw + 0.5vh, 3.25rem);
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 0.95;
  text-transform: uppercase;
  margin: 0 0 1rem;
}

.error-body {
  font-size: clamp(1rem, 1.4vw + 0.4vh, 1.2rem);
  line-height: 1.5;
  color: hsl(220, 13%, 28%);
  margin: 0 0 1.75rem;
}

.error-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: clamp(1rem, 2.2vh, 1.35rem) clamp(2rem, 5vw, 3.25rem);
  font-size: clamp(0.95rem, 1.2vw + 0.4vh, 1.15rem);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  border-radius: 10px;
  cursor: pointer;
  text-decoration: none;
  min-width: min(100%, 220px);
  min-height: 3.25rem;
}

.btn-primary {
  background: hsl(262, 83%, 58%);
  color: white;
  border: 2px solid hsl(262, 83%, 58%);
}

.btn-secondary {
  background: transparent;
  color: hsl(250, 30%, 16%);
  border: 2px solid hsl(250, 30%, 16%);
}

@media (max-width: 768px) {
  .btn {
    width: 100%;
    max-width: 22rem;
  }
}
</style>
