export interface TocHeading {
  id: string
  text: string
  level: number
}

export const useDocsToc = () => {
  const headings = useState<TocHeading[]>('docs-toc', () => [])
  return { headings }
}
