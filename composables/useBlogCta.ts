import {
  getBlogLeadCta,
  type BlogLeadCtaContent,
  type BlogLeadCtaPlacement,
} from '~/utils/blogLeadCta'

export type BlogCtaContent = BlogLeadCtaContent

export function useBlogCta(
  slug: string,
  placement: BlogLeadCtaPlacement = 'final',
): BlogCtaContent {
  return getBlogLeadCta(slug, placement)
}
