<template>
  <div class="bg-surface rounded-xl shadow-md hover:shadow-lg transition-shadow border border-border h-full">
    <div class="p-5 h-full">
      <!-- Main Content with Dashed Border -->
      <div class="border-2 border-dashed border-border rounded-lg p-5 h-full flex flex-col">
        <!-- Header -->
        <div class="mb-2">
          <h3 class="text-[17px] font-semibold text-text-primary mb-1">{{ ingredient.name }}</h3>
          <p class="text-sm font-normal text-text-primary opacity-50">{{ ingredient.category || 'Sin categoría' }}</p>
        </div>

        <!-- Price Info -->
        <div class="flex items-end justify-between pt-3 mt-4 border-t border-border">
          <div>
            <p class="text-[13px] font-medium text-text-primary opacity-70 mb-1.5">Precio</p>
            <p class="text-[34px] font-bold text-text-primary leading-none">${{ formatPrice(ingredient.price) }}</p>
          </div>
          <div class="text-right">
            <p class="text-[13px] font-medium text-text-primary opacity-70 mb-1.5">Unidad</p>
            <p class="text-sm font-medium text-text-primary opacity-65">{{ ingredient.unit || 'N/A' }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Ingredient {
  id: string
  name: string
  category?: string
  price: number
  unit?: string
}

interface Props {
  ingredient: Ingredient
}

const props = defineProps<Props>()

const formatPrice = (value: number): string => {
  return (value || 0).toLocaleString()
}
</script>
