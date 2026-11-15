export const clubTagOptions = [
  'Academic',
  'Arts',
  'Community',
  'Culture',
  'General',
  'Other',
  'Outdoors',
  'Technology',
]

export function hasAnyTag(tags: string[], selected: string[]) {
  if (!selected.length) return true
  const wanted = new Set(selected.map((tag) => tag.toLowerCase()))
  return tags.some((tag) => wanted.has(tag.toLowerCase()))
}
