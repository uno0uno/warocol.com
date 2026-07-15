import {
  getBlogPublicCta,
  type PublicCta,
  type PublicCtaPlacement,
} from '~/utils/publicCta'

export type BlogCtaContent = PublicCta

export function useBlogCta(
  slug: string,
  placement: Extract<PublicCtaPlacement, 'benefit' | 'price' | 'final'> = 'final',
): BlogCtaContent {
  return getBlogPublicCta(slug, placement)
}
