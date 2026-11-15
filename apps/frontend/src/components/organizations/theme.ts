export type Theme = 'tech' | 'outdoors' | 'film' | 'art'

export function themeFor(category?: string): Theme {
  if (/outdoor|sport|recreation/i.test(category || '')) return 'outdoors'
  if (/art|design|culture/i.test(category || '')) return 'art'
  if (/film|media/i.test(category || '')) return 'film'
  return 'tech'
}
