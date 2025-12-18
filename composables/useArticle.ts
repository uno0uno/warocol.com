export const useArticle = () => {
  /**
   * Format a date string to a readable format
   * @param dateString - ISO date string or Date object
   * @returns Formatted date string (e.g., "Ene 15, 2024")
   */
  const formatDate = (dateString: string | Date): string => {
    const date = new Date(dateString)
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    const month = months[date.getMonth()]
    const day = date.getDate()
    const year = date.getFullYear()
    return `${month} ${day}, ${year}`
  }

  /**
   * Calculate reading time based on content
   * @param content - Article content (markdown or plain text)
   * @param wordsPerMinute - Average reading speed (default: 200)
   * @returns Reading time in minutes
   */
  const calculateReadingTime = (content: string, wordsPerMinute = 200): number => {
    // Remove markdown syntax and HTML tags
    const plainText = content
      .replace(/[#*_~`[\]()]/g, '')
      .replace(/<[^>]*>/g, '')

    const wordCount = plainText.trim().split(/\s+/).length
    const minutes = Math.ceil(wordCount / wordsPerMinute)

    return Math.max(1, minutes)
  }

  /**
   * Format reading time to a human-readable string
   * @param minutes - Reading time in minutes
   * @returns Formatted string (e.g., "5 min de lectura")
   */
  const formatReadingTime = (minutes: number): string => {
    return `${minutes} min de lectura`
  }

  /**
   * Extract excerpt from content
   * @param content - Article content
   * @param maxLength - Maximum length of excerpt (default: 160)
   * @returns Excerpt string
   */
  const extractExcerpt = (content: string, maxLength = 160): string => {
    // Remove markdown syntax and HTML tags
    const plainText = content
      .replace(/[#*_~`[\]()]/g, '')
      .replace(/<[^>]*>/g, '')
      .trim()

    if (plainText.length <= maxLength) {
      return plainText
    }

    // Cut at the last complete word before maxLength
    const excerpt = plainText.substring(0, maxLength)
    const lastSpaceIndex = excerpt.lastIndexOf(' ')

    return lastSpaceIndex > 0
      ? excerpt.substring(0, lastSpaceIndex) + '...'
      : excerpt + '...'
  }

  /**
   * Generate article URL based on slug
   * @param slug - Article slug
   * @returns Full article URL
   */
  const getArticleUrl = (slug: string): string => {
    return `/blog/${slug}`
  }

  /**
   * Check if article is recently published (within last 7 days)
   * @param publishedDate - Publication date
   * @returns Boolean indicating if article is recent
   */
  const isRecentArticle = (publishedDate: string | Date): boolean => {
    const date = new Date(publishedDate)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return diffDays <= 7
  }

  /**
   * Format relative time (e.g., "hace 2 días")
   * @param date - Date to format
   * @returns Relative time string
   */
  const formatRelativeTime = (date: string | Date): string => {
    const targetDate = new Date(date)
    const now = new Date()
    const diffTime = now.getTime() - targetDate.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
    const diffMinutes = Math.floor(diffTime / (1000 * 60))

    if (diffMinutes < 60) {
      return `hace ${diffMinutes} ${diffMinutes === 1 ? 'minuto' : 'minutos'}`
    } else if (diffHours < 24) {
      return `hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`
    } else if (diffDays < 7) {
      return `hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7)
      return `hace ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30)
      return `hace ${months} ${months === 1 ? 'mes' : 'meses'}`
    } else {
      const years = Math.floor(diffDays / 365)
      return `hace ${years} ${years === 1 ? 'año' : 'años'}`
    }
  }

  return {
    formatDate,
    calculateReadingTime,
    formatReadingTime,
    extractExcerpt,
    getArticleUrl,
    isRecentArticle,
    formatRelativeTime
  }
}
