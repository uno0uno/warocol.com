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
