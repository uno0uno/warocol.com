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
 * Prefer the group's GL code when it is a selectable leaf; otherwise first leaf.
 * Empty string means the create form must wait for chart data / user pick.
 */
export const defaultPaymentMethodParentCode = (
  groupGlAccountCode: string | null | undefined,
  leafAccountCodes: string[],
): string => {
  if (groupGlAccountCode && leafAccountCodes.includes(groupGlAccountCode)) {
    return groupGlAccountCode
  }
  return leafAccountCodes[0] ?? ''
}
