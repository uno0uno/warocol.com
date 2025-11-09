# Plan de Investigación: Componentes Reutilizables Financieros
**Fecha**: 2025-01-08  
**Gobernanza**: Siguiendo /context/ui/governance-rules.md y design-guidelines.md

## Objetivo de Investigación

Analizar los patrones existentes en las páginas financieras (`/pages/financiero/`) para crear una biblioteca de componentes reutilizables que:
- Cumplan estrictamente con el sistema de design tokens
- Reduzcan duplicación de código
- Aceleren desarrollo de nuevas funcionalidades financieras
- Mantengan consistencia visual y de UX

## Análisis de Patrones Identificados

### 1. **MetricCard Pattern** - Prioridad Crítica
**Instancias encontradas**: 7 repeticiones
**Archivos**: `tir.vue` (líneas 24-67), `analisis.vue` (líneas 24-55)
**Violaciones actuales de gobernanza**:
- ❌ Uso directo de `border-crocus-500` (debería usar `--primary` o `--accent`)
- ❌ Colores hardcoded: `text-crocus-600`, `text-ebony-800`
- ❌ No respeta jerarquía de tokens semánticos

**Diseño propuesto conforme a gobernanza**:
```vue
<!-- ✅ Correcto según governance-rules.md -->
<MetricCard
  :value="tirData.actual" 
  title="TIR Actual"
  subtitle="Anualizado desde inicio"
  variant="primary"  <!-- Usa --primary token -->
  format="percentage"
/>
```

### 2. **DataTable Pattern** - Prioridad Alta
**Instancias**: 2 tablas complejas con sorting
**Violaciones actuales**:
- ❌ Uso de `hover:bg-gray-200` (arbitrario, no token)
- ❌ `text-green-600`, `text-red-600` (hardcoded)
- ❌ No usa `--success`/`--destructive` tokens

**Diseño conforme**:
```vue
<!-- ✅ Usando tokens semánticos -->
<FinancialTable 
  :columns="columns"
  :data="data"
  hover-variant="surface-secondary"  <!-- --surface-secondary -->
  success-color="success"            <!-- --success -->
  destructive-color="destructive"    <!-- --destructive -->
/>
```

### 3. **LoadingErrorWrapper** - Prioridad Media
**Estado actual**: Idéntico en ambos archivos (líneas 3-17)
**Cumplimiento**: ✅ Ya usa components existentes correctamente

### 4. **FilterBar Pattern** - Prioridad Media  
**Ubicación**: `analisis.vue` (líneas 58-102)
**Violaciones**:
- ❌ `border-titan-300` directo (debería usar `--border`)
- ❌ `bg-white` hardcoded (debería usar `--surface`)

## Investigación de Compatibilidad con Tokens

### Mapeo de Colores Actuales → Tokens Semánticos

| Uso Actual | Token Correcto | Justificación |
|------------|----------------|---------------|
| `border-crocus-500` | `--primary` o `--accent` | Elementos principales |
| `text-crocus-600` | `--primary-foreground` | Texto en elementos primarios |
| `bg-white` | `--surface` | Superficies de contenido |
| `text-ebony-800` | `--text-primary` | Texto principal |
| `text-ebony-600` | `--text-secondary` | Texto secundario |
| `border-titan-300` | `--border` | Bordes estándar |
| `hover:bg-gray-200` | `hover:bg-surface-secondary` | Estados hover |

### Análisis de Variantes Temáticas

**Tokens requeridos para componentes financieros**:
- Estado positivo: `--success` (TIR positiva, ganancias)
- Estado negativo: `--destructive` (pérdidas, TIR negativa)  
- Estado neutral: `--muted` (datos informativos)
- Elementos destacados: `--primary` (métricas principales)
- Elementos secundarios: `--secondary` (métricas de apoyo)

## Plan de Desarrollo por Fases

### Fase 1: Auditoría y Refactor Base (Semana 1)
- [ ] Auditar todos los usos de colores hardcoded en `/financiero/`
- [ ] Crear mapeo completo actual → tokens semánticos
- [ ] Refactor `MetricCard` instances para usar tokens
- [ ] Validar funcionamiento en theme light/dark

### Fase 2: Componentes Base (Semana 2)
- [ ] `MetricCard` con variantes semantic-token based
- [ ] `StatusBadge` usando `--success`/`--destructive`/`--warning`
- [ ] `CurrencyDisplay` con formato consistente
- [ ] Testing en ambos temas

### Fase 3: Componentes Complejos (Semana 3)
- [ ] `FinancialTable` con sorting y token compliance
- [ ] `FilterBar` reutilizable
- [ ] `InsightCard` pattern
- [ ] Documentación de uso

### Fase 4: Migración y Optimización (Semana 4)
- [ ] Migrar `tir.vue` a componentes nuevos
- [ ] Migrar `analisis.vue` a componentes nuevos  
- [ ] Optimizar bundle size
- [ ] Performance testing

## Criterios de Aceptación (Gobernanza)

### ✅ Obligatorios según governance-rules.md:
- [ ] **ZERO hardcoded colors** en componentes
- [ ] Uso exclusivo de semantic tokens como primera opción
- [ ] Soporte automático light/dark theme
- [ ] Hover/focus states usando opacity modifiers
- [ ] TypeScript interfaces completas
- [ ] CVA pattern para variants

### ✅ Según design-guidelines.md:
- [ ] Jerarquía de tokens respetada (semantic → role → palette)
- [ ] Accesibilidad: contrast ratios WCAG 2.1 AA
- [ ] Responsive behavior consistente
- [ ] Testing en ambos theme variants

## Métricas de Éxito

### Técnicas:
- **Reducción LOC**: Target 40% menos líneas en páginas financieras
- **Bundle size**: No incremento por componentización
- **Performance**: Mismo render time o mejor
- **Token compliance**: 100% uso de design system

### UX:
- **Consistencia visual**: Todos los metric cards idénticos
- **Theme switching**: Smooth transition sin broken states
- **Accesibilidad**: Screen reader compatibility
- **Responsive**: Mobile-first approach

## Riesgos y Mitigaciones

### Riesgo: Breaking Changes
**Mitigación**: Implementar componentes gradualmente, mantener compatibilidad

### Riesgo: Performance Impact  
**Mitigación**: Bundle analysis, tree-shaking verification

### Riesgo: Design Token Conflicts
**Mitigación**: Strict adherence to token hierarchy, design review

## Entregables

1. **Componentes Base**: MetricCard, StatusBadge, CurrencyDisplay
2. **Componentes Complejos**: FinancialTable, FilterBar, InsightCard  
3. **Documentación**: Storybook examples, usage guidelines
4. **Migración**: Páginas financieras actualizadas
5. **Testing**: Unit tests, visual regression tests, accessibility tests

## Aprobaciones Requeridas

- [ ] **Design System Lead**: Token usage patterns
- [ ] **Technical Lead**: Architecture approach  
- [ ] **QA Team**: Testing strategy
- [ ] **Accessibility Team**: WCAG compliance verification