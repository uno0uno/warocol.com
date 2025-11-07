/**
 * Encryption utilities for secure origin verification
 */

/**
 * Simple encryption using crypto-js for origin verification
 * @param {string} origin - The origin to encrypt (e.g., "warocol.com")
 * @returns {string} Base64 encoded encrypted origin
 */
export function encryptOrigin(origin) {
  try {
    const runtimeConfig = useRuntimeConfig()
    const publicKey = runtimeConfig.public.publicKeyEncrypter
    
    if (!publicKey) {
      console.warn('No public encryption key found')
      return null
    }

    // Simple encryption using btoa for now (can be enhanced with crypto-js)
    const timestamp = Date.now().toString()
    const payload = `${origin}|${timestamp}`
    
    // Basic encoding with key (can be enhanced with proper encryption)
    const encoded = btoa(payload + '|' + publicKey.slice(0, 8))
    
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