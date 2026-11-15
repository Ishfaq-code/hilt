export type Theme = 'tech' | 'outdoors' | 'film' | 'art'

export function themeFor(tags: string[]): Theme {
  const text = tags.join(' ')
  if (/outdoor|sport|recreation/i.test(text)) return 'outdoors'
  if (/art|design|culture/i.test(text)) return 'art'
  if (/film|media/i.test(text)) return 'film'
  return 'tech'
}
