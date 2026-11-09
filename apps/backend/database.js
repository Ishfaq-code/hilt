const Organization = require('./models/Organization')
const University = require('./models/University')

async function initializeClubs() {
  await Promise.all([University.init(), Organization.init()])

  try {
    const now = new Date()

    await University.updateOne(
      { slug: 'ucf' },
      {
        $setOnInsert: {
          name: 'University of Central Florida',
          emailDomains: ['ucf.edu'],
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true, runValidators: true, timestamps: false },
    )
  } catch (error) {
    // Concurrent starts may race to insert the same university.
    if (error.code !== 11000) {
      throw error
    }
  }
}

module.exports = { initializeClubs }
