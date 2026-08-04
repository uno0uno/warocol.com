/**
 * Chart-of-accounts helpers shared across finance pages.
 *
 * Issue #533 — extracted from `pages/finanzas/contabilidad/cuentas/[id].vue` so
 * both the create-sub-account flow (cuentas page) and the auto-create-on-method
 * flow (`pages/finanzas/metodos-pago/[groupId].vue`) compute the next sub-aux
 * suffix using the same logic. Avoids divergence as the convention evolves.
 */

interface AccountLike {
  code: string
}

/**
 * Suggest the next available 2-digit sub-aux suffix under a given parent code.
 *
 * Convention used across the project (Colombian PUC):
 *   - Increments of 5 ('05', '10', '15', '20'…) so there's room to insert
 *     codes manually later without renumbering existing ones.
 *   - Returns '05' when the parent has no children yet.
 *   - Operates on the cached list of accounts already loaded in the page.
 *
 * Example: parent 1110 with existing children 111005, 111010 → returns '15'.
 */
export const suggestSubAccountSuffix = (
  parentCode: string,
  allAccounts: AccountLike[],
): string => {
  const existing = allAccounts
    .filter(a => a.code.startsWith(parentCode) && a.code.length === parentCode.length + 2)
    .map(a => parseInt(a.code.slice(parentCode.length)))
    .filter(n => !isNaN(n))
  if (!existing.length) return '05'
  const next = Math.max(...existing) + 5
  return String(next).padStart(2, '0')
}

/**
 * When the group already has a GL code, always use it (do not fall back to an
 * arbitrary first leaf). When unset, optionally soft-default to the first leaf
 * for the required select path.
 */
export const defaultPaymentMethodParentCode = (
  groupGlAccountCode: string | null | undefined,
  leafAccountCodes: string[],
): string => {
  const groupCode = groupGlAccountCode?.trim()
  if (groupCode) return groupCode
  return leafAccountCodes[0] ?? ''
}
