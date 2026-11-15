const pixel = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jc9QAAAAASUVORK5CYII=',
  'base64',
)

function clubApplicationForm(details) {
  const form = new FormData()
  const image = new Blob([pixel], { type: 'image/png' })
  form.set('details', JSON.stringify(details))
  form.set('icon', image, 'icon.png')
  form.set('banner', image, 'banner.png')
  return form
}

module.exports = { clubApplicationForm }
