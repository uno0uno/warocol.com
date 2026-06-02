# Warocol - Plataforma de Analítica y Gestión para Restaurantes

Democratizando la analítica de datos y la toma de decisiones para restaurantes en Colombia.

## 🎯 Misión

Warocol es una plataforma integral que permite a los propietarios de restaurantes tomar decisiones basadas en datos, gestionar eficientemente sus operaciones y crear una comunidad sólida para el crecimiento del sector gastronómico.

## 🚀 Roadmap de Desarrollo - 4 Fases (1 mes)

### Fase 1: Dashboard de Analítica y KPIs (Semana 1)
**Objetivo**: Dashboard con métricas clave para toma de decisiones

**KPIs Principales:**
- 📊 **Rentabilidad por Producto**: Análisis de margen y ganancia por ítem del menú
- 💰 **Ticket Promedio Actual**: Valor promedio de ventas por cliente
- 🔄 **ROI Proyectado**: Recuperación de inversión estimada
- 📈 **Recuperación Proyectada**: Análisis de retorno de inversión futuro

**Integraciones de Datos:**
- Conexión con sistemas POS existentes
- Integración con fuentes de datos externas (APIs de terceros)
- Importación de datos históricos
- Sincronización en tiempo real

### Fase 2: Sistema ERP con Multi-tenancy (Semana 2)
**Objetivo**: Sistema de gestión empresarial basado en organizaciones

**Arquitectura de Tenants:**
- 🏢 **Organizaciones (Tenants)**: Cada restaurante como entidad independiente
- 👥 **Gestión de Miembros**: Usuarios asociados a cada restaurante
- 🔐 **Roles y Permisos**: Sistema granular de accesos por tenant
- 📊 **Datos Aislados**: Información segmentada por organización

**Funcionalidades ERP:**
- Gestión de inventario por restaurante
- Control de ventas y operaciones
- Administración de personal
- Reportes específicos por tenant

### Fase 3: Facturación Electrónica (Semana 3)
**Objetivo**: Sistema completo de facturación conforme a normativa colombiana

**Características:**
- ⚡ **Facturación Electrónica**: Generación automática de facturas
- 🏛️ **Integración DIAN**: Cumplimiento normativo colombiano
- 💳 **Métodos de Pago**: Integración con pasarelas de pago
- 📋 **Reportes Fiscales**: Generación automática de informes contables
- 🔄 **Conciliación**: Automatización de procesos contables

### Fase 4: Comunidad y Blog (Semana 4)
**Objetivo**: Crear una comunidad tipo Indie Hackers para restauranteros

**Características de la Comunidad:**
- 📝 **Blog Colaborativo**: Artículos y experiencias compartidas
- 🤝 **Networking**: Conexiones entre propietarios de restaurantes
- 💡 **Casos de Éxito**: Historias inspiradoras del sector
- 📅 **Eventos**: Meetups y webinars para la comunidad
- 🏆 **Reconocimientos**: Sistema de reputación y logros
- 💬 **Foros**: Discusiones temáticas sobre gestión restaurantera

**Inspiración**: Modelo similar a [Indie Hackers](https://www.indiehackers.com/) adaptado al sector gastronómico

## 🎯 Público Objetivo

Propietarios y administradores de restaurantes en Colombia que buscan:
- Profesionalizar sus operaciones con datos
- Optimizar la rentabilidad de sus productos
- Cumplir con normativas fiscales colombianas
- Conectar con una comunidad de pares
- Acceder a mejores prácticas del sector

## 🛠️ Stack Tecnológico

- **Frontend**: Nuxt.js 3 + Vue.js + TypeScript
- **Styling**: Tailwind CSS
- **Backend**: API centralizada en Warolabs.com
- **Base de Datos**: PostgreSQL (vía Warolabs)
- **Autenticación**: Magic Links + JWT
- **Deployment**: Docker + AWS Amplify

## 🚀 Instalación y Desarrollo

### Prerequisitos
- Node.js 18+
- npm/pnpm/yarn
- Acceso al backend de Warolabs

### Setup

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo
npm run dev

# Build para producción
npm run build

# Preview de producción
npm run preview
```

### Variables de Entorno

```bash
# Backend API URL
NUXT_PUBLIC_API_BASE_URL=http://localhost:4000

# Configuración específica del entorno
NUXT_PUBLIC_ENVIRONMENT=development
```

## 🏗️ Arquitectura del Proyecto

### Estructura de Carpetas
```
warocol.com/
├── components/
│   ├── dashboard/          # Componentes del dashboard
│   ├── analytics/          # Componentes de analítica
│   ├── community/          # Componentes de comunidad
│   └── shared/             # Componentes compartidos
├── pages/
│   ├── dashboard/          # Páginas del dashboard
│   ├── analytics/          # Páginas de reportes
│   ├── community/          # Páginas de comunidad
│   └── auth/               # Autenticación
├── composables/            # Lógica reutilizable
├── middleware/             # Middleware de rutas
└── types/                  # Tipos TypeScript
```

### Integración con Backend
- **API Base**: Warolabs.com centraliza todos los servicios
- **Proxy**: Configurado en `nuxt.config.ts` para `/api/**`
- **Autenticación**: Gestión de sesiones vía cookies
- **Multi-tenancy**: Soporte para múltiples restaurantes

## 📊 Características Principales

### Fase 1 - Dashboard Analítico
- KPIs en tiempo real
- Conectores de datos múltiples
- Visualizaciones interactivas
- Reportes personalizables

### Fase 2 - ERP Multi-tenant
- Gestión de organizaciones
- Sistema de roles granular
- Datos aislados por tenant
- Gestión de miembros

### Fase 3 - Facturación
- Integración DIAN Colombia
- Facturación electrónica
- Reportes fiscales
- Pasarelas de pago

### Fase 4 - Comunidad
- Blog colaborativo
- Sistema de networking
- Eventos y meetups
- Gamificación

## 🔗 Enlaces Útiles

- [Documentación Nuxt 3](https://nuxt.com/docs)
- [Warolabs Backend](https://github.com/uno0uno/warolabs.com)
- [Inspiración Comunidad](https://www.indiehackers.com/)
- [Deployment](https://nuxt.com/docs/getting-started/deployment)

## License

This repository is source-available proprietary software owned by WARO Colombia
and/or its authorized owner(s). It is not open source.

You may view, clone, and run the code privately for non-commercial evaluation,
review, education, security research, or authorized contribution preparation.
Commercial use, production deployment, hosted use, redistribution, sublicensing,
white-label use, competing products, or public deployments require a separate
written commercial license from WARO Colombia.

See [`LICENSE.md`](LICENSE.md), [`NOTICE.md`](NOTICE.md), and
[`CONTRIBUTING.md`](CONTRIBUTING.md).
