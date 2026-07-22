export interface BlogPillar {
  id: string
  label: string
}

export const BLOG_PILLARS: BlogPillar[] = [
  { id: 'software-para-restaurantes', label: 'Software & POS' },
  { id: 'como-administrar-restaurante', label: 'Operación & administración' },
  { id: 'facturacion-electronica-restaurantes', label: 'Facturación & DIAN' },
]

export const getPillarLabel = (pillarId: string | null | undefined): string | null => {
  if (!pillarId) return null
  return BLOG_PILLARS.find(p => p.id === pillarId)?.label ?? null
}
