export function uploadBody(
  details: object,
  files: Record<string, FormDataEntryValue | null | undefined>,
) {
  const body = new FormData()
  body.set('details', JSON.stringify(details))
  for (const [name, file] of Object.entries(files)) {
    if (file instanceof File && file.name) body.set(name, file)
  }
  return body
}
