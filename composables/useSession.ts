/**
 * Session Management Composable
 * Handles session ID creation and retrieval for guest checkout
 */
export const useSession = () => {
  const getSessionId = (): string => {
    if (!process.client) {
      return ''
    }

    let sessionId = localStorage.getItem('waro_session_id')

    if (!sessionId) {
      // Generate new session ID
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('waro_session_id', sessionId)
    }

    return sessionId
  }

  const clearSession = () => {
    if (process.client) {
      localStorage.removeItem('waro_session_id')
    }
  }

  return {
    getSessionId,
    clearSession,
  }
}
