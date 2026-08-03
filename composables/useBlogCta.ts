import {
  getBlogLeadCta,
  type BlogLeadCtaContent,
  type BlogLeadCtaPlacement,
} from '~/utils/blogLeadCta'
import type { ArticleMarketInput } from '~/utils/articleMarket'

export type BlogCtaContent = BlogLeadCtaContent

export function useBlogCta(
  slug: string,
  placement: BlogLeadCtaPlacement = 'final',
  marketInput: ArticleMarketInput = {},
): BlogCtaContent {
  return getBlogLeadCta(slug, placement, marketInput)
}
