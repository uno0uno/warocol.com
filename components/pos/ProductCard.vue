<template>
  <button
    type="button"
    :style="cardStyle"
    class="group relative flex flex-col items-center p-2 md:p-4 border-2 rounded-2xl theme-transition cursor-pointer active:scale-[0.97]"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @click="$emit('select', product)"
  >
    <!-- Product icon: real image when uploaded, emoji as fallback (#465) -->
    <div :style="iconSlotStyle" class="relative w-full aspect-[3/2] border border-border/30 rounded-2xl shadow-sm flex items-center justify-center mb-1.5 md:mb-3 select-none flex-shrink-0 overflow-hidden">
      <span
        v-if="promoBadge"
        class="absolute top-1 start-1 end-1 z-10 max-w-full text-[9px] md:text-[10px] bg-badge-success-bg text-badge-success-text px-1.5 py-0.5 rounded-full font-semibold truncate text-center shadow-sm pointer-events-none"
        :title="promoBadge.title || promoBadge.label"
      >
        {{ promoBadge.label }}
      </span>
      <img
        v-if="product.image_url && product.image_url.startsWith('http')"
        :src="product.image_url"
        :alt="product.name"
        loading="lazy"
        class="w-full h-full object-cover"
      />
      <span v-else class="text-3xl md:text-5xl">{{ product.image }}</span>
    </div>

    <!-- Name -->
    <p class="text-xs md:text-sm font-semibold text-text-primary text-center leading-tight line-clamp-2 min-h-[2rem] flex items-center justify-center px-0.5">
      {{ product.name }}
    </p>

    <!-- Price -->
    <div class="w-full mt-1.5 md:mt-2.5 pt-1.5 md:pt-2.5 border-t border-border/60">
      <p class="text-[10px] md:text-sm font-bold text-primary text-center">
        {{ formatCurrency(product.price) }}
      </p>
    </div>
  </button>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const { formatCurrency } = useFormatters()

interface Product {
  id: string
  name: string
  price: number
  category: string
  image: string
  image_url?: string | null
  available: boolean
}

interface PromoBadge {
  label: string
  title?: string
}

interface Props {
  product: Product
  promoBadge?: PromoBadge | null
}

interface Emits {
  (e: 'select', product: Product): void
}

const props = defineProps<Props>()
defineEmits<Emits>()

const isHovered = ref(false)

interface ColorEntry {
  keywords: string[]
  bg: string
  hoverBg: string
  border: string
  slotBg: string  // Icon slot uses a -300 tint of the same hue so the slot stands out from the card surface (-200) without competing with the -500 border.
}

// Similarity-based: score by how many keywords appear in the text.
// Fondos en -200, hover -300, slot -300, bordes -500/-600 con 2px
const colorEntries: ColorEntry[] = [
  {
    keywords: ['veg', 'viggi', 'saludab', 'ensalad', 'orella', 'bowl', 'organico', 'orgánico'],
    bg: '#DCFCE7', hoverBg: '#BBF7D0', border: '#16A34A', slotBg: '#BBF7D0'   // 🟢 verde
  },
  {
    keywords: ['bebida', 'jugo', 'agua', 'cafe', 'café', 'limon', 'cerveza', 'coctel', 'fresco', 'smoothie', 'soda', 'refresc', 'gaseosa', 'drink'],
    bg: '#E0F2FE', hoverBg: '#BAE6FD', border: '#0284C7', slotBg: '#BAE6FD'   // 🔵 azul cielo
  },
  {
    keywords: ['postre', 'torta', 'helado', 'dulce', 'brownie', 'galleta', 'donut', 'cake', 'tarta', 'flan', 'mousse', 'crepe', 'pastel'],
    bg: '#FCE7F3', hoverBg: '#FBCFE8', border: '#DB2777', slotBg: '#FBCFE8'   // 🩷 rosa
  },
  {
    keywords: ['hamburgues', 'burg', 'hot dog', 'hotdog', 'chorizo', 'chori', 'pollo', 'res', 'carne', 'chicken', 'beef', 'costilla', 'cerdo', 'lomo', 'filete', 'asado', 'bestial', 'sencill'],
    bg: '#FFEDD5', hoverBg: '#FED7AA', border: '#EA580C', slotBg: '#FED7AA'   // 🟠 naranja
  },
  {
    keywords: ['pizza', 'calzone'],
    bg: '#FFE4E6', hoverBg: '#FECDD3', border: '#E11D48', slotBg: '#FECDD3'   // 🔴 rojo coral
  },
  {
    keywords: ['pasta', 'sopa', 'crema', 'arroz', 'fideo', 'lasaña', 'espagueti'],
    bg: '#FEF9C3', hoverBg: '#FEF08A', border: '#CA8A04', slotBg: '#FEF08A'   // 🟡 amarillo
  },
  {
    keywords: ['papa', 'frit', 'empanada', 'snack', 'alita', 'croqueta', 'entrada'],
    bg: '#CCFBF1', hoverBg: '#99F6E4', border: '#0D9488', slotBg: '#99F6E4'   // 🩵 teal
  },
  {
    keywords: ['pescado', 'marisco', 'salmon', 'salmón', 'atun', 'atún', 'camaron', 'camarón', 'langosta', 'pulpo', 'seafood'],
    bg: '#E0E7FF', hoverBg: '#C7D2FE', border: '#4338CA', slotBg: '#C7D2FE'   // 🔷 índigo
  },
  {
    keywords: ['desayuno', 'huevo', 'tostada', 'pancake', 'waffle', 'arepa', 'tamal', 'breakfast'],
    bg: '#FEF3C7', hoverBg: '#FDE68A', border: '#D97706', slotBg: '#FDE68A'   // 🟤 ámbar
  },
  {
    keywords: ['caja', 'llevar', 'empaque', 'bolsa', 'envase'],
    bg: '#EDE9FE', hoverBg: '#DDD6FE', border: '#7C3AED', slotBg: '#DDD6FE'   // 🟣 violeta
  },
  {
    keywords: ['sandwich', 'wrap', 'panini', 'taco', 'burrito', 'quesadilla'],
    bg: '#FAE8FF', hoverBg: '#F5D0FE', border: '#C026D3', slotBg: '#F5D0FE'   // 💜 fucsia
  },
]

// Score each entry by counting keyword matches in the combined text.
// Returns the color with highest score, or the surface fallback.
const getColorForProduct = (category: string, name: string) => {
  const text = `${category} ${name}`.toLowerCase()

  let bestEntry: ColorEntry | null = null
  let bestScore = 0

  for (const entry of colorEntries) {
    const score = entry.keywords.filter(kw => text.includes(kw)).length
    if (score > bestScore) {
      bestScore = score
      bestEntry = entry
    }
  }

  return bestEntry ?? {
    bg: 'hsl(var(--surface))',
    hoverBg: 'hsl(var(--surface-secondary))',
    border: 'hsl(var(--border))',
    slotBg: 'hsl(var(--surface-secondary))'
  }
}

const cardStyle = computed(() => {
  const colors = getColorForProduct(props.product.category, props.product.name)
  return {
    backgroundColor: isHovered.value ? colors.hoverBg : colors.bg,
    borderColor: colors.border,
    borderWidth: '2px',
  }
})

const iconSlotStyle = computed(() => {
  const colors = getColorForProduct(props.product.category, props.product.name)
  return { backgroundColor: colors.slotBg }
})
</script>
