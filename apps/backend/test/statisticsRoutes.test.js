const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { once } = require('node:events')
const test = require('node:test')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const Application = require('../models/Application')
const Attendance = require('../models/EventAttendance')
const Rsvp = require('../models/EventRsvp')
const ClubAccess = require('../models/ClubAccess')
const Membership = require('../models/Membership')
const Organization = require('../models/Organization')
const User = require('../models/User')
const app = require('../server')
const { permissions } = require('../services/clubRoles')

const mongoUri = process.env.HILT_TEST_MONGODB_URI

test(
  'admin and organization statistics return their charts data with permission checks',
  { skip: !mongoUri },
  async (t) => {
    process.env.JWT_SECRET = randomUUID()
    await mongoose.connect(mongoUri, {
      dbName: 'hilt_statistics_test_' + randomUUID(),
    })
    t.after(async () => {
      await mongoose.connection.dropDatabase()
      await mongoose.disconnect()
    })

    const [admin, member, unpaidMember, unjoined] = await User.create([
      {
        firstName: 'Site',
        lastName: 'Admin',
        email: 'statistics-admin@example.edu',
        appRole: 'admin',
      },
      { firstName: 'Club', lastName: 'Lead', email: 'lead@example.edu' },
      { firstName: 'Club', lastName: 'Member', email: 'member@example.edu' },
      { firstName: 'No', lastName: 'Membership', email: 'none@example.edu' },
    ])
    const organizationA = await Organization.create({
      name: 'First club',
      membershipFee: 10,
      events: [
        { name: 'Published event' },
        { name: 'Draft event', status: 'draft' },
      ],
    })
    const organizationB = await Organization.create({
      name: 'Second club',
      membershipFee: 4,
      events: [{ name: 'Second event' }],
    })
    const [leadA, unpaidA, leadB] = await Membership.create([
      { userId: member._id, organizationId: organizationA._id, isPaid: true },
      {
        userId: unpaidMember._id,
        organizationId: organizationA._id,
        isPaid: false,
      },
      { userId: member._id, organizationId: organizationB._id, isPaid: true },
    ])
    await ClubAccess.create({
      _id: organizationA._id,
      roles: [{ name: 'Manager', permissions, memberIds: [leadA._id] }],
    })
    await Application.create([
      { userId: admin._id, organizationName: 'Approved', status: 'approved' },
      { userId: admin._id, organizationName: 'Rejected', status: 'denied' },
      { userId: admin._id, organizationName: 'Pending', status: 'pending' },
    ])
    await Attendance.create([
      {
        organizationId: organizationA._id,
        eventId: organizationA.events[0]._id,
        userId: member._id,
        checkedInAt: new Date(),
        checkedInBy: admin._id,
        method: 'staff-manual',
        hadRsvp: false,
      },
      {
        organizationId: organizationA._id,
        eventId: organizationA.events[0]._id,
        userId: unpaidMember._id,
        checkedInAt: new Date(),
        checkedInBy: admin._id,
        method: 'staff-manual',
        hadRsvp: false,
        reversedAt: new Date(),
      },
      {
        organizationId: organizationB._id,
        eventId: organizationB.events[0]._id,
        userId: member._id,
        checkedInAt: new Date(),
        checkedInBy: admin._id,
        method: 'staff-manual',
        hadRsvp: false,
      },
    ])
    await Rsvp.create([
      {
        organizationId: organizationA._id,
        eventId: organizationA.events[0]._id,
        userId: member._id,
      },
      {
        organizationId: organizationA._id,
        eventId: organizationA.events[0]._id,
        userId: unpaidMember._id,
      },
      {
        organizationId: organizationB._id,
        eventId: organizationB.events[0]._id,
        userId: member._id,
      },
    ])

    const server = app.listen(0, '127.0.0.1')
    await once(server, 'listening')
    t.after(() => new Promise((resolve) => server.close(resolve)))
    const origin = 'http://127.0.0.1:' + server.address().port
    async function get(path, user) {
      const token = jwt.sign({}, process.env.JWT_SECRET, { subject: user.id })
      const response = await fetch(origin + path, {
        headers: { Authorization: 'Bearer ' + token },
      })
      return { status: response.status, data: await response.json() }
    }

    const platform = await get('/api/admin/statistics', admin)
    assert.equal(platform.status, 200)
    assert.equal(platform.data.membersWithOrganizations, 2)
    assert.equal(platform.data.membersWithoutOrganizations, 2)
    assert.equal(platform.data.totalEvents, 2)
    assert.deepEqual(platform.data.applicationStatuses, {
      approved: 1,
      denied: 1,
      pending: 1,
    })

    const organizationRows = await get('/api/admin/organizations', admin)
    assert.equal(organizationRows.status, 200)
    assert.deepEqual(
      organizationRows.data.map((organization) => ({
        name: organization.name,
        memberCount: organization.memberCount,
        collectedDues: organization.collectedDues,
        publishedEventCount: organization.publishedEventCount,
      })),
      [
        {
          name: 'First club',
          memberCount: 2,
          collectedDues: 10,
          publishedEventCount: 1,
        },
        {
          name: 'Second club',
          memberCount: 1,
          collectedDues: 4,
          publishedEventCount: 1,
        },
      ],
    )
    assert.deepEqual(
      organizationRows.data[0].events.map(
        ({ name, attendanceCount, rsvpCount }) => ({
          name,
          attendanceCount,
          rsvpCount,
        }),
      ),
      [{ name: 'Published event', attendanceCount: 1, rsvpCount: 2 }],
    )

    const organizationStats = await get(
      '/api/organizations/' + organizationA.id + '/manage/statistics',
      member,
    )
    assert.equal(organizationStats.status, 200)
    assert.equal(organizationStats.data.totalMembers, 2)
    assert.equal(organizationStats.data.paidMembers, 1)
    assert.equal(organizationStats.data.unpaidMembers, 1)
    assert.equal(organizationStats.data.currentRevenue, 10)
    assert.equal(organizationStats.data.projectedRevenue, 20)
    assert.deepEqual(organizationStats.data.eventAttendance, [
      {
        eventId: String(organizationA.events[0]._id),
        name: 'Published event',
        attendance: 1,
      },
    ])
    assert.equal(
      (
        await get(
          '/api/organizations/' + organizationA.id + '/manage/statistics',
          unpaidMember,
        )
      ).status,
      403,
    )
    assert.ok(leadB)
  },
)
