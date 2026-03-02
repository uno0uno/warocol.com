export function useAccessRequestModal() {
  const isOpen = useState('access-request-modal-open', () => false)
  const prefilledEmail = useState('access-request-modal-email', () => '')

  function open(email = '') {
    prefilledEmail.value = email
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  return { isOpen, prefilledEmail, open, close }
}
