<template>
  <button
    :style="cardStyle"
    class="group flex flex-col items-center p-4 md:p-5 border rounded-xl theme-transition cursor-pointer active:scale-[0.99]"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @click="$emit('select', product)"
  >
    <div class="text-4xl md:text-5xl mb-3 mt-1 select-none">{{ product.image }}</div>
    <p class="text-xs md:text-sm font-semibold text-text-primary text-center leading-snug line-clamp-2 min-h-[2.5rem] flex items-center justify-center">
      {{ product.name }}
    </p>
    <div class="w-full mt-3 pt-3 border-t border-black/20">
      <p class="text-sm md:text-base font-bold text-primary text-center">
        {{ formatCurrency(product.price) }}
      </p>
    </div>
  </button>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Product {
  id: string
  name: string
  price: number
  category: string
  image: string
  available: boolean
}

interface Props {
  product: Product
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
}

// Similarity-based: score by how many keywords appear in the text.
// Fondos en -200 (saturados visibles), hover en -300, bordes en -500 con 2px
const colorEntries: ColorEntry[] = [
  {
    keywords: ['veg', 'viggi', 'saludab', 'ensalad', 'orella', 'bowl', 'organico', 'orgánico'],
    bg: '#BBF7D0', hoverBg: '#86EFAC', border: '#16A34A'   // 🟢 verde
  },
  {
    keywords: ['bebida', 'jugo', 'agua', 'cafe', 'café', 'limon', 'cerveza', 'coctel', 'fresco', 'smoothie', 'soda', 'refresc', 'gaseosa', 'drink'],
    bg: '#BAE6FD', hoverBg: '#7DD3FC', border: '#0284C7'   // 🔵 azul cielo
  },
  {
    keywords: ['postre', 'torta', 'helado', 'dulce', 'brownie', 'galleta', 'donut', 'cake', 'tarta', 'flan', 'mousse', 'crepe', 'pastel'],
    bg: '#FBCFE8', hoverBg: '#F9A8D4', border: '#DB2777'   // 🩷 rosa
  },
  {
    keywords: ['hamburgues', 'burg', 'hot dog', 'hotdog', 'chorizo', 'chori', 'pollo', 'res', 'carne', 'chicken', 'beef', 'costilla', 'cerdo', 'lomo', 'filete', 'asado', 'bestial', 'sencill'],
    bg: '#FED7AA', hoverBg: '#FDBA74', border: '#EA580C'   // 🟠 naranja
  },
  {
    keywords: ['pizza', 'calzone'],
    bg: '#FECDD3', hoverBg: '#FDA4AF', border: '#E11D48'   // 🔴 rojo coral
  },
  {
    keywords: ['pasta', 'sopa', 'crema', 'arroz', 'fideo', 'lasaña', 'espagueti'],
    bg: '#FEF08A', hoverBg: '#FDE047', border: '#CA8A04'   // 🟡 amarillo
  },
  {
    keywords: ['papa', 'frit', 'empanada', 'snack', 'alita', 'croqueta', 'entrada'],
    bg: '#99F6E4', hoverBg: '#5EEAD4', border: '#0D9488'   // 🩵 teal
  },
  {
    keywords: ['pescado', 'marisco', 'salmon', 'salmón', 'atun', 'atún', 'camaron', 'camarón', 'langosta', 'pulpo', 'seafood'],
    bg: '#C7D2FE', hoverBg: '#A5B4FC', border: '#4338CA'   // 🔷 índigo
  },
  {
    keywords: ['desayuno', 'huevo', 'tostada', 'pancake', 'waffle', 'arepa', 'tamal', 'breakfast'],
    bg: '#FDE68A', hoverBg: '#FCD34D', border: '#D97706'   // 🟤 ámbar
  },
  {
    keywords: ['caja', 'llevar', 'empaque', 'bolsa', 'envase'],
    bg: '#DDD6FE', hoverBg: '#C4B5FD', border: '#7C3AED'   // 🟣 violeta
  },
  {
    keywords: ['sandwich', 'wrap', 'panini', 'taco', 'burrito', 'quesadilla'],
    bg: '#F5D0FE', hoverBg: '#F0ABFC', border: '#C026D3'   // 💜 fucsia
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
    border: 'hsl(var(--border))'
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

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}
</script>
