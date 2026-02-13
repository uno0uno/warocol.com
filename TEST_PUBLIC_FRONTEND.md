# Testing Frontend Público - Perfil de Restaurante

## ✅ Archivos Creados

### Store
- ✅ `stores/usePublicRestaurantStore.js` - Gestión de estado para perfil público

### Layout
- ✅ `layouts/public-restaurant.vue` - Layout limpio sin dashboard

### Components
- ✅ `components/public/RestaurantHeader.vue` - Header con banner, logo, info
- ✅ `components/public/PublicProductCard.vue` - Card de producto
- ✅ `components/public/PublicMenu.vue` - Menu con filtros por categoría

### Pages
- ✅ `pages/[tenant]/index.vue` - Página principal del restaurante público

---

## 🧪 Cómo Probar

### 1. Iniciar Backend (Terminal 1)
```bash
cd "/Users/saifer/Documents/WEBS/WARO COLOMBIA/api_warocol.com"
source venv/bin/activate  # Si usas venv
uvicorn app.main:app --reload --port 9999
```

**Verificar que el backend esté corriendo:**
```bash
curl http://localhost:9999/api/public/restaurant/waro-colombia
```

### 2. Iniciar Frontend (Terminal 2)
```bash
cd "/Users/saifer/Documents/WEBS/WARO COLOMBIA/front_nuxt"
npm run dev
# O si usas yarn:
yarn dev
```

**Puerto por defecto:** http://localhost:8080

### 3. Acceder a la Página Pública

**URL del restaurante:**
```
http://localhost:8080/waro-colombia
```

---

## 🎨 Funcionalidades Implementadas

### RestaurantHeader Component
- ✅ Banner/Hero con gradiente o imagen
- ✅ Logo del restaurante (emoji o imagen)
- ✅ Nombre y descripción
- ✅ Badge "Abierto/Cerrado" dinámico (según horarios)
- ✅ Información de contacto (teléfono, dirección, ciudad)
- ✅ Botones de redes sociales (WhatsApp, Facebook, Instagram)
- ✅ Horarios de atención expandibles
- ✅ Responsive design (mobile-first)

### PublicMenu Component
- ✅ Filtro por categorías con tabs sticky
- ✅ Contador de productos por categoría
- ✅ Grid responsive de productos
- ✅ Agrupación por categorías
- ✅ Loading states
- ✅ Empty state cuando no hay productos

### PublicProductCard Component
- ✅ Imagen o emoji del producto
- ✅ Nombre y descripción
- ✅ Precio formateado (COP)
- ✅ Badge de categoría
- ✅ Badge "No disponible" para productos inactivos
- ✅ Badge "Personalizable" si tiene modificadores
- ✅ Tiempo de preparación
- ✅ Hover effects
- ✅ Click para ver detalle (próximamente)

### Página Principal ([tenant]/index.vue)
- ✅ Loading state con spinner
- ✅ Error state (restaurante no encontrado)
- ✅ SEO: Meta tags dinámicos
- ✅ SEO: Open Graph tags
- ✅ SEO: JSON-LD Restaurant schema
- ✅ Fetch paralelo de profile + menu
- ✅ Layout público sin dashboard

### Store (usePublicRestaurantStore)
- ✅ Estado reactivo para restaurant, menu, productos
- ✅ Computed properties (isRestaurantOpen, categories, products)
- ✅ Actions: fetchRestaurantProfile, fetchMenu, fetchProductDetail
- ✅ Filtrado por categoría
- ✅ Error handling
- ✅ Loading states

---

## 📱 Vista Previa Esperada

### Desktop (1280px+)
```
+----------------------------------------------------------+
|                     BANNER / HERO                        |
|                    (imagen o emoji)                      |
+----------------------------------------------------------+
|  🍔 Logo                                                 |
|  Waro Colombia              [🟢 Abierto]                 |
|  Restaurante de comida colombiana...                    |
|  📞 +57 320... 📍 Calle 123... 🏙️ Bogotá               |
|  [WhatsApp] [Facebook] [Instagram]                       |
+----------------------------------------------------------+
|  [Todos (39)] [Hamburguesas (12)] [Bebidas (8)]...     |
+----------------------------------------------------------+
|                                                          |
|  Hamburguesas                                           |
|  +-------------+ +-------------+ +-------------+        |
|  |   🍔        | |   🍔        | |   🍔        |        |
|  | Hamburguesa | | Hamburguesa | | Hamburguesa |        |
|  | Clásica     | | Doble       | | Especial    |        |
|  | $15,000     | | $22,000     | | $18,000     |        |
|  +-------------+ +-------------+ +-------------+        |
|                                                          |
|  Bebidas                                                |
|  +-------------+ +-------------+                        |
|  |   🥤        | |   🥤        |                        |
|  | Coca Cola   | | Jugo Natural|                        |
|  | $3,000      | | $5,000      |                        |
|  +-------------+ +-------------+                        |
+----------------------------------------------------------+
|              Powered by Waro Colombia                    |
+----------------------------------------------------------+
```

