export function normalizeCatalogSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase()
}

export function rankCatalogSearchOptions<T>(
  options: readonly T[],
  query: string,
  getLabel: (option: T) => string,
) {
  const normalizedQuery = normalizeCatalogSearchText(query)
  if (!normalizedQuery) return [...options]

  return options
    .map((option, index) => {
      const label = normalizeCatalogSearchText(getLabel(option))
      const rank = label === normalizedQuery
        ? 0
        : label.startsWith(normalizedQuery)
          ? 1
          : label.includes(normalizedQuery)
            ? 2
            : 3
      return { option, index, rank }
    })
    .filter(item => item.rank < 3)
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(item => item.option)
}
