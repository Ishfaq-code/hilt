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

function tagsFor(record) {
  return record.tags ?? (record.category ? [record.category] : [])
}

function withTags(record) {
  const { category, ...rest } = record
  return { ...rest, tags: tagsFor(record) }
}

function serializeTags(_document, record) {
  return withTags(record)
}

module.exports = { parseTags, tagsFor, withTags, serializeTags }
