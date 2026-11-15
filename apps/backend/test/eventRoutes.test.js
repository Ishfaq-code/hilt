const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { once } = require('node:events')
const test = require('node:test')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const Attendance = require('../models/EventAttendance')
const Rsvp = require('../models/EventRsvp')
const Membership = require('../models/Membership')
const Organization = require('../models/Organization')
const User = require('../models/User')
const app = require('../server')

const mongoUri = process.env.HILT_TEST_MONGODB_URI

test(
  'RSVP and check-in through the event API',
  { skip: !mongoUri },
  async (t) => {
    process.env.JWT_SECRET = randomUUID()
    await mongoose.connect(mongoUri, {
      dbName: 'hilt_events_test_' + randomUUID(),
    })
    t.after(async () => {
      await mongoose.connection.dropDatabase()
      await mongoose.disconnect()
    })
    await Promise.all([
      Attendance.init(),
      Rsvp.init(),
      Membership.init(),
      User.init(),
    ])

    const server = app.listen(0, '127.0.0.1')
    await once(server, 'listening')
    t.after(() => new Promise((resolve) => server.close(resolve)))
    const origin = 'http://127.0.0.1:' + server.address().port

    const [officer, student, visitor] = await User.create([
      { firstName: 'Club', lastName: 'Officer', email: 'officer@example.edu' },
      {
        firstName: 'Student',
        lastName: 'Member',
        email: 'student@example.edu',
      },
      {
        firstName: 'Campus',
        lastName: 'Visitor',
        email: 'visitor@example.edu',
      },
    ])

    const now = Date.now()
    const attendance = {
      enabled: true,
      self: true,
      eventQr: true,
      attendeeQr: true,
      walkIns: true,
    }
    const club = await Organization.create({
      name: 'Test club',
      events: [
        {
          name: 'Ongoing event',
          startDatetime: now - 60_000,
          endDatetime: now + 600_000,
          attendance,
        },
        {
          name: 'Future event',
          startDatetime: now + 600_000,
          endDatetime: now + 1_200_000,
          attendance,
        },
        {
          name: 'Private event',
          startDatetime: now + 600_000,
          endDatetime: now + 1_200_000,
          private: true,
          attendance,
        },
        {
          name: 'Untracked event',
          startDatetime: now - 60_000,
          endDatetime: now + 600_000,
        },
        {
          name: 'Past event',
          startDatetime: now - 600_000,
          endDatetime: now - 60_000,
          attendance,
        },
        {
          name: 'RSVP required',
          startDatetime: now - 60_000,
          endDatetime: now + 600_000,
          attendance: { ...attendance, walkIns: false },
        },
      ],
    })
    const [open, future, privateEvent, untracked, past, restricted] =
      club.events
    await Membership.create([
      {
        userId: officer._id,
        organizationId: club._id,
        organizationRole: 'officer',
      },
      { userId: student._id, organizationId: club._id },
    ])

    function eventPath(event, suffix = '') {
      return '/api/organizations/' + club.id + '/events/' + event.id + suffix
    }

    async function call(path, { user, method = 'GET', body, bearer } = {}) {
      const headers = {}
      if (user || bearer) {
        const token =
          bearer || jwt.sign({}, process.env.JWT_SECRET, { subject: user.id })
        headers.Authorization = 'Bearer ' + token
      }
      if (body !== undefined) headers['Content-Type'] = 'application/json'
      const response = await fetch(origin + path, {
        method,
        headers,
        body: JSON.stringify(body),
      })
      const data = response.status === 204 ? undefined : await response.json()
      return { status: response.status, data }
    }

    await t.test('guards private event details and sign-up', async () => {
      assert.deepEqual((await call(eventPath(privateEvent))).data, {
        membersOnly: true,
      })
      assert.equal(
        (await call(eventPath(privateEvent), { user: student })).data.event
          .name,
        'Private event',
      )
      const denied = await call(eventPath(privateEvent, '/rsvp'), {
        user: visitor,
        method: 'PUT',
        body: { interested: true },
      })
      assert.equal(denied.status, 403)
    })

    await t.test(
      'RSVP is unique, withdrawable, and closes when the event starts',
      async () => {
        const route = eventPath(future, '/rsvp')
        const rsvp = {
          user: student,
          method: 'PUT',
          body: { interested: true },
        }
        const repeated = await Promise.all([
          call(route, rsvp),
          call(route, rsvp),
        ])
        assert.ok(repeated.every((result) => result.status === 200))
        assert.equal(
          (await call(eventPath(future, '/attendance'), { user: officer })).data
            .rsvps,
          1,
        )
        await call(route, { ...rsvp, body: { interested: false } })
        assert.equal(
          (await call(eventPath(future, '/participation'), { user: student }))
            .data.rsvped,
          false,
        )
        assert.equal((await call(eventPath(open, '/rsvp'), rsvp)).status, 409)
      },
    )

    await t.test(
      'enforces whether and when attendee check-in is open',
      async () => {
        const self = { user: student, method: 'POST', body: { method: 'self' } }
        for (const event of [future, past, untracked, restricted]) {
          assert.equal(
            (await call(eventPath(event, '/check-in'), self)).status,
            409,
          )
        }
        const first = await call(eventPath(open, '/check-in'), self)
        assert.equal(first.status, 200)
        assert.equal(first.data.method, 'self')
        assert.equal(first.data.hadRsvp, false)
        assert.deepEqual(await call(eventPath(open, '/check-in'), self), first)
        const result = await call(eventPath(untracked, '/attendance'), {
          user: officer,
        })
        assert.deepEqual(result.data, { tracked: false, rsvps: 0, people: [] })
      },
    )

    await t.test(
      'validates event QR codes and rejects QR credentials as login tokens',
      async () => {
        const codeRoute = eventPath(open, '/check-in-code')
        assert.equal((await call(codeRoute, { user: student })).status, 403)
        const { code } = (await call(codeRoute, { user: officer })).data
        const scanned = {
          user: visitor,
          method: 'POST',
          body: { method: 'event-qr', code },
        }
        assert.equal(
          (await call(eventPath(restricted, '/check-in'), scanned)).status,
          400,
        )
        assert.equal(
          (await call(eventPath(open, '/check-in'), scanned)).data.method,
          'event-qr',
        )
        assert.equal(
          (await call('/api/users/me', { bearer: code })).status,
          401,
        )
      },
    )

    await t.test(
      'lets staff search and record or correct attendance outside the event window',
      async () => {
        const route = eventPath(future, '/attendance')
        const denied = await call(route + '?q=student', { user: student })
        assert.equal(denied.status, 403)

        const results = await call(route + '?q=Student%20Member', {
          user: officer,
        })
        assert.deepEqual(
          results.data.people.map((person) => person.email),
          ['student@example.edu'],
        )
        const literal = await call(route + '?q=' + encodeURIComponent('[.*'), {
          user: officer,
        })
        assert.deepEqual(literal.data.people, [])

        await call(eventPath(future, '/rsvp'), {
          user: student,
          method: 'PUT',
          body: { interested: true },
        })
        const checkIn = await call(route, {
          user: officer,
          method: 'POST',
          body: { userId: student.id },
        })
        assert.equal(checkIn.data.method, 'staff-manual')
        assert.equal(checkIn.data.hadRsvp, true)
        assert.equal((await call(route, { user: officer })).data.withRsvp, 1)

        const { code, attendee } = (
          await call('/api/users/me/check-in-code', { user: student })
        ).data
        assert.deepEqual(attendee, {
          name: 'Student Member',
          email: 'student@example.edu',
        })
        const scanned = { user: officer, method: 'POST', body: { code } }
        assert.equal(
          (await call(eventPath(past, '/attendance'), scanned)).data.method,
          'attendee-qr',
        )
        const correction = await call(route + '/' + student.id, {
          user: officer,
          method: 'DELETE',
        })
        assert.equal(correction.status, 204)
        const participation = await call(eventPath(future, '/participation'), {
          user: student,
        })
        assert.deepEqual(participation.data, { rsvped: true, checkIn: null })
      },
    )

    await t.test(
      'keeps attendance and event codes scoped to the club',
      async () => {
        const otherClub = await Organization.create({
          name: 'Other club',
          events: [open.toObject()],
        })
        await Membership.create({
          userId: visitor._id,
          organizationId: otherClub._id,
          organizationRole: 'officer',
        })
        const otherEvent =
          '/api/organizations/' + otherClub.id + '/events/' + open.id
        const result = await call(otherEvent + '/attendance', { user: visitor })
        assert.equal(result.data.walkIns, 0)

        const { code } = (
          await call(eventPath(open, '/check-in-code'), { user: officer })
        ).data
        const scanned = await call(otherEvent + '/check-in', {
          user: visitor,
          method: 'POST',
          body: { method: 'event-qr', code },
        })
        assert.equal(scanned.status, 400)
      },
    )
  },
)
