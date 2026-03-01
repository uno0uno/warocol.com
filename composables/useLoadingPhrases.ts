import { ref, computed, onUnmounted } from 'vue'

export function useLoadingPhrases(phrases: string[] = [
  'Cargando...',
  'Verificando...',
  'Casi listo...'
]) {
  const currentIndex = ref(0)
  const currentPhrase = computed(() => phrases[currentIndex.value])
  let interval: ReturnType<typeof setInterval> | null = null

  function start() {
    if (interval) return
    currentIndex.value = 0
    interval = setInterval(() => {
      currentIndex.value = (currentIndex.value + 1) % phrases.length
    }, 1500)
  }

  function stop() {
    if (interval) {
      clearInterval(interval)
      interval = null
    }
  }

  onUnmounted(() => stop())

  return { currentPhrase, start, stop }
}
