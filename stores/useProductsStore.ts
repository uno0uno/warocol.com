import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Interfaz para ingredientes dentro de una receta
export interface RecipeIngredient {
  id: string
  name: string
  quantity: number
  unit: string // kg, g, l, ml, unidades, etc.
  cost_per_unit: number // Costo por unidad de medida
  controla_inventario: boolean
}

// Interfaz para un producto
export interface Product {
  id: string
  name: string
  description: string
  price: number
  costo_calculado: number // Calculado automáticamente desde ingredientes
  controla_stock: boolean
  is_available: boolean
  is_combo: boolean
  category: string
  preparation_time: number // minutos
  image?: string
  ingredients: RecipeIngredient[] // Receta embebida (Opción A simplificada)
}

const STORAGE_KEY = 'products-store'

export const useProductsStore = defineStore('products', () => {
  // State - Inicializar desde sessionStorage o usar datos mock
  const products = ref<Product[]>(loadFromStorage())

  // Getters
  const allProducts = computed(() => products.value)

  const availableProducts = computed(() =>
    products.value.filter(p => p.is_available)
  )

  const productsByCategory = computed(() => {
    const grouped: Record<string, Product[]> = {}
    products.value.forEach(product => {
      if (!grouped[product.category]) {
        grouped[product.category] = []
      }
      grouped[product.category].push(product)
    })
    return grouped
  })

  const categories = computed(() => {
    const cats = new Set(products.value.map(p => p.category))
    return Array.from(cats)
  })

  // Actions
  const addProduct = (product: Omit<Product, 'id' | 'costo_calculado'>) => {
    const newProduct: Product = {
      ...product,
      id: generateId(),
      costo_calculado: calculateCost(product.ingredients)
    }

    products.value.push(newProduct)
    saveToStorage()

    return newProduct
  }

  const updateProduct = (id: string, updates: Partial<Omit<Product, 'id'>>) => {
    const index = products.value.findIndex(p => p.id === id)

    if (index !== -1) {
      const updated = { ...products.value[index], ...updates }

      // Recalcular costo si se actualizaron ingredientes
      if (updates.ingredients) {
        updated.costo_calculado = calculateCost(updates.ingredients)
      }

      products.value[index] = updated
      saveToStorage()

      return updated
    }

    return null
  }

  const deleteProduct = (id: string) => {
    const index = products.value.findIndex(p => p.id === id)

    if (index !== -1) {
      products.value.splice(index, 1)
      saveToStorage()
      return true
    }

    return false
  }

  const getProduct = (id: string): Product | undefined => {
    return products.value.find(p => p.id === id)
  }

  const toggleAvailability = (id: string) => {
    const product = products.value.find(p => p.id === id)
    if (product) {
      product.is_available = !product.is_available
      saveToStorage()
    }
  }

  // Helpers
  function calculateCost(ingredients: RecipeIngredient[]): number {
    return ingredients.reduce((sum, ing) => {
      // Costo = cantidad * costo_por_unidad
      return sum + (ing.quantity * ing.cost_per_unit)
    }, 0)
  }

  function generateId(): string {
    return `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  function saveToStorage() {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(products.value))
    }
  }

  function loadFromStorage(): Product[] {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      if (stored) {
        try {
          return JSON.parse(stored)
        } catch (e) {
          console.error('Error parsing products from storage:', e)
        }
      }
    }

    // Datos mock iniciales si no hay nada en storage
    return [
      {
        id: '1',
        name: 'Hamburguesa Clásica',
        description: 'Carne 150g, lechuga, tomate, cebolla',
        price: 15000,
        costo_calculado: 8500,
        controla_stock: true,
        is_available: true,
        is_combo: false,
        category: 'Hamburguesas',
        preparation_time: 15,
        image: '🍔',
        ingredients: [
          { id: 'ing1', name: 'Carne molida', quantity: 150, unit: 'g', cost_per_unit: 30, controla_inventario: true },
          { id: 'ing2', name: 'Pan hamburguesa', quantity: 1, unit: 'unidad', cost_per_unit: 1500, controla_inventario: true },
          { id: 'ing3', name: 'Lechuga', quantity: 20, unit: 'g', cost_per_unit: 5, controla_inventario: true },
          { id: 'ing4', name: 'Tomate', quantity: 30, unit: 'g', cost_per_unit: 4, controla_inventario: true },
          { id: 'ing5', name: 'Empaque', quantity: 1, unit: 'unidad', cost_per_unit: 500, controla_inventario: false }
        ]
      },
      {
        id: '2',
        name: 'Pizza Margherita',
        description: 'Salsa de tomate, mozzarella, albahaca',
        price: 25000,
        costo_calculado: 12000,
        controla_stock: true,
        is_available: true,
        is_combo: false,
        category: 'Pizzas',
        preparation_time: 20,
        image: '🍕',
        ingredients: [
          { id: 'ing6', name: 'Masa pizza', quantity: 250, unit: 'g', cost_per_unit: 10, controla_inventario: true },
          { id: 'ing7', name: 'Queso mozzarella', quantity: 150, unit: 'g', cost_per_unit: 20, controla_inventario: true },
          { id: 'ing8', name: 'Salsa tomate', quantity: 100, unit: 'g', cost_per_unit: 8, controla_inventario: true },
          { id: 'ing9', name: 'Albahaca', quantity: 5, unit: 'g', cost_per_unit: 50, controla_inventario: true },
          { id: 'ing10', name: 'Caja pizza', quantity: 1, unit: 'unidad', cost_per_unit: 500, controla_inventario: false }
        ]
      },
      {
        id: '3',
        name: 'Limonada Natural',
        description: 'Limón, agua, azúcar',
        price: 5000,
        costo_calculado: 1500,
        controla_stock: false,
        is_available: true,
        is_combo: false,
        category: 'Bebidas',
        preparation_time: 5,
        image: '🍹',
        ingredients: [
          { id: 'ing11', name: 'Limón', quantity: 2, unit: 'unidades', cost_per_unit: 300, controla_inventario: true },
          { id: 'ing12', name: 'Azúcar', quantity: 30, unit: 'g', cost_per_unit: 3, controla_inventario: true },
          { id: 'ing13', name: 'Agua', quantity: 300, unit: 'ml', cost_per_unit: 1, controla_inventario: false },
          { id: 'ing14', name: 'Vaso desechable', quantity: 1, unit: 'unidad', cost_per_unit: 200, controla_inventario: false }
        ]
      },
      {
        id: '4',
        name: 'Combo Hamburguesa + Bebida',
        description: 'Hamburguesa clásica + bebida a elección',
        price: 18000,
        costo_calculado: 10000,
        controla_stock: true,
        is_available: true,
        is_combo: true,
        category: 'Combos',
        preparation_time: 15,
        image: '🎁',
        ingredients: [] // Los combos pueden tener receta compuesta
      }
    ]
  }

  return {
    // State
    products,

    // Getters
    allProducts,
    availableProducts,
    productsByCategory,
    categories,

    // Actions
    addProduct,
    updateProduct,
    deleteProduct,
    getProduct,
    toggleAvailability
  }
})
