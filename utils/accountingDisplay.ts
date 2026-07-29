/** Global managerial chart codes (non-CO). CO PUC uses different codes — left as stored. */
export const GLOBAL_SYSTEM_ACCOUNT_I18N_KEYS: Record<string, string> = {
  '1000': 'cash',
  '1010': 'bank',
  '1100': 'accountsReceivable',
  '1200': 'inventory',
  '2000': 'accountsPayable',
  '2100': 'taxPayable',
  '2200': 'customerAdvances',
  '4000': 'salesRevenue',
  '4010': 'otherIncome',
  '5000': 'payrollExpense',
  '5100': 'bankFeesExpense',
  '6000': 'costOfGoodsSold',
}

export type AccountNameSource = {
  code?: string | null
  name?: string | null
}

export const localizeSystemAccountName = (
  account: AccountNameSource,
  translate: (key: string) => string,
): string => {
  const stored = String(account.name ?? '').trim()
  const code = String(account.code ?? '').trim()
  const slug = GLOBAL_SYSTEM_ACCOUNT_I18N_KEYS[code]
  if (!slug) return stored
  return translate(`finanzas.contabilidad.systemAccounts.${slug}`)
}

export type AccountLevelMetadata = {
  level?: number | null
  isDetail?: boolean
}

export type AccountLevelKey = 'class' | 'group' | 'account' | 'subaccount'

export const getAccountLevel = (account: AccountLevelMetadata): number => {
  if (typeof account.level === 'number' && Number.isInteger(account.level) && account.level > 0) {
    return account.level
  }
  return account.isDetail ? 4 : 1
}

export const getAccountLevelKey = (account: AccountLevelMetadata): AccountLevelKey => {
  const level = getAccountLevel(account)
  if (level === 1) return 'class'
  if (level === 2) return 'group'
  if (level === 3) return 'account'
  return 'subaccount'
}

export const getAccountLevelVariant = (account: AccountLevelMetadata): string => {
  const level = getAccountLevel(account)
  if (level === 1) return 'primary'
  if (level === 2) return 'secondary'
  if (level === 3) return 'warning'
  return 'success'
}

export const getAccountIndentClass = (account: AccountLevelMetadata): string => {
  const level = getAccountLevel(account)
  if (level <= 1) return ''
  if (level === 2) return 'ps-4'
  if (level === 3) return 'ps-8'
  return 'ps-12'
}
