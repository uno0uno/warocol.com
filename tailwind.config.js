/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./nuxt.config.{js,ts}",
    "./app.vue",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        // Warocol Design System Colors - Legacy
        surface: {
          DEFAULT: "hsl(var(--surface) / <alpha-value>)",
          secondary: "hsl(var(--surface-secondary) / <alpha-value>)",
          tertiary: "hsl(var(--surface-tertiary) / <alpha-value>)",
        },
        text: {
          primary: "hsl(var(--text-primary) / <alpha-value>)",
          secondary: "hsl(var(--text-secondary) / <alpha-value>)",
          tertiary: "hsl(var(--text-tertiary) / <alpha-value>)",
        },
        success: {
          DEFAULT: "hsl(var(--success) / <alpha-value>)",
          foreground: "hsl(var(--success-foreground) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "hsl(var(--warning) / <alpha-value>)",
          foreground: "hsl(var(--warning-foreground) / <alpha-value>)",
        },
        info: {
          DEFAULT: "hsl(var(--info) / <alpha-value>)",
          foreground: "hsl(var(--info-foreground) / <alpha-value>)",
        },
        focus: {
          ring: "hsl(var(--focus-ring) / <alpha-value>)",
          subtle: "hsl(var(--focus-ring-subtle) / <alpha-value>)",
        },
        state: {
          danger: {
            bg: "hsl(var(--state-danger-bg) / <alpha-value>)",
            border: "hsl(var(--state-danger-border) / <alpha-value>)",
            text: "hsl(var(--state-danger-text) / <alpha-value>)",
            icon: "hsl(var(--state-danger-icon) / <alpha-value>)",
            action: {
              bg: "hsl(var(--state-danger-action-bg) / <alpha-value>)",
              text: "hsl(var(--state-danger-action-text) / <alpha-value>)",
            },
          },
          warning: {
            bg: "hsl(var(--state-warning-bg) / <alpha-value>)",
            border: "hsl(var(--state-warning-border) / <alpha-value>)",
            text: "hsl(var(--state-warning-text) / <alpha-value>)",
            icon: "hsl(var(--state-warning-icon) / <alpha-value>)",
            action: {
              bg: "hsl(var(--state-warning-action-bg) / <alpha-value>)",
              text: "hsl(var(--state-warning-action-text) / <alpha-value>)",
            },
          },
          success: {
            bg: "hsl(var(--state-success-bg) / <alpha-value>)",
            border: "hsl(var(--state-success-border) / <alpha-value>)",
            text: "hsl(var(--state-success-text) / <alpha-value>)",
            icon: "hsl(var(--state-success-icon) / <alpha-value>)",
            action: {
              bg: "hsl(var(--state-success-action-bg) / <alpha-value>)",
              text: "hsl(var(--state-success-action-text) / <alpha-value>)",
            },
          },
          info: {
            bg: "hsl(var(--state-info-bg) / <alpha-value>)",
            border: "hsl(var(--state-info-border) / <alpha-value>)",
            text: "hsl(var(--state-info-text) / <alpha-value>)",
            icon: "hsl(var(--state-info-icon) / <alpha-value>)",
            action: {
              bg: "hsl(var(--state-info-action-bg) / <alpha-value>)",
              text: "hsl(var(--state-info-action-text) / <alpha-value>)",
            },
          },
        },
        nav: {
          "item-hover-bg": "hsl(var(--nav-item-hover-bg) / <alpha-value>)",
          "item-active-bg": "hsl(var(--nav-item-active-bg) / <alpha-value>)",
          "icon-idle": "hsl(var(--nav-icon-idle) / <alpha-value>)",
          "icon-hover": "hsl(var(--nav-icon-hover) / <alpha-value>)",
          "icon-active": "hsl(var(--nav-icon-active) / <alpha-value>)",
          "label-idle": "hsl(var(--nav-label-idle) / <alpha-value>)",
          "label-hover": "hsl(var(--nav-label-hover) / <alpha-value>)",
          "label-active": "hsl(var(--nav-label-active) / <alpha-value>)",
          "section-label": "hsl(var(--nav-section-label) / <alpha-value>)",
          divider: "hsl(var(--nav-divider) / <alpha-value>)",
        },
        "data-table": {
          "container-bg": "hsl(var(--data-table-container-bg) / <alpha-value>)",
          "header-bg": "hsl(var(--data-table-header-bg) / <alpha-value>)",
          "header-text": "hsl(var(--data-table-header-text) / <alpha-value>)",
          "row-bg": "hsl(var(--data-table-row-bg) / <alpha-value>)",
          "row-alt-bg": "hsl(var(--data-table-row-alt-bg) / <alpha-value>)",
          "row-hover-bg": "hsl(var(--data-table-row-hover-bg) / <alpha-value>)",
          "row-selected-bg": "hsl(var(--data-table-row-selected-bg) / <alpha-value>)",
          "row-new-bg": "hsl(var(--data-table-row-new-bg) / <alpha-value>)",
          border: "hsl(var(--data-table-border) / <alpha-value>)",
          "cell-text": "hsl(var(--data-table-cell-text) / <alpha-value>)",
          "cell-muted": "hsl(var(--data-table-cell-muted) / <alpha-value>)",
          "footer-bg": "hsl(var(--data-table-footer-bg) / <alpha-value>)",
        },
        control: {
          "toggle-track-off": "hsl(var(--control-toggle-track-off) / <alpha-value>)",
          "toggle-track-on": "hsl(var(--control-toggle-track-on) / <alpha-value>)",
          "toggle-thumb": "hsl(var(--control-toggle-thumb) / <alpha-value>)",
          "toggle-focus-ring": "hsl(var(--control-toggle-focus-ring) / <alpha-value>)",
          "action-hover-bg": "hsl(var(--control-action-hover-bg) / <alpha-value>)",
          "action-hover-text": "hsl(var(--control-action-hover-text) / <alpha-value>)",
        },
        filter: {
          "surface-bg": "hsl(var(--filter-surface-bg) / <alpha-value>)",
          "surface-border": "hsl(var(--filter-surface-border) / <alpha-value>)",
          "control-bg": "hsl(var(--filter-control-bg) / <alpha-value>)",
          "control-text": "hsl(var(--filter-control-text) / <alpha-value>)",
          "control-placeholder": "hsl(var(--filter-control-placeholder) / <alpha-value>)",
          "control-focus-ring": "hsl(var(--filter-control-focus-ring) / <alpha-value>)",
        },
        "status-chip": {
          bg: "hsl(var(--status-chip-bg) / <alpha-value>)",
          text: "hsl(var(--status-chip-text) / <alpha-value>)",
          border: "hsl(var(--status-chip-border) / <alpha-value>)",
        },
        // Status badge tokens — OKLCH perceptually uniform
        // bg: very low chroma (barely tinted) / text: readable contrast
        // Usage: bg-status-critical-bg, text-status-critical-text, etc.
        "status-critical-bg":   "var(--status-critical-bg)",
        "status-critical-text": "var(--status-critical-text)",
        "status-warning-bg":    "var(--status-warning-bg)",
        "status-warning-text":  "var(--status-warning-text)",
        "status-info-bg":       "var(--status-info-bg)",
        "status-info-text":     "var(--status-info-text)",
        "status-success-bg":    "var(--status-success-bg)",
        "status-success-text":  "var(--status-success-text)",
        // Nueva Paleta de Colores - Titan White (Grises Claros)
        titan: {
          50: "hsl(var(--titan-50) / <alpha-value>)",
          100: "hsl(var(--titan-100) / <alpha-value>)",
          200: "hsl(var(--titan-200) / <alpha-value>)",
          300: "hsl(var(--titan-300) / <alpha-value>)",
          400: "hsl(var(--titan-400) / <alpha-value>)",
          500: "hsl(var(--titan-500) / <alpha-value>)",
          600: "hsl(var(--titan-600) / <alpha-value>)",
          700: "hsl(var(--titan-700) / <alpha-value>)",
          800: "hsl(var(--titan-800) / <alpha-value>)",
          900: "hsl(var(--titan-900) / <alpha-value>)",
        },
        // Nueva Paleta de Colores - Crocus Purple (Púrpura)
        crocus: {
          50: "hsl(var(--crocus-50) / <alpha-value>)",
          100: "hsl(var(--crocus-100) / <alpha-value>)",
          200: "hsl(var(--crocus-200) / <alpha-value>)",
          300: "hsl(var(--crocus-300) / <alpha-value>)",
          400: "hsl(var(--crocus-400) / <alpha-value>)",
          500: "hsl(var(--crocus-500) / <alpha-value>)",
          600: "hsl(var(--crocus-600) / <alpha-value>)",
          700: "hsl(var(--crocus-700) / <alpha-value>)",
          800: "hsl(var(--crocus-800) / <alpha-value>)",
          900: "hsl(var(--crocus-900) / <alpha-value>)",
        },
        // Nueva Paleta de Colores - Ebony Clay (Grises Oscuros)
        ebony: {
          50: "hsl(var(--ebony-50) / <alpha-value>)",
          100: "hsl(var(--ebony-100) / <alpha-value>)",
          200: "hsl(var(--ebony-200) / <alpha-value>)",
          300: "hsl(var(--ebony-300) / <alpha-value>)",
          400: "hsl(var(--ebony-400) / <alpha-value>)",
          500: "hsl(var(--ebony-500) / <alpha-value>)",
          600: "hsl(var(--ebony-600) / <alpha-value>)",
          700: "hsl(var(--ebony-700) / <alpha-value>)",
          800: "hsl(var(--ebony-800) / <alpha-value>)",
          900: "hsl(var(--ebony-900) / <alpha-value>)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        principal: ['Lato'],
        sans: ['Lato', 'sans-serif'],
        quantico: ['Quantico', 'Lato', 'sans-serif'],
      },
      fontSize: {
        "dense-label": [
          "var(--type-dense-label-size)",
          {
            lineHeight: "var(--type-dense-label-line-height)",
            fontWeight: "var(--type-dense-label-weight)",
          },
        ],
        "dense-value": [
          "var(--type-dense-value-size)",
          {
            lineHeight: "var(--type-dense-value-line-height)",
            fontWeight: "var(--type-dense-value-weight)",
          },
        ],
        "dense-meta": [
          "var(--type-dense-meta-size)",
          {
            lineHeight: "var(--type-dense-meta-line-height)",
            fontWeight: "var(--type-dense-meta-weight)",
          },
        ],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require("tailwindcss-animate"),
  ],
}
