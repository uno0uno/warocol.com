export function useLeadModal() {
  const isOpen = useState('lead-modal-open', () => false)
  const buttonSource = useState<'comenzar' | 'habla_con_nosotros' | 'blog_cta'>('lead-modal-source', () => 'comenzar')

  function open(source: 'comenzar' | 'habla_con_nosotros' | 'blog_cta' = 'comenzar') {
    buttonSource.value = source
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  return { isOpen, buttonSource, open, close }
}
