function universityView(university) {
  return {
    id: university.id,
    slug: university.slug,
    name: university.name,
    emailDomains: university.emailDomains,
  }
}

function clubView(club) {
  return {
    id: club.id,
    name: club.name,
    description: club.description,
    links: club.links,
    university: club.university ? universityView(club.university) : null,
    memberCount: new Set(club.members.map(String)).size,
  }
}

function applicationView(club) {
  return {
    ...clubView(club),
    approvalStatus: club.approvalStatus,
    contactEmail: club.contactEmail,
    revision: club.revision,
    createdAt: club.createdAt,
    updatedAt: club.updatedAt,
    reviews: club.reviews.map(({ decision, message, at, revision }) => ({
      decision,
      message,
      at,
      revision,
    })),
  }
}

module.exports = {
  universityView,
  clubView,
  applicationView,
}
