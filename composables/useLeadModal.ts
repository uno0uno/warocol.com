const isOpen = ref(false)
const buttonSource = ref<'comenzar' | 'habla_con_nosotros'>('comenzar')

export function useLeadModal() {
  function open(source: 'comenzar' | 'habla_con_nosotros' = 'comenzar') {
    buttonSource.value = source
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  return { isOpen, buttonSource, open, close }
}
