export function useLeadModal() {
  const isOpen = useState('lead-modal-open', () => false)
  const buttonSource = useState<string>('lead-modal-source', () => 'comenzar')

  function open(source: string = 'comenzar') {
    buttonSource.value = source
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  return { isOpen, buttonSource, open, close }
}