### Mobile (375px)
```
+------------------+
|      BANNER      |
|     🍔 LOGO      |
+------------------+
| Waro Colombia    |
| 🟢 Abierto       |
| Descripción...   |
| 📞 +57 320...    |
| [💬] [f] [📷]   |
+------------------+
| [Todos (39)] ➡️  |
+------------------+
| Hamburguesas     |
| +----------+     |
| |   🍔     |     |
| | Clásica  |     |
| | $15,000  |     |
| +----------+     |
| +----------+     |
| |   🍔     |     |
| | Doble    |     |
| +----------+     |
+------------------+
```

---

## 🔍 Checklist de Testing

### Header
- [ ] Banner se muestra correctamente
- [ ] Logo se muestra correctamente
- [ ] Badge "Abierto/Cerrado" cambia según horarios
- [ ] Teléfono hace link a `tel:`
- [ ] WhatsApp abre con número correcto
- [ ] Facebook/Instagram abren en nueva pestaña
- [ ] Horarios se expanden/contraen al hacer click
- [ ] Responsive en mobile

### Menu
- [ ] Categorías se muestran en tabs
- [ ] Click en categoría filtra productos
- [ ] Contador de productos es correcto
- [ ] Tabs sticky funcionan al hacer scroll
- [ ] Grid responsive (1-2-3-4 columnas según breakpoint)

### Product Cards
- [ ] Imagen/emoji se muestra
- [ ] Precio formateado correctamente (COP)
- [ ] Badge "No disponible" para productos inactivos
- [ ] Badge "Personalizable" si tiene modificadores
- [ ] Hover effect funciona
- [ ] Click en card (próximamente ir a detalle)

### General
- [ ] Loading spinner se muestra al cargar
- [ ] Error page si restaurant no existe
- [ ] Meta tags SEO correctos (ver en View Source)
- [ ] JSON-LD schema correcto
- [ ] No hay errores en consola
- [ ] Performance: carga en < 3 segundos

---

## 🐛 Debugging

### Backend no responde
```bash
# Verificar que el backend esté corriendo
curl http://localhost:9999/health

# Verificar endpoint público
curl http://localhost:9999/api/public/restaurant/waro-colombia
```

### Frontend no conecta con backend
Verificar en `nuxt.config.ts`:
```js
NUXT_PUBLIC_WAROLABS_API_URL=http://localhost:9999
```

### Restaurant not found
```bash
# Verificar que el perfil esté activo
psql -h 64.23.134.78 -U saifer -d postresWaroLabs \
  -c "SELECT slug, is_active FROM tenant_public_profiles WHERE slug='waro-colombia';"
```

### No aparecen productos
```bash
# Verificar que haya productos disponibles
curl http://localhost:9999/api/public/restaurant/waro-colombia/menu
```

### Errores de consola
Abrir Developer Tools (F12) → Console tab

---

## 📊 Datos de Prueba

### Restaurante de ejemplo
- **Slug:** `waro-colombia`
- **URL:** http://localhost:8080/waro-colombia
- **Tenant ID:** `93b3e582-34fa-44a6-8d0f-bf82a3608727`

### Crear más perfiles de prueba
```sql
-- Ejecutar en psql
INSERT INTO tenant_public_profiles (
  tenant_id, slug, is_active, display_name, description,
  phone_number, email, address
) VALUES (
  '0ffc1252-0bdf-467b-83e0-916213f9f1ec', -- Armelo Perro
  'armelo-perro',
  true,
  'Armelo Perro',
  'Los mejores hot dogs de Bogotá',
  '+57 320 9999999',
  'contacto@armeloperro.com',
  'Calle 45 #12-34'
);
```

---

## 🚀 Próximas Mejoras (Fase 2)

### Funcionalidades pendientes
- [ ] Página de detalle de producto con modificadores
- [ ] Modal de personalización de producto
- [ ] Sistema de búsqueda de productos
- [ ] Filtro por precio
- [ ] Ordenamiento (A-Z, precio, popularidad)
- [ ] Compartir en redes sociales
- [ ] Mapa de ubicación (Google Maps)
- [ ] Reviews/ratings (futuro)

### Admin Panel
- [ ] Página de configuración de perfil público
- [ ] Upload de logo y banner
- [ ] Editor de horarios de atención
- [ ] Toggle activar/desactivar perfil
- [ ] Preview del perfil público

---

## 📝 Notas

### Iconos
El proyecto usa `nuxt-icon` con iconos de:
- Phosphor Icons (ph:xxx)
- Bootstrap Icons (bi:xxx)

### Estilos
- Tailwind CSS
- Design tokens en `assets/css/design-tokens.css`
- Sistema de colores personalizado

### Performance
- SSR habilitado
- Lazy loading de imágenes (próximamente)
- Cache de API calls con `useAsyncData`

### Accesibilidad
- Todos los botones tienen `aria-label`
- Contraste de colores WCAG AA
- Keyboard navigation (próximamente)
