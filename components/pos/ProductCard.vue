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
import { resolvePosProductCardColors } from '~/utils/posCategoryColor'

const { formatCurrency } = useFormatters()

interface Product {
  id: string
  name: string
  price: number
  category: string
  category_color?: string | null
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

const palette = computed(() =>
  resolvePosProductCardColors({
    categoryColor: props.product.category_color,
    category: props.product.category,
    name: props.product.name,
  }),
)

const cardStyle = computed(() => {
  const colors = palette.value
  return {
    backgroundColor: isHovered.value ? colors.hoverBg : colors.bg,
    borderColor: colors.border,
    borderWidth: '1.5px',
  }
})

const iconSlotStyle = computed(() => ({
  backgroundColor: palette.value.slotBg,
}))
</script>
