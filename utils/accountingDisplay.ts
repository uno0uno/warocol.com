/** GLOBAL class/group codes — collide with CO PUC class codes (1–6); gate via isColombiaPuc. */
export const GLOBAL_CLASS_GROUP_I18N_KEYS: Record<string, string> = {
  '1': 'assets',
  '10': 'currentAssets',
  '2': 'liabilities',
  '20': 'currentLiabilities',
  '3': 'equity',
  '30': 'equityDetails',
  '4': 'income',
  '40': 'operatingRevenue',
  '5': 'expenses',
  '50': 'operatingExpenses',
  '6': 'costs',
  '60': 'cogsDetails',
}

/** Global managerial detail codes (non-CO). Safe for all localizations. */
export const GLOBAL_DETAIL_I18N_KEYS: Record<string, string> = {
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

/** Full GLOBAL map (details + class/group). Prefer localizeSystemAccountName with isColombiaPuc. */
export const GLOBAL_SYSTEM_ACCOUNT_I18N_KEYS: Record<string, string> = {
  ...GLOBAL_CLASS_GROUP_I18N_KEYS,
  ...GLOBAL_DETAIL_I18N_KEYS,
}

export type AccountNameSource = {
  code?: string | null
  name?: string | null
}

export type LocalizeSystemAccountOptions = {
  /** When true, skip class/group code remaps that collide with CO PUC (1–6). */
  isColombiaPuc?: boolean
}

export const localizeSystemAccountName = (
  account: AccountNameSource,
  translate: (key: string) => string,
  options: LocalizeSystemAccountOptions = {},
): string => {
  const stored = String(account.name ?? '').trim()
  const code = String(account.code ?? '').trim()
  const slug = options.isColombiaPuc
    ? GLOBAL_DETAIL_I18N_KEYS[code]
    : GLOBAL_SYSTEM_ACCOUNT_I18N_KEYS[code]
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
