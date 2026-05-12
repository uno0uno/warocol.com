/**
 * Composable para datos mock del sistema de Menú
 * Basado en el documento conceptual del Sistema POS
 */

export const useMenuMockData = () => {
  // ============================================================
  // INGREDIENTES (Materia Prima - Base del Sistema)
  // ============================================================

  const ingredientes = ref([
    // TIPO A: Ingredientes físicos CON inventario
    {
      id: 1,
      name: 'Queso Mozzarella',
      description: 'Queso mozzarella para pizzas',
      category: 'Lácteos',
      unit: 'kg',
      controla_inventario: true,
      costo_unitario: 20000, // $20,000 por kg
      stock_actual: 5.5, // 5.5 kg disponibles
      stock_minimo: 2,
      stock_maximo: 10,
      ubicacion: 'Refrigerador A1',
      permite_vencimiento: true,
      fecha_vencimiento: '2025-12-15'
    },
    {
      id: 2,
      name: 'Masa para Pizza',
      description: 'Masa fresca para pizza',
      category: 'Panadería',
      unit: 'kg',
      controla_inventario: true,
      costo_unitario: 10000, // $10,000 por kg
      stock_actual: 8.0,
      stock_minimo: 3,
      stock_maximo: 15,
      ubicacion: 'Refrigerador B2',
      permite_vencimiento: true,
      fecha_vencimiento: '2025-12-10'
    },
    {
      id: 3,
      name: 'Salsa de Tomate',
      description: 'Salsa de tomate casera',
      category: 'Salsas',
      unit: 'kg',
      controla_inventario: true,
      costo_unitario: 8000, // $8,000 por kg
      stock_actual: 3.2,
      stock_minimo: 1.5,
      stock_maximo: 8,
      ubicacion: 'Refrigerador A2',
      permite_vencimiento: true,
      fecha_vencimiento: '2025-12-05'
    },
    {
      id: 4,
      name: 'Orégano',
      description: 'Orégano deshidratado',
      category: 'Especias',
      unit: 'kg',
      controla_inventario: true,
      costo_unitario: 30000, // $30,000 por kg
      stock_actual: 0.5,
      stock_minimo: 0.2,
      stock_maximo: 2,
      ubicacion: 'Despensa C1',
      permite_vencimiento: false
    },
    {
      id: 5,
      name: 'Tocineta',
      description: 'Tocineta ahumada',
      category: 'Carnes',
      unit: 'kg',
      controla_inventario: true,
      costo_unitario: 35000, // $35,000 por kg
      stock_actual: 2.0,
      stock_minimo: 1,
      stock_maximo: 5,
      ubicacion: 'Refrigerador A1',
      permite_vencimiento: true,
      fecha_vencimiento: '2025-12-20'
    },
    {
      id: 6,
      name: 'Champiñones',
      description: 'Champiñones frescos',
      category: 'Vegetales',
      unit: 'kg',
      controla_inventario: true,
      costo_unitario: 15000, // $15,000 por kg
      stock_actual: 1.8,
      stock_minimo: 0.5,
      stock_maximo: 3,
      ubicacion: 'Refrigerador B1',
      permite_vencimiento: true,
      fecha_vencimiento: '2025-12-08'
    },

    // TIPO B: Ingredientes físicos SIN inventario
    {
      id: 7,
      name: 'Caja para Pizza',
      description: 'Caja biodegradable para pizza',
      category: 'Empaques',
      unit: 'unidad',
      controla_inventario: false, // No se controla stock
      costo_unitario: 500, // $500 por caja
      stock_actual: null,
      stock_minimo: null,
      stock_maximo: null,
      ubicacion: null,
      permite_vencimiento: false
    },
    {
      id: 8,
      name: 'Costo Energía Pizza',
      description: 'Costo estimado de energía por pizza',
      category: 'Servicios',
      unit: 'unidad',
      controla_inventario: false,
      costo_unitario: 300, // $300 por pizza
      stock_actual: null,
      stock_minimo: null,
      stock_maximo: null,
      ubicacion: null,
      permite_vencimiento: false
    },
    {
      id: 9,
      name: 'Pepperoni',
      description: 'Pepperoni en rodajas',
      category: 'Carnes',
      unit: 'kg',
      controla_inventario: true,
      costo_unitario: 40000, // $40,000 por kg
      stock_actual: 3.5,
      stock_minimo: 1,
      stock_maximo: 6,
      ubicacion: 'Refrigerador A1',
      permite_vencimiento: true,
      fecha_vencimiento: '2025-12-18'
    },
    {
      id: 10,
      name: 'Carne Molida',
      description: 'Carne molida de res',
      category: 'Carnes',
      unit: 'kg',
      controla_inventario: true,
      costo_unitario: 25000, // $25,000 por kg
      stock_actual: 4.0,
      stock_minimo: 2,
      stock_maximo: 8,
      ubicacion: 'Refrigerador A2',
      permite_vencimiento: true,
      fecha_vencimiento: '2025-12-12'
    },
    {
      id: 11,
      name: 'Pan de Hamburguesa',
      description: 'Pan fresco para hamburguesa',
      category: 'Panadería',
      unit: 'unidad',
      controla_inventario: true,
      costo_unitario: 1000, // $1,000 por unidad
      stock_actual: 50,
      stock_minimo: 20,
      stock_maximo: 100,
      ubicacion: 'Despensa B1',
      permite_vencimiento: true,
      fecha_vencimiento: '2025-12-03'
    },
    {
      id: 12,
      name: 'Lechuga',
      description: 'Lechuga fresca',
      category: 'Vegetales',
      unit: 'kg',
      controla_inventario: true,
      costo_unitario: 5000, // $5,000 por kg
      stock_actual: 2.5,
      stock_minimo: 1,
      stock_maximo: 5,
      ubicacion: 'Refrigerador B1',
      permite_vencimiento: true,
      fecha_vencimiento: '2025-12-06'
    },
    {
      id: 13,
      name: 'Tomate',
      description: 'Tomate fresco',
      category: 'Vegetales',
      unit: 'kg',
      controla_inventario: true,
      costo_unitario: 4000, // $4,000 por kg
      stock_actual: 3.0,
      stock_minimo: 1,
      stock_maximo: 6,
      ubicacion: 'Refrigerador B1',
      permite_vencimiento: true,
      fecha_vencimiento: '2025-12-07'
    },
    {
      id: 14,
      name: 'Papas',
      description: 'Papas para fritar',
      category: 'Vegetales',
      unit: 'kg',
      controla_inventario: true,
      costo_unitario: 3000, // $3,000 por kg
      stock_actual: 10.0,
      stock_minimo: 5,
      stock_maximo: 20,
      ubicacion: 'Despensa A1',
      permite_vencimiento: false
    },
    {
      id: 15,
      name: 'Aceite Vegetal',
      description: 'Aceite para freír',
      category: 'Aceites',
      unit: 'litro',
      controla_inventario: true,
      costo_unitario: 8000, // $8,000 por litro
      stock_actual: 5.0,
      stock_minimo: 2,
      stock_maximo: 10,
      ubicacion: 'Despensa A2',
      permite_vencimiento: false
    }
  ])

  // ============================================================
  // PRODUCTOS (Catálogo Vendible)
  // ============================================================

  const productos = ref([
    {
      id: 1,
      name: 'Pizza Margarita',
      description: 'Pizza clásica con queso mozzarella, salsa de tomate y orégano',
      category: 'Pizzas',
      precio_venta: 25000,
      costo_calculado: 7250, // Calculado desde receta
      margen_porcentaje: 245, // ((25000-7250)/7250)*100
      controla_stock: true,
      is_available: true,
      is_combo: false,
      allow_modifiers: true,
      tiempo_preparacion: 15, // minutos
      image: '/images/pizza-margarita.jpg'
    },
    {
      id: 2,
      name: 'Pizza Pepperoni',
      description: 'Pizza con pepperoni, queso mozzarella y salsa de tomate',
      category: 'Pizzas',
      precio_venta: 30000,
      costo_calculado: 10300,
      margen_porcentaje: 191,
      controla_stock: true,
      is_available: true,
      is_combo: false,
      allow_modifiers: true,
      tiempo_preparacion: 15,
      image: '/images/pizza-pepperoni.jpg'
    },
    {
      id: 3,
      name: 'Pizza Vegetariana',
      description: 'Pizza con champiñones, tomate, orégano y queso',
      category: 'Pizzas',
      precio_venta: 28000,
      costo_calculado: 8950,
      margen_porcentaje: 213,
      controla_stock: true,
      is_available: true,
      is_combo: false,
      allow_modifiers: true,
      tiempo_preparacion: 15,
      image: '/images/pizza-vegetariana.jpg'
    },
    {
      id: 4,
      name: 'Hamburguesa Clásica',
      description: 'Hamburguesa con carne, queso, lechuga y tomate',
      category: 'Hamburguesas',
      precio_venta: 18000,
      costo_calculado: 7100,
      margen_porcentaje: 154,
      controla_stock: true,
      is_available: true,
      is_combo: false,
      allow_modifiers: true,
      tiempo_preparacion: 10,
      image: '/images/hamburguesa-clasica.jpg'
    },
    {
      id: 5,
      name: 'Hamburguesa con Tocineta',
      description: 'Hamburguesa con carne, tocineta, queso, lechuga y tomate',
      category: 'Hamburguesas',
      precio_venta: 22000,
      costo_calculado: 9850,
      margen_porcentaje: 123,
      controla_stock: true,
      is_available: true,
      is_combo: false,
      allow_modifiers: true,
      tiempo_preparacion: 12,
      image: '/images/hamburguesa-tocineta.jpg'
    },
    {
      id: 6,
      name: 'Papas Fritas',
      description: 'Porción de papas fritas crujientes',
      category: 'Acompañamientos',
      precio_venta: 8000,
      costo_calculado: 2400,
      margen_porcentaje: 233,
      controla_stock: true,
      is_available: true,
      is_combo: false,
      allow_modifiers: false,
      tiempo_preparacion: 8,
      image: '/images/papas-fritas.jpg'
    }
  ])

  // ============================================================
  // RECETAS (Composición de Productos)
  // ============================================================

  const recetas = ref([
    // Receta: Pizza Margarita
    {
      id: 1,
      producto_id: 1,
      producto_name: 'Pizza Margarita',
      ingredientes: [
        {
          ingrediente_id: 2,
          ingrediente_name: 'Masa para Pizza',
          cantidad: 0.25, // 250g
          unidad: 'kg',
          costo_unitario: 10000,
          costo_total: 2500,
          controla_inventario: true
        },
        {
          ingrediente_id: 1,
          ingrediente_name: 'Queso Mozzarella',
          cantidad: 0.15, // 150g
          unidad: 'kg',
          costo_unitario: 20000,
          costo_total: 3000,
          controla_inventario: true
        },
        {
          ingrediente_id: 3,
          ingrediente_name: 'Salsa de Tomate',
          cantidad: 0.1, // 100g
          unidad: 'kg',
          costo_unitario: 8000,
          costo_total: 800,
          controla_inventario: true
        },
        {
          ingrediente_id: 4,
          ingrediente_name: 'Orégano',
          cantidad: 0.005, // 5g
          unidad: 'kg',
          costo_unitario: 30000,
          costo_total: 150,
          controla_inventario: true
        },
        {
          ingrediente_id: 7,
          ingrediente_name: 'Caja para Pizza',
          cantidad: 1,
          unidad: 'unidad',
          costo_unitario: 500,
          costo_total: 500,
          controla_inventario: false
        },
        {
          ingrediente_id: 8,
          ingrediente_name: 'Costo Energía Pizza',
          cantidad: 1,
          unidad: 'unidad',
          costo_unitario: 300,
          costo_total: 300,
          controla_inventario: false
        }
      ],
      costo_total: 7250,
      rendimiento: 1 // 1 pizza
    },
    // Receta: Pizza Pepperoni
    {
      id: 2,
      producto_id: 2,
      producto_name: 'Pizza Pepperoni',
      ingredientes: [
        {
          ingrediente_id: 2,
          ingrediente_name: 'Masa para Pizza',
          cantidad: 0.25,
          unidad: 'kg',
          costo_unitario: 10000,
          costo_total: 2500,
          controla_inventario: true
        },
        {
          ingrediente_id: 1,
          ingrediente_name: 'Queso Mozzarella',
          cantidad: 0.15,
          unidad: 'kg',
          costo_unitario: 20000,
          costo_total: 3000,
          controla_inventario: true
        },
        {
          ingrediente_id: 3,
          ingrediente_name: 'Salsa de Tomate',
          cantidad: 0.1,
          unidad: 'kg',
          costo_unitario: 8000,
          costo_total: 800,
          controla_inventario: true
        },
        {
          ingrediente_id: 9,
          ingrediente_name: 'Pepperoni',
          cantidad: 0.08, // 80g
          unidad: 'kg',
          costo_unitario: 40000,
          costo_total: 3200,
          controla_inventario: true
        },
        {
          ingrediente_id: 4,
          ingrediente_name: 'Orégano',
          cantidad: 0.005,
          unidad: 'kg',
          costo_unitario: 30000,
          costo_total: 150,
          controla_inventario: true
        },
        {
          ingrediente_id: 7,
          ingrediente_name: 'Caja para Pizza',
          cantidad: 1,
          unidad: 'unidad',
          costo_unitario: 500,
          costo_total: 500,
          controla_inventario: false
        },
        {
          ingrediente_id: 8,
          ingrediente_name: 'Costo Energía Pizza',
          cantidad: 1,
          unidad: 'unidad',
          costo_unitario: 300,
          costo_total: 300,
          controla_inventario: false
        }
      ],
      costo_total: 10450,
      rendimiento: 1
    },
    // Receta: Pizza Vegetariana
    {
      id: 3,
      producto_id: 3,
      producto_name: 'Pizza Vegetariana',
      ingredientes: [
        {
          ingrediente_id: 2,
          ingrediente_name: 'Masa para Pizza',
          cantidad: 0.25,
          unidad: 'kg',
          costo_unitario: 10000,
          costo_total: 2500,
          controla_inventario: true
        },
        {
          ingrediente_id: 1,
          ingrediente_name: 'Queso Mozzarella',
          cantidad: 0.15,
          unidad: 'kg',
          costo_unitario: 20000,
          costo_total: 3000,
          controla_inventario: true
        },
        {
          ingrediente_id: 3,
          ingrediente_name: 'Salsa de Tomate',
          cantidad: 0.1,
          unidad: 'kg',
          costo_unitario: 8000,
          costo_total: 800,
          controla_inventario: true
        },
        {
          ingrediente_id: 6,
          ingrediente_name: 'Champiñones',
          cantidad: 0.1, // 100g
          unidad: 'kg',
          costo_unitario: 15000,
          costo_total: 1500,
          controla_inventario: true
        },
        {
          ingrediente_id: 13,
          ingrediente_name: 'Tomate',
          cantidad: 0.05, // 50g
          unidad: 'kg',
          costo_unitario: 4000,
          costo_total: 200,
          controla_inventario: true
        },
        {
          ingrediente_id: 4,
          ingrediente_name: 'Orégano',
          cantidad: 0.005,
          unidad: 'kg',
          costo_unitario: 30000,
          costo_total: 150,
          controla_inventario: true
        },
        {
          ingrediente_id: 7,
          ingrediente_name: 'Caja para Pizza',
          cantidad: 1,
          unidad: 'unidad',
          costo_unitario: 500,
          costo_total: 500,
          controla_inventario: false
        },
        {
          ingrediente_id: 8,
          ingrediente_name: 'Costo Energía Pizza',
          cantidad: 1,
          unidad: 'unidad',
          costo_unitario: 300,
          costo_total: 300,
          controla_inventario: false
        }
      ],
      costo_total: 8950,
      rendimiento: 1
    },
    // Receta: Hamburguesa Clásica
    {
      id: 4,
      producto_id: 4,
      producto_name: 'Hamburguesa Clásica',
      ingredientes: [
        {
          ingrediente_id: 11,
          ingrediente_name: 'Pan de Hamburguesa',
          cantidad: 1,
          unidad: 'unidad',
          costo_unitario: 1000,
          costo_total: 1000,
          controla_inventario: true
        },
        {
          ingrediente_id: 10,
          ingrediente_name: 'Carne Molida',
          cantidad: 0.15, // 150g
          unidad: 'kg',
          costo_unitario: 25000,
          costo_total: 3750,
          controla_inventario: true
        },
        {
          ingrediente_id: 1,
          ingrediente_name: 'Queso Mozzarella',
          cantidad: 0.03, // 30g
          unidad: 'kg',
          costo_unitario: 20000,
          costo_total: 600,
          controla_inventario: true
        },
        {
          ingrediente_id: 12,
          ingrediente_name: 'Lechuga',
          cantidad: 0.02, // 20g
          unidad: 'kg',
          costo_unitario: 5000,
          costo_total: 100,
          controla_inventario: true
        },
        {
          ingrediente_id: 13,
          ingrediente_name: 'Tomate',
          cantidad: 0.03, // 30g
          unidad: 'kg',
          costo_unitario: 4000,
          costo_total: 120,
          controla_inventario: true
        },
        {
          ingrediente_id: 8,
          ingrediente_name: 'Costo Energía Pizza',
          cantidad: 1,
          unidad: 'unidad',
          costo_unitario: 300,
          costo_total: 300,
          controla_inventario: false
        }
      ],
      costo_total: 5870,
      rendimiento: 1
    },
    // Receta: Hamburguesa con Tocineta
    {
      id: 5,
      producto_id: 5,
      producto_name: 'Hamburguesa con Tocineta',
      ingredientes: [
        {
          ingrediente_id: 11,
          ingrediente_name: 'Pan de Hamburguesa',
          cantidad: 1,
          unidad: 'unidad',
          costo_unitario: 1000,
          costo_total: 1000,
          controla_inventario: true
        },
        {
          ingrediente_id: 10,
          ingrediente_name: 'Carne Molida',
          cantidad: 0.15,
          unidad: 'kg',
          costo_unitario: 25000,
          costo_total: 3750,
          controla_inventario: true
        },
        {
          ingrediente_id: 5,
          ingrediente_name: 'Tocineta',
          cantidad: 0.05, // 50g
          unidad: 'kg',
          costo_unitario: 35000,
          costo_total: 1750,
          controla_inventario: true
        },
        {
          ingrediente_id: 1,
          ingrediente_name: 'Queso Mozzarella',
          cantidad: 0.03,
          unidad: 'kg',
          costo_unitario: 20000,
          costo_total: 600,
          controla_inventario: true
        },
        {
          ingrediente_id: 12,
          ingrediente_name: 'Lechuga',
          cantidad: 0.02,
          unidad: 'kg',
          costo_unitario: 5000,
          costo_total: 100,
          controla_inventario: true
        },
        {
          ingrediente_id: 13,
          ingrediente_name: 'Tomate',
          cantidad: 0.03,
          unidad: 'kg',
          costo_unitario: 4000,
          costo_total: 120,
          controla_inventario: true
        },
        {
          ingrediente_id: 8,
          ingrediente_name: 'Costo Energía Pizza',
          cantidad: 1,
          unidad: 'unidad',
          costo_unitario: 300,
          costo_total: 300,
          controla_inventario: false
        }
      ],
      costo_total: 7620,
      rendimiento: 1
    },
    // Receta: Papas Fritas
    {
      id: 6,
      producto_id: 6,
      producto_name: 'Papas Fritas',
      ingredientes: [
        {
          ingrediente_id: 14,
          ingrediente_name: 'Papas',
          cantidad: 0.2, // 200g
          unidad: 'kg',
          costo_unitario: 3000,
          costo_total: 600,
          controla_inventario: true
        },
        {
          ingrediente_id: 15,
          ingrediente_name: 'Aceite Vegetal',
          cantidad: 0.15, // 150ml
          unidad: 'litro',
          costo_unitario: 8000,
          costo_total: 1200,
          controla_inventario: true
        },
        {
          ingrediente_id: 8,
          ingrediente_name: 'Costo Energía Pizza',
          cantidad: 1,
          unidad: 'unidad',
          costo_unitario: 300,
          costo_total: 300,
          controla_inventario: false
        }
      ],
      costo_total: 2100,
      rendimiento: 1
    }
  ])

  // ============================================================
  // MODIFICADORES (Personalización)
  // ============================================================

  const gruposModificadores = ref([
    {
      id: 1,
      name: 'Tamaño',
      producto_id: 1, // Pizza Margarita
      producto_name: 'Pizza Margarita',
      min_seleccion: 1,
      max_seleccion: 1,
      es_obligatorio: true,
      orden: 1
    },
    {
      id: 2,
      name: 'Extras para Pizza',
      producto_id: 1,
      producto_name: 'Pizza Margarita',
      min_seleccion: 0,
      max_seleccion: 5,
      es_obligatorio: false,
      orden: 2
    },
    {
      id: 3,
      name: 'Tamaño',
      producto_id: 2, // Pizza Pepperoni
      producto_name: 'Pizza Pepperoni',
      min_seleccion: 1,
      max_seleccion: 1,
      es_obligatorio: true,
      orden: 1
    },
    {
      id: 4,
      name: 'Extras para Pizza',
      producto_id: 2,
      producto_name: 'Pizza Pepperoni',
      min_seleccion: 0,
      max_seleccion: 5,
      es_obligatorio: false,
      orden: 2
    },
    {
      id: 5,
      name: 'Extras para Hamburguesa',
      producto_id: 4, // Hamburguesa Clásica
      producto_name: 'Hamburguesa Clásica',
      min_seleccion: 0,
      max_seleccion: 3,
      es_obligatorio: false,
      orden: 1
    },
    {
      id: 6,
      name: 'Quitar Ingredientes',
      producto_id: 4,
      producto_name: 'Hamburguesa Clásica',
      min_seleccion: 0,
      max_seleccion: 10,
      es_obligatorio: false,
      orden: 2
    }
  ])

  const modificadores = ref([
    // Grupo: Tamaño (Pizza Margarita)
    {
      id: 1,
      grupo_id: 1,
      grupo_name: 'Tamaño',
      name: 'Personal (8")',
      precio_adicional: -5000, // Descuento
      max_cantidad: 1,
      es_predeterminado: false,
      esta_disponible: true,
      tiene_receta: true
    },
    {
      id: 2,
      grupo_id: 1,
      grupo_name: 'Tamaño',
      name: 'Mediana (12")',
      precio_adicional: 0,
      max_cantidad: 1,
      es_predeterminado: true,
      esta_disponible: true,
      tiene_receta: false // Usa la receta base
    },
    {
      id: 3,
      grupo_id: 1,
      grupo_name: 'Tamaño',
      name: 'Grande (16")',
      precio_adicional: 8000,
      max_cantidad: 1,
      es_predeterminado: false,
      esta_disponible: true,
      tiene_receta: true
    },

    // Grupo: Extras para Pizza (Pizza Margarita)
    {
      id: 4,
      grupo_id: 2,
      grupo_name: 'Extras para Pizza',
      name: 'Queso Extra',
      precio_adicional: 3000,
      max_cantidad: 3,
      es_predeterminado: false,
      esta_disponible: true,
      tiene_receta: true
    },
    {
      id: 5,
      grupo_id: 2,
      grupo_name: 'Extras para Pizza',
      name: 'Champiñones',
      precio_adicional: 2500,
      max_cantidad: 2,
      es_predeterminado: false,
      esta_disponible: true,
      tiene_receta: true
    },
    {
      id: 6,
      grupo_id: 2,
      grupo_name: 'Extras para Pizza',
      name: 'Pepperoni',
      precio_adicional: 4000,
      max_cantidad: 2,
      es_predeterminado: false,
      esta_disponible: true,
      tiene_receta: true
    },
    {
      id: 7,
      grupo_id: 2,
      grupo_name: 'Extras para Pizza',
      name: 'Tocineta',
      precio_adicional: 4500,
      max_cantidad: 2,
      es_predeterminado: false,
      esta_disponible: true,
      tiene_receta: true
    },

    // Grupo: Extras para Hamburguesa
    {
      id: 8,
      grupo_id: 5,
      grupo_name: 'Extras para Hamburguesa',
      name: 'Tocineta Extra',
      precio_adicional: 3000,
      max_cantidad: 2,
      es_predeterminado: false,
      esta_disponible: true,
      tiene_receta: true
    },
    {
      id: 9,
      grupo_id: 5,
      grupo_name: 'Extras para Hamburguesa',
      name: 'Queso Extra',
      precio_adicional: 2000,
      max_cantidad: 2,
      es_predeterminado: false,
      esta_disponible: true,
      tiene_receta: true
    },

    // Grupo: Quitar Ingredientes
    {
      id: 10,
      grupo_id: 6,
      grupo_name: 'Quitar Ingredientes',
      name: 'Sin Lechuga',
      precio_adicional: 0,
      max_cantidad: 1,
      es_predeterminado: false,
      esta_disponible: true,
      tiene_receta: false
    },
    {
      id: 11,
      grupo_id: 6,
      grupo_name: 'Quitar Ingredientes',
      name: 'Sin Tomate',
      precio_adicional: 0,
      max_cantidad: 1,
      es_predeterminado: false,
      esta_disponible: true,
      tiene_receta: false
    }
  ])

  // Recetas de modificadores (ingredientes adicionales)
  const recetasModificadores = ref([
    // Modificador: Queso Extra
    {
      modificador_id: 4,
      modificador_name: 'Queso Extra',
      ingredientes: [
        {
          ingrediente_id: 1,
          ingrediente_name: 'Queso Mozzarella',
          cantidad: 0.05, // 50g extra
          unidad: 'kg',
          costo_unitario: 20000,
          costo_total: 1000,
          controla_inventario: true
        }
      ],
      costo_total: 1000
    },
    // Modificador: Champiñones
    {
      modificador_id: 5,
      modificador_name: 'Champiñones',
      ingredientes: [
        {
          ingrediente_id: 6,
          ingrediente_name: 'Champiñones',
          cantidad: 0.05, // 50g
          unidad: 'kg',
          costo_unitario: 15000,
          costo_total: 750,
          controla_inventario: true
        }
      ],
      costo_total: 750
    },
    // Modificador: Pepperoni
    {
      modificador_id: 6,
      modificador_name: 'Pepperoni',
      ingredientes: [
        {
          ingrediente_id: 9,
          ingrediente_name: 'Pepperoni',
          cantidad: 0.05, // 50g
          unidad: 'kg',
          costo_unitario: 40000,
          costo_total: 2000,
          controla_inventario: true
        }
      ],
      costo_total: 2000
    },
    // Modificador: Tocineta
    {
      modificador_id: 7,
      modificador_name: 'Tocineta',
      ingredientes: [
        {
          ingrediente_id: 5,
          ingrediente_name: 'Tocineta',
          cantidad: 0.05, // 50g
          unidad: 'kg',
          costo_unitario: 35000,
          costo_total: 1750,
          controla_inventario: true
        }
      ],
      costo_total: 1750
    },
    // Modificador: Tocineta Extra (Hamburguesa)
    {
      modificador_id: 8,
      modificador_name: 'Tocineta Extra',
      ingredientes: [
        {
          ingrediente_id: 5,
          ingrediente_name: 'Tocineta',
          cantidad: 0.05,
          unidad: 'kg',
          costo_unitario: 35000,
          costo_total: 1750,
          controla_inventario: true
        }
      ],
      costo_total: 1750
    },
    // Modificador: Queso Extra (Hamburguesa)
    {
      modificador_id: 9,
      modificador_name: 'Queso Extra',
      ingredientes: [
        {
          ingrediente_id: 1,
          ingrediente_name: 'Queso Mozzarella',
          cantidad: 0.03,
          unidad: 'kg',
          costo_unitario: 20000,
          costo_total: 600,
          controla_inventario: true
        }
      ],
      costo_total: 600
    }
  ])

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  const getRecetaByProducto = (productoId: number) => {
    return recetas.value.find(r => r.producto_id === productoId)
  }

  const getGruposModificadoresByProducto = (productoId: number) => {
    return gruposModificadores.value.filter(g => g.producto_id === productoId)
  }

  const getModificadoresByGrupo = (grupoId: number) => {
    return modificadores.value.filter(m => m.grupo_id === grupoId)
  }

  const getRecetaModificador = (modificadorId: number) => {
    return recetasModificadores.value.find(rm => rm.modificador_id === modificadorId)
  }

  const calcularDisponibilidadProducto = (productoId: number) => {
    const receta = getRecetaByProducto(productoId)
    if (!receta) return 0

    // Solo considerar ingredientes con control de inventario
    const ingredientesConInventario = receta.ingredientes.filter(
      ing => ing.controla_inventario
    )

    if (ingredientesConInventario.length === 0) {
      return 999 // Sin límite si no hay ingredientes con inventario
    }

    // Calcular cuántas unidades se pueden hacer con cada ingrediente
    const disponibilidades = ingredientesConInventario.map(ing => {
      const ingrediente = ingredientes.value.find(i => i.id === ing.ingrediente_id)
      if (!ingrediente || !ingrediente.stock_actual) return 0
      return Math.floor(ingrediente.stock_actual / ing.cantidad)
    })

    // El mínimo es el limitante
    return Math.min(...disponibilidades)
  }

  return {
    // Data
    ingredientes,
    productos,
    recetas,
    gruposModificadores,
    modificadores,
    recetasModificadores,

    // Helper functions
    getRecetaByProducto,
    getGruposModificadoresByProducto,
    getModificadoresByGrupo,
    getRecetaModificador,
    calcularDisponibilidadProducto
  }
}
