function parseTags(value) {
  if (!Array.isArray(value)) return null

  const tags = new Map()
  for (const item of value) {
    if (typeof item !== 'string' || !item.trim()) return null
    const tag = item.trim()
    const key = tag.toLowerCase()
    if (!tags.has(key)) tags.set(key, tag)
  }
  return [...tags.values()]
}

function tagsFor(tags, legacyTag) {
  return tags ?? (legacyTag ? [legacyTag] : [])
}

function withClubTags(record) {
  const { category, ...rest } = record
  return { ...rest, tags: tagsFor(rest.tags, category) }
}

function withEventTags(record) {
  const { type, ...rest } = record
  return { ...rest, tags: tagsFor(rest.tags, type) }
}

module.exports = { parseTags, tagsFor, withClubTags, withEventTags }
