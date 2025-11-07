/**
 * Encryption utilities for secure origin verification
 */

/**
 * Simple encryption using JWT secret for origin verification
 * @param {string} origin - The origin to encrypt (e.g., "warocol.com")
 * @returns {string} Base64 encoded encrypted origin
 */
export function encryptOrigin(origin) {
  try {
    // Use a simple approach: we'll use a known key part that both sides have
    // For now, let's use a simple static key part (can be enhanced later)
    const timestamp = Date.now().toString()
    
    // Simple key part (first 8 chars of a known string)
    const keyPart = 'xo72T5GO' // First 8 chars of JWT secret from backend
    
    // Create payload: origin|timestamp|keyPart
    const payload = `${origin}|${timestamp}|${keyPart}`
    
    // Simple base64 encoding
    const encoded = btoa(payload)
    
    return encoded
    
  } catch (error) {
    console.error('Error encrypting origin:', error)
    return null
  }
}

/**
 * Get the current site origin for encryption
 * @returns {string} The current site (e.g., "warocol.com")
 */
export function getCurrentSite() {
  if (process.client) {
    return window.location.hostname
  }
  
  // Server-side: get from runtime config or environment
  const runtimeConfig = useRuntimeConfig()
  const baseUrl = runtimeConfig.public.baseUrl
  
  if (baseUrl) {
    try {
      const url = new URL(baseUrl)
      return url.hostname
    } catch {
      return null
    }
  }
  
  return null
}

/**
 * Get encrypted origin for API requests
 * @returns {string|null} Encrypted origin or null if encryption fails
 */
export function getEncryptedOrigin() {
  const currentSite = getCurrentSite()
  
  if (!currentSite) {
    console.warn('Could not determine current site for encryption')
    return null
  }
  
  return encryptOrigin(currentSite)
}