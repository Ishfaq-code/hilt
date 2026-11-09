const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { once } = require('node:events')
const { test } = require('node:test')
const mongoose = require('mongoose')

const app = require('../server')
const User = require('../models/User')
const Session = require('../models/Session')
const Organization = require('../models/Organization')
const University = require('../models/University')
const { initializeClubs } = require('../database')
const { migrateLegacyClubs } = require('../scripts/migrate-clubs')

test('club application, review, discovery, membership, and leadership API', async (t) => {
  const dbName = `hilt_clubs_test_${randomUUID().replaceAll('-', '')}`
  let server

  t.after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve))
    }

    if (mongoose.connection.name === dbName) {
      await mongoose.connection.dropDatabase()
    }

    await mongoose.disconnect()
  })

  await mongoose.connect(
    process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017',
    { dbName, serverSelectionTimeoutMS: 5000 },
  )
  await Promise.all([User.init(), Session.init(), initializeClubs()])

  server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')

  const url = `http://127.0.0.1:${server.address().port}`
  const password = 'disposable club test passphrase'

  async function request(path, { method = 'GET', body, token, headers = {} } = {}) {
    const response = await fetch(url + path, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const text = await response.text()

    return {
      status: response.status,
      body: text ? JSON.parse(text) : null,
    }
  }

  async function account(name, emailAddress, admin = false) {
    const created = await request('/api/auth/register', {
      method: 'POST',
      body: {
        firstName: name,
        lastName: 'Test',
        emailAddress,
        password,
        isSiteAdmin: true,
      },
    })

    assert.equal(created.status, 201)
    assert.equal(
      (await User.findById(created.body.user.id)).isSiteAdmin,
      false,
      'Registration must not provision admins',
    )

    if (admin) {
      await User.updateOne(
        { _id: created.body.user.id },
        { $set: { isSiteAdmin: true } },
      )
    }

    const login = await request('/api/auth/login', {
      method: 'POST',
      body: { emailAddress, password },
    })

    assert.equal(login.status, 200)

    return { id: created.body.user.id, token: login.body.token }
  }

  const owner = await account('Applicant', 'applicant@ucf.edu')
  const member = await account('Student', 'student@ucf.edu')
  const other = await account('Other', 'other@ucf.edu')
  const outside = await account('Outside', 'outside@example.com')
  const admin = await account('Reviewer', 'reviewer@ucf.edu', true)
  const university = await University.findOne({ slug: 'ucf' })

  const details = {
    name: 'Knight Builders',
    description: 'A club for students building useful things.',
    universityId: university.id,
    contactEmail: 'contact@example.com',
    links: ['https://example.com/club'],
  }
  let club

  await t.test('initialization is idempotent and leaves legacy records and existing users intact', async () => {
    const legacy = await Organization.collection.insertOne({
      name: 'Legacy Club',
      owner: new mongoose.Types.ObjectId(owner.id),
      members: [],
      description: 'Preserved',
    })
    const before = await Organization.collection.findOne({ _id: legacy.insertedId })
    const universityBefore = await University.collection.findOne({ _id: university._id })

    await initializeClubs()
    await initializeClubs()

    assert.equal(await University.countDocuments({ slug: 'ucf' }), 1)
    assert.deepEqual(
      await University.collection.findOne({ _id: university._id }),
      universityBefore,
    )
    assert.deepEqual(
      await Organization.collection.findOne({ _id: legacy.insertedId }),
      before,
    )
    assert.equal((await request('/api/clubs')).body.total, 0)
  })

  await t.test('universities are public, and private routes enforce sessions and site-admin role', async () => {
    assert.equal((await request('/api/universities')).body.universities[0].slug, 'ucf')

    for (const path of [
      '/api/me/clubs',
      '/api/club-applications',
      '/api/admin/club-applications',
    ]) {
      assert.equal((await request(path)).status, 401)
    }

    const unauthorized = await request('/api/admin/club-applications', {
      token: owner.token,
    })

    assert.equal(unauthorized.status, 403)
    assert.equal((await request('/api/me/clubs', { token: owner.token })).body.isSiteAdmin, false)
    assert.equal((await request('/api/me/clubs', { token: admin.token })).body.isSiteAdmin, true)
  })

  await t.test('validates applications and uses configured exact university domains', async () => {
    for (const body of [
      {},
      { ...details, name: ' ' },
      { ...details, description: 'x'.repeat(4001) },
      { ...details, owner: other.id },
      { ...details, approvalStatus: 'approved' },
      { ...details, administrators: [owner.id] },
      { ...details, links: ['javascript:alert(1)'] },
      { ...details, links: ['https://user:password@example.com'] },
      { ...details, universityId: { $ne: null } },
      { ...details, contactEmail: 'bad-email' },
    ]) {
      const result = await request('/api/club-applications', {
        method: 'POST',
        token: owner.token,
        body,
      })

      assert.equal(result.status, 400)
    }

    const ineligible = await request('/api/club-applications', {
      method: 'POST',
      token: outside.token,
      body: details,
    })

    assert.equal(ineligible.status, 403)

    const result = await request('/api/club-applications', {
      method: 'POST',
      token: owner.token,
      body: { ...details, name: ' Knight Builders ' },
    })

    assert.equal(result.status, 201)

    club = result.body.application

    assert.equal(club.name, details.name)
    assert.equal(club.approvalStatus, 'pending')
    assert.equal(club.revision, 0)
    assert.equal(club.memberCount, 0)
  })

  await t.test('pending applications stay private and cannot be joined', async () => {
    assert.equal((await request('/api/clubs')).body.total, 0)
    assert.equal((await request(`/api/clubs/${club.id}`)).status, 404)

    const join = await request(`/api/clubs/${club.id}/membership`, {
      method: 'PUT',
      token: member.token,
    })

    assert.equal(join.status, 404)
    assert.equal((await request('/api/club-applications', { token: other.token })).body.applications.length, 0)
    assert.equal((await request('/api/club-applications', { token: owner.token })).body.applications.length, 1)

    const edit = await request(`/api/club-applications/${club.id}`, {
      method: 'PATCH',
      token: other.token,
      body: { ...details, revision: 0 },
    })
    const review = await request(`/api/admin/club-applications/${club.id}/review`, {
      method: 'POST',
      token: owner.token,
      body: { decision: 'approve', message: '', revision: 0 },
    })

    assert.equal(edit.status, 404)
    assert.equal(review.status, 403)
  })

  await t.test('clarification, revision conflicts, rejection, and resubmission preserve review history', async () => {
    const endpoint = `/api/admin/club-applications/${club.id}/review`
    const missingMessage = await request(endpoint, {
      method: 'POST',
      token: admin.token,
      body: { decision: 'request_changes', message: '', revision: 0 },
    })

    assert.equal(missingMessage.status, 400)

    const clarification = await request(endpoint, {
      method: 'POST',
      token: admin.token,
      body: {
        decision: 'request_changes',
        message: 'Please explain the meeting format.',
        revision: 0,
      },
    })

    assert.equal(clarification.status, 200)
    assert.equal(clarification.body.application.approvalStatus, 'pending')
    assert.equal(clarification.body.application.reviews.length, 1)

    const staleEdit = await request(`/api/club-applications/${club.id}`, {
      method: 'PATCH',
      token: owner.token,
      body: { ...details, revision: 0 },
    })

    assert.equal(staleEdit.status, 409)

    const rejected = await request(endpoint, {
      method: 'POST',
      token: admin.token,
      body: {
        decision: 'reject',
        message: 'We need a clearer club purpose.',
        revision: 1,
      },
    })

    assert.equal(rejected.body.application.approvalStatus, 'rejected')

    const resubmitted = await request(`/api/club-applications/${club.id}`, {
      method: 'PATCH',
      token: owner.token,
      body: {
        ...details,
        links: undefined,
        description: 'Weekly software project meetings.',
        revision: 2,
      },
    })

    assert.equal(resubmitted.status, 200)
    assert.equal(resubmitted.body.application.approvalStatus, 'pending')
    assert.equal(resubmitted.body.application.reviews.length, 2)
    assert.deepEqual(resubmitted.body.application.links, details.links)

    club = resubmitted.body.application

    const staleReview = await request(endpoint, {
      method: 'POST',
      token: admin.token,
      body: { decision: 'approve', message: '', revision: 2 },
    })

    assert.equal(staleReview.status, 409)
  })

  await t.test('competing reviewers produce one approval and stable club identity', async () => {
    const endpoint = `/api/admin/club-applications/${club.id}/review`
    const results = await Promise.all(['approve', 'reject'].map((decision) => (
      request(endpoint, {
        method: 'POST',
        token: admin.token,
        body: { decision, message: 'Reviewed.', revision: club.revision },
      })
    )))

    assert.deepEqual(results.map((result) => result.status).sort(), [200, 409])

    const saved = await Organization.findById(club.id)

    // If rejection won, resubmit before obtaining a fresh review.
    if (saved.approvalStatus === 'rejected') {
      await request(`/api/club-applications/${club.id}`, {
        method: 'PATCH',
        token: owner.token,
        body: { ...details, revision: saved.revision },
      })

      const latest = await Organization.findById(club.id)
      const review = await request(endpoint, {
        method: 'POST',
        token: admin.token,
        body: { decision: 'approve', message: '', revision: latest.revision },
      })

      assert.equal(review.status, 200)
    }

    const approved = await Organization.findById(club.id)

    assert.equal(approved.approvalStatus, 'approved')
    assert.deepEqual(approved.administrators.map(String), [owner.id])
    assert.deepEqual(approved.members.map(String), [owner.id])
    assert.equal(approved.owner.toString(), owner.id)

    const edit = await request(`/api/club-applications/${club.id}`, {
      method: 'PATCH',
      token: owner.token,
      body: { ...details, revision: approved.revision },
    })

    assert.equal(edit.status, 409)
  })

  await t.test('discovery and direct links expose only safe approved club data', async () => {
    const publicList = await request('/api/clubs?q=Knight&limit=1&offset=0')
    const visible = (await request(`/api/clubs/${club.id}`)).body.club

    assert.equal(publicList.body.total, 1)
    assert.equal(publicList.body.clubs[0].id, club.id)

    for (const key of [
      'owner',
      'contactEmail',
      'reviews',
      'members',
      'administrators',
      'passwordHash',
    ]) {
      assert.equal(visible[key], undefined)
    }

    assert.equal(visible.memberCount, 1)
    assert.equal(
      (await request('/api/clubs?q=%5B')).status,
      200,
      'Search must escape regex metacharacters',
    )

    for (const path of [
      '/api/clubs?limit=999',
      '/api/clubs?offset=-1',
      '/api/clubs?universityId=bad',
      '/api/clubs/not-an-id',
    ]) {
      assert.equal((await request(path)).status, 400)
    }
  })

  await t.test('membership is authenticated, idempotent, persistent, and separate from admin authority', async () => {
    const endpoint = `/api/clubs/${club.id}/membership`

    assert.equal((await request(endpoint, { method: 'PUT' })).status, 401)
    assert.equal((await request(endpoint, { method: 'PUT', token: outside.token })).status, 403)

    const joins = await Promise.all([1, 2, 3].map(() => (
      request(endpoint, { method: 'PUT', token: member.token })
    )))
    const saved = await Organization.findById(club.id)
    const workspace = await request('/api/me/clubs', { token: member.token })

    assert.ok(joins.every((result) => result.status === 200))
    assert.equal(saved.members.filter((id) => id.toString() === member.id).length, 1)
    assert.equal(workspace.body.clubs[0].canManage, false)
    assert.equal((await request(`/api/clubs/${club.id}/members`, { token: member.token })).status, 404)

    assert.equal((await request(endpoint, { method: 'DELETE', token: member.token })).status, 204)
    assert.equal((await request(endpoint, { method: 'DELETE', token: member.token })).status, 204)
    assert.equal((await request('/api/me/clubs', { token: member.token })).body.clubs.length, 0)
    assert.equal((await request(`/api/clubs/${club.id}`)).body.club.memberCount, 1)
  })

  await t.test('club managers can share authority without exposing member emails or stranding a club', async () => {
    const membership = `/api/clubs/${club.id}/membership`
    const manager = `/api/clubs/${club.id}/administrators/${member.id}`
    const ownerRole = `/api/clubs/${club.id}/administrators/${owner.id}`

    assert.equal((await request(membership, { method: 'DELETE', token: owner.token })).status, 409)
    assert.equal((await request(manager, { method: 'PUT', token: other.token })).status, 404)

    await request(membership, { method: 'PUT', token: member.token })

    assert.equal((await request(manager, { method: 'PUT', token: owner.token })).status, 204)

    const roster = await request(`/api/clubs/${club.id}/members`, { token: member.token })

    assert.equal(roster.status, 200)
    assert.ok(roster.body.members.every((user) => user.emailAddress === undefined))
    assert.equal((await request(ownerRole, { method: 'DELETE', token: member.token })).status, 204)
    assert.equal((await request(membership, { method: 'DELETE', token: owner.token })).status, 204)
    assert.equal((await request(`/api/clubs/${club.id}/members`, { token: owner.token })).status, 404)
    assert.equal((await request(manager, { method: 'DELETE', token: member.token })).status, 409)
    assert.equal((await request(membership, { method: 'DELETE', token: member.token })).status, 409)

    // The owner records provenance, not permanent administration rights.
    assert.equal((await Organization.findById(club.id)).owner.toString(), owner.id)
  })

  await t.test('concurrent administrator departures leave at least one active administrator', async () => {
    await request(`/api/clubs/${club.id}/membership`, {
      method: 'PUT',
      token: other.token,
    })
    await request(`/api/clubs/${club.id}/administrators/${other.id}`, {
      method: 'PUT',
      token: member.token,
    })

    const departures = await Promise.all([member, other].map((user) => (
      request(`/api/clubs/${club.id}/membership`, {
        method: 'DELETE',
        token: user.token,
      })
    )))
    const saved = await Organization.findById(club.id)

    assert.deepEqual(departures.map((result) => result.status).sort(), [204, 409])
    assert.equal(saved.administrators.length, 1)
    assert.ok(saved.members.some((id) => id.equals(saved.administrators[0])))
  })

  await t.test('review queues paginate deterministically and validate pagination', async () => {
    const fixtures = await Organization.create(Array.from({ length: 23 }, (_, index) => ({
      name: `Queue fixture ${index}`,
      description: 'A private pending fixture',
      owner: other.id,
      university: university._id,
      contactEmail: 'other@ucf.edu',
      approvalStatus: 'pending',
    })))

    const first = await request('/api/admin/club-applications?status=pending&offset=0', {
      token: admin.token,
    })
    const second = await request('/api/admin/club-applications?status=pending&offset=20', {
      token: admin.token,
    })
    const ids = [...first.body.applications, ...second.body.applications]
      .map((item) => item.id)

    assert.equal(first.body.total, 23)
    assert.equal(first.body.applications.length, 20)
    assert.equal(second.body.applications.length, 3)
    assert.equal(new Set(ids).size, 23)
    assert.equal((await request('/api/admin/club-applications?offset=-1', { token: admin.token })).status, 400)
    assert.equal((await request('/api/admin/club-applications?status=hidden', { token: admin.token })).status, 400)

    await Organization.deleteMany({ _id: { $in: fixtures.map((item) => item._id) } })
  })

  await t.test('configured universities extend eligibility and club management stays scoped to its own club', async () => {
    const secondUniversity = await University.create({
      slug: 'test-university',
      name: 'Test University',
      emailDomains: ['other.edu'],
    })
    const applicant = await account('Another', 'student@other.edu')
    const submitted = await request('/api/club-applications', {
      method: 'POST',
      token: applicant.token,
      body: {
        ...details,
        name: 'Other University Club',
        universityId: secondUniversity.id,
      },
    })

    assert.equal(submitted.status, 201)

    const secondId = submitted.body.application.id
    const approval = await request(`/api/admin/club-applications/${secondId}/review`, {
      method: 'POST',
      token: admin.token,
      body: { decision: 'approve', message: '', revision: 0 },
    })

    assert.equal(approval.status, 200)
    assert.equal((await request(`/api/clubs?universityId=${secondUniversity.id}`)).body.total, 1)

    const ineligible = await request(`/api/clubs/${secondId}/membership`, {
      method: 'PUT',
      token: owner.token,
    })
    const firstClub = await Organization.findById(club.id)
    const firstManager = [member, other].find((person) => (
      firstClub.administrators.some((id) => id.toString() === person.id)
    ))
    const crossClubRole = await request(`/api/clubs/${secondId}/administrators/${applicant.id}`, {
      method: 'PUT',
      token: firstManager.token,
    })

    assert.equal(ineligible.status, 403)
    assert.equal((await request(`/api/clubs/${secondId}/members`, { token: firstManager.token })).status, 404)
    assert.equal(crossClubRole.status, 404)
    assert.equal((await request(`/api/clubs/${club.id}/members`, { token: applicant.token })).status, 404)
  })

  await t.test('site-admin revocation takes effect with the same existing session', async () => {
    await User.updateOne({ _id: admin.id }, { $set: { isSiteAdmin: false } })

    assert.equal((await request('/api/admin/club-applications', { token: admin.token })).status, 403)
  })

  await t.test('legacy migration previews without writing, preserves original data, and is idempotent', async () => {
    const before = await Organization.collection.findOne({ name: 'Legacy Club' })
    const preview = await migrateLegacyClubs(university, false)

    assert.equal(preview.eligible, 1)
    assert.equal(preview.migrated, 0)
    assert.deepEqual(await Organization.collection.findOne({ _id: before._id }), before)

    const applied = await migrateLegacyClubs(university, true)
    const after = await Organization.collection.findOne({ _id: before._id })

    assert.equal(applied.migrated, 1)

    for (const key of Object.keys(before)) {
      assert.deepEqual(after[key], before[key])
    }

    assert.equal(after.approvalStatus, 'pending')
    assert.equal(after.contactEmail, 'applicant@ucf.edu')
    assert.equal((await migrateLegacyClubs(university, true)).migrated, 0)
    assert.equal((await request('/api/clubs?q=Legacy')).body.total, 0)
  })

  await t.test('new application bodies enforce JSON, size, and syntax boundaries', async () => {
    const wrongType = await request('/api/club-applications', {
      method: 'POST',
      token: owner.token,
      body: details,
      headers: { 'Content-Type': 'text/plain' },
    })
    const malformed = await fetch(url + '/api/club-applications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner.token}`,
      },
      body: '{',
    })
    const oversized = await request('/api/club-applications', {
      method: 'POST',
      token: owner.token,
      body: { description: 'x'.repeat(17000) },
    })

    assert.equal(wrongType.status, 415)
    assert.equal(malformed.status, 400)
    assert.equal(oversized.status, 413)
  })

  await t.test('limits repeated application attempts per authenticated account', async () => {
    let result

    for (let attempt = 0; attempt < 21; attempt += 1) {
      result = await request('/api/club-applications', {
        method: 'POST',
        token: owner.token,
        body: {},
      })

      if (result.status === 429) {
        break
      }
    }

    assert.equal(result.status, 429)
    assert.equal(typeof result.body.error, 'string')

    // Accounts behind the same IP still have independent submission budgets.
    const otherApplicant = await request('/api/club-applications', {
      method: 'POST',
      token: other.token,
      body: {},
    })

    assert.equal(otherApplicant.status, 400)
  })
})
