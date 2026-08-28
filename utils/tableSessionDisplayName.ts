/** Session-facing table label: alias when set, else catalog name (#2483). */
export function tableSessionDisplayName(
  tableName: string,
  customLabel?: string | null,
): string {
  const alias = customLabel?.trim()
  return alias || tableName
}

export function tableSessionHasAlias(
  tableName: string,
  customLabel?: string | null,
): boolean {
  const alias = customLabel?.trim()
  return !!alias && alias !== tableName.trim()
}
