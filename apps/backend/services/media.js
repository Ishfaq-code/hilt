const { randomUUID } = require('node:crypto')
const Application = require('../models/Application')
const Organization = require('../models/Organization')
const s3Service = require('./s3Service')

function mediaLink(key) {
  return `/api/media/${key}`
}

async function deleteMedia(prefix, links) {
  await Promise.all(
    links
      .filter((link) => link?.startsWith(mediaLink(`${prefix}/`)))
      .map(async (link) => {
        try {
          await s3Service.deleteFile(link.slice(mediaLink('').length))
        } catch (error) {
          console.error('Failed to remove unused media:', error.name)
        }
      }),
  )
}

async function saveWithUploads(prefix, files, save) {
  const links = {}
  try {
    for (const [field, file] of Object.entries(files)) {
      const key = `${prefix}/${randomUUID()}.${file.extension}`
      links[field] = mediaLink(key)
      await s3Service.putFile(key, file)
    }
    return await save(links)
  } catch (error) {
    await deleteMedia(prefix, Object.values(links))
    throw error
  }
}

async function deleteUnusedClubImages(clubId, links) {
  const prefix = `clubs/${clubId}`
  const uploads = links.filter((link) =>
    link.startsWith(mediaLink(`${prefix}/`)),
  )
  if (!uploads.length) return

  try {
    const [club, application] = await Promise.all([
      Organization.findById(clubId, 'assets').lean(),
      Application.findById(clubId, 'assets').lean(),
    ])
    const used = new Set(
      [...(club?.assets ?? []), ...(application?.assets ?? [])].map(
        (asset) => asset.link,
      ),
    )
    await deleteMedia(
      prefix,
      uploads.filter((link) => !used.has(link)),
    )
  } catch (error) {
    console.error('Failed to check club image references:', error.name)
  }
}

async function saveClubImages(clubId, files, assets, save) {
  const replacements = {
    icon: /logo|icon/i,
    banner: /banner|cover/i,
  }
  const replaced = assets.filter((asset) =>
    Object.keys(files).some((type) => replacements[type].test(asset.type)),
  )
  const prefix = `clubs/${clubId}`
  const result = await saveWithUploads(prefix, files, (links) =>
    save([
      ...assets.filter((asset) => !replaced.includes(asset)),
      ...Object.entries(links).map(([type, link]) => ({ type, link })),
    ]),
  )
  await deleteUnusedClubImages(
    clubId,
    replaced.map((asset) => asset.link),
  )
  return result
}

module.exports = {
  mediaLink,
  saveWithUploads,
  saveClubImages,
  deleteMedia,
  deleteUnusedClubImages,
}
