<template>
  <button
    type="button"
    :style="cardStyle"
    class="group relative flex h-full w-full flex-col items-center p-2 md:p-4 border-2 rounded-2xl theme-transition cursor-pointer active:scale-[0.97]"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @click="$emit('select', product)"
  >
    <!-- Product icon: real image when uploaded, emoji as fallback (#465) -->
    <div
      v-if="showImage"
      :style="iconSlotStyle"
      class="relative w-full aspect-[3/2] border border-border/30 rounded-2xl shadow-sm flex items-center justify-center mb-1.5 md:mb-3 select-none flex-shrink-0 overflow-hidden"
    >
      <span
        v-if="promoBadge"
        class="absolute top-1 start-1 end-1 z-10 max-w-full text-[9px] md:text-[10px] bg-badge-success-bg/80 text-badge-success-text/90 px-1.5 py-0.5 rounded-full font-medium truncate text-center pointer-events-none"
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
    <!-- Keep height stable when images are off (promo present or not) -->
    <div
      v-else
      class="mb-1.5 flex min-h-[1.25rem] w-full flex-shrink-0 items-center justify-center"
    >
      <span
        v-if="promoBadge"
        class="max-w-full text-[9px] md:text-[10px] bg-badge-success-bg/80 text-badge-success-text/90 px-1.5 py-0.5 rounded-full font-medium truncate text-center pointer-events-none"
        :title="promoBadge.title || promoBadge.label"
      >
        {{ promoBadge.label }}
      </span>
    </div>

    <!-- Name — fixed 2-line slot so every card matches -->
    <p class="text-xs md:text-sm font-semibold text-text-primary text-center leading-tight line-clamp-2 min-h-[2rem] flex flex-1 items-center justify-center px-0.5">
      {{ product.name }}
    </p>

    <!-- Price — pinned to bottom for equal card bottoms -->
    <div class="mt-auto w-full pt-1.5 md:pt-2.5 border-t border-border/60">
      <p class="text-[10px] md:text-sm font-semibold text-text-primary/80 text-center">
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
  showImage?: boolean
}

interface Emits {
  (e: 'select', product: Product): void
}

const props = withDefaults(defineProps<Props>(), {
  showImage: true,
})
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
// Fondos más bajos (-50/-100), bordes suaves (-300/-400) — menos saturación en POS
const colorEntries: ColorEntry[] = [
  {
    keywords: ['veg', 'viggi', 'saludab', 'ensalad', 'orella', 'bowl', 'organico', 'orgánico'],
    bg: '#F0FDF4', hoverBg: '#DCFCE7', border: '#86EFAC', slotBg: '#DCFCE7'   // 🟢 verde suave
  },
  {
    keywords: ['bebida', 'jugo', 'agua', 'cafe', 'café', 'limon', 'cerveza', 'coctel', 'fresco', 'smoothie', 'soda', 'refresc', 'gaseosa', 'drink'],
    bg: '#F0F9FF', hoverBg: '#E0F2FE', border: '#7DD3FC', slotBg: '#E0F2FE'   // 🔵 cielo suave
  },
  {
    keywords: ['postre', 'torta', 'helado', 'dulce', 'brownie', 'galleta', 'donut', 'cake', 'tarta', 'flan', 'mousse', 'crepe', 'pastel'],
    bg: '#FDF2F8', hoverBg: '#FCE7F3', border: '#F9A8D4', slotBg: '#FCE7F3'   // 🩷 rosa suave
  },
  {
    keywords: ['hamburgues', 'burg', 'hot dog', 'hotdog', 'chorizo', 'chori', 'pollo', 'res', 'carne', 'chicken', 'beef', 'costilla', 'cerdo', 'lomo', 'filete', 'asado', 'bestial', 'sencill'],
    bg: '#FFF7ED', hoverBg: '#FFEDD5', border: '#FDBA74', slotBg: '#FFEDD5'   // 🟠 naranja suave
  },
  {
    keywords: ['pizza', 'calzone'],
    bg: '#FFF1F2', hoverBg: '#FFE4E6', border: '#FDA4AF', slotBg: '#FFE4E6'   // 🔴 coral suave
  },
  {
    keywords: ['pasta', 'sopa', 'crema', 'arroz', 'fideo', 'lasaña', 'espagueti'],
    bg: '#FEFCE8', hoverBg: '#FEF9C3', border: '#FDE047', slotBg: '#FEF9C3'   // 🟡 amarillo suave
  },
  {
    keywords: ['papa', 'frit', 'empanada', 'snack', 'alita', 'croqueta', 'entrada'],
    bg: '#F0FDFA', hoverBg: '#CCFBF1', border: '#5EEAD4', slotBg: '#CCFBF1'   // 🩵 teal suave
  },
  {
    keywords: ['pescado', 'marisco', 'salmon', 'salmón', 'atun', 'atún', 'camaron', 'camarón', 'langosta', 'pulpo', 'seafood'],
    bg: '#EEF2FF', hoverBg: '#E0E7FF', border: '#A5B4FC', slotBg: '#E0E7FF'   // 🔷 índigo suave
  },
  {
    keywords: ['desayuno', 'huevo', 'tostada', 'pancake', 'waffle', 'arepa', 'tamal', 'breakfast'],
    bg: '#FFFBEB', hoverBg: '#FEF3C7', border: '#FCD34D', slotBg: '#FEF3C7'   // 🟤 ámbar suave
  },
  {
    keywords: ['caja', 'llevar', 'empaque', 'bolsa', 'envase'],
    bg: '#F5F3FF', hoverBg: '#EDE9FE', border: '#C4B5FD', slotBg: '#EDE9FE'   // 🟣 violeta suave
  },
  {
    keywords: ['sandwich', 'wrap', 'panini', 'taco', 'burrito', 'quesadilla'],
    bg: '#FDF4FF', hoverBg: '#FAE8FF', border: '#E879F9', slotBg: '#FAE8FF'   // 💜 fucsia suave
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
    borderWidth: '1.5px',
  }
})

const iconSlotStyle = computed(() => {
  const colors = getColorForProduct(props.product.category, props.product.name)
  return { backgroundColor: colors.slotBg }
})
</script>
