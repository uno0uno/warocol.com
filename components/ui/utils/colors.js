// Warocol Design System - Dark Color Palette
export const colors = {
  // Base backgrounds
  background: {
    primary: '#000000',     // Pure black - main background
    secondary: '#0a0a0a',   // Almost black - section backgrounds
    elevated: '#1a1a1a',    // Dark gray - cards, modals
    hover: '#2a2a2a',       // Hover states
  },
  
  // Surface colors for components
  surface: {
    primary: '#1a1a1a',     // Main component background
    secondary: '#2a2a2a',   // Secondary component background
    tertiary: '#3a3a3a',    // Tertiary surface
    border: '#404040',      // Borders and dividers
  },
  
  // Text colors
  text: {
    primary: '#ffffff',     // Primary text
    secondary: '#b0b0b0',   // Secondary text
    tertiary: '#808080',    // Tertiary text / placeholders
    disabled: '#505050',    // Disabled text
  },
  
  // Accent colors
  accent: {
    primary: '#6b9fff',     // Primary blue
    secondary: '#4f8fff',   // Darker blue for hover
    success: '#22c55e',     // Green for success
    warning: '#f59e0b',     // Orange for warning
    error: '#ef4444',       // Red for errors
    info: '#3b82f6',        // Blue for info
  },
  
  // Component specific
  badge: {
    background: '#2a2a2a',
    border: '#404040',
    text: '#b0b0b0',
  },
  
  button: {
    primary: '#1a1a1a',
    primaryHover: '#2a2a2a',
    secondary: '#2a2a2a',
    secondaryHover: '#3a3a3a',
    border: '#404040',
  },
  
  card: {
    background: '#1a1a1a',
    border: '#2a2a2a',
    hover: '#2a2a2a',
  },
  
  input: {
    background: '#1a1a1a',
    border: '#404040',
    focus: '#6b9fff',
    placeholder: '#808080',
  }
}

// Helper function to get color with opacity
export const withOpacity = (color, opacity) => {
  return `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`
}

// CSS variables mapping
export const cssVariables = {
  '--bg-primary': colors.background.primary,
  '--bg-secondary': colors.background.secondary,
  '--bg-elevated': colors.background.elevated,
  '--bg-hover': colors.background.hover,
  
  '--surface-primary': colors.surface.primary,
  '--surface-secondary': colors.surface.secondary,
  '--surface-tertiary': colors.surface.tertiary,
  '--surface-border': colors.surface.border,
  
  '--text-primary': colors.text.primary,
  '--text-secondary': colors.text.secondary,
  '--text-tertiary': colors.text.tertiary,
  '--text-disabled': colors.text.disabled,
  
  '--accent-primary': colors.accent.primary,
  '--accent-secondary': colors.accent.secondary,
  '--accent-success': colors.accent.success,
  '--accent-warning': colors.accent.warning,
  '--accent-error': colors.accent.error,
  '--accent-info': colors.accent.info,
}