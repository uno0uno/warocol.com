export function useLeadModal() {
  const isOpen = useState('lead-modal-open', () => false)
  const buttonSource = useState<string>('lead-modal-source', () => 'comenzar')
  const campaignSlug = useState<string>('lead-modal-campaign', () => '')

  function open(source: string = 'comenzar', opts?: { campaignSlug?: string }) {
    buttonSource.value = source
    campaignSlug.value = opts?.campaignSlug?.trim() || ''
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  return { isOpen, buttonSource, campaignSlug, open, close }
}
