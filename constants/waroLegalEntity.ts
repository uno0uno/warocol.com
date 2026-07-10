/**
 * Types + empty defaults for platform legal print footers.
 *
 * Source of truth is the BACKEND (env → /pos restaurant context → platform_legal).
 * Do not hardcode NIT / names / PII here.
 */

export type PlatformSoftwareLegal = {
  role_label: string
  commercial_name: string | null
  legal_name: string | null
  nit: string | null
  iva_responsibility_label: string | null
  not_issuer_disclaimer: string
}

export type PlatformFacturadorLegal = {
  role_label: string
  brand_name: string | null
  legal_name: string | null
  nit: string | null
  not_issuer_disclaimer: string
  slug: string
}

export type PlatformLegalPrint = {
  software: PlatformSoftwareLegal
  facturador: PlatformFacturadorLegal
}

export const EMPTY_PLATFORM_LEGAL: PlatformLegalPrint = {
  software: {
    role_label: 'Proveedor tecnologico / software',
    commercial_name: null,
    legal_name: null,
    nit: null,
    iva_responsibility_label: null,
    not_issuer_disclaimer: 'No es el emisor de esta venta',
  },
  facturador: {
    role_label: 'Facturador tecnico DIAN',
    brand_name: null,
    legal_name: null,
    nit: null,
    not_issuer_disclaimer: 'No es el emisor de esta venta',
    slug: 'matias',
  },
}
