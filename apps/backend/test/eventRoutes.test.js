const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { once } = require('node:events')
const test = require('node:test')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const Attendance = require('../models/EventAttendance')
const ClubAccess = require('../models/ClubAccess')
const { permissions } = require('../services/clubRoles')
const Rsvp = require('../models/EventRsvp')
const Membership = require('../models/Membership')
const Organization = require('../models/Organization')
const User = require('../models/User')
const app = require('../server')
const storage = require('../services/s3Service')
const { clubApplicationForm } = require('../test-support/clubApplicationForm')

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

    const [officer, student, visitor, admin] = await User.create([
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
      {
        firstName: 'Site',
        lastName: 'Admin',
        email: 'report-reviewer@example.edu',
        appRole: 'admin',
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
          type: 'Workshop',
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
    const [staffMembership] = await Membership.create([
      {
        userId: officer._id,
        organizationId: club._id,
      },
      { userId: student._id, organizationId: club._id },
    ])

    await ClubAccess.create({
      _id: club._id,
      roles: [
        { name: 'Coordinator', permissions, memberIds: [staffMembership._id] },
      ],
    })

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
      if (body !== undefined && !(body instanceof FormData))
        headers['Content-Type'] = 'application/json'
      const response = await fetch(origin + path, {
        method,
        headers,
        body: body instanceof FormData ? body : JSON.stringify(body),
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
      'accepts event reports and restricts the inbox to site admins',
      async () => {
        const path = eventPath(privateEvent, '/reports')
        const method = 'POST'
        const body = { reason: '  The event details need review.  ' }
        assert.equal((await call(path, { method, body })).status, 401)
        assert.equal(
          (await call(path, { user: visitor, method, body })).status,
          403,
        )
        assert.equal(
          (await call(path, { user: student, method, body: { reason: ' ' } }))
            .status,
          400,
        )
        assert.equal(
          (await call(path, { user: student, method, body })).status,
          201,
        )

        const inbox = '/api/admin/event-reports'
        assert.equal((await call(inbox, { user: officer })).status, 403)
        const reports = await call(inbox, { user: admin })
        assert.equal(reports.status, 200)
        assert.equal(reports.data.length, 1)
        assert.equal(reports.data[0].eventName, 'Private event')
        assert.equal(reports.data[0].clubName, 'Test club')
        assert.equal(reports.data[0].reason, 'The event details need review.')
      },
    )

    await t.test(
      'adds club reports alongside event reports in the admin inbox',
      async () => {
        const path = '/api/organizations/' + club.id + '/reports'
        const method = 'POST'
        const body = { reason: '  Please review this club.  ' }
        assert.equal((await call(path, { method, body })).status, 401)
        assert.equal(
          (await call(path, { user: student, method, body: { reason: ' ' } }))
            .status,
          400,
        )
        assert.equal(
          (await call(path, { user: student, method, body })).status,
          201,
        )

        const inbox = '/api/admin/reports'
        assert.equal((await call(inbox, { user: officer })).status, 403)
        const reports = await call(inbox, { user: admin })
        assert.equal(reports.status, 200)
        assert.ok(
          reports.data.some((report) => report.eventName === 'Private event'),
        )
        const clubReport = reports.data.find((report) => !report.eventName)
        assert.equal(clubReport.clubName, 'Test club')
        assert.equal(clubReport.reason, 'Please review this club.')
      },
    )

    await t.test(
      'saves partial drafts and only reveals the event once published',
      async () => {
        const path = '/api/organizations/' + club.id
        const draft = await call(path + '/events', {
          user: officer,
          method: 'POST',
          body: {
            status: 'draft',
            draftSchedule: { startTime: '18:00' },
            tags: ['Workshop', ' Social ', 'workshop'],
          },
        })
        assert.equal(draft.status, 201)
        assert.equal(draft.data.draftSchedule.startTime, '18:00')
        assert.deepEqual(draft.data.tags, ['Workshop', 'Social'])
        const route = path + '/events/' + draft.data._id
        assert.equal((await call(route, { user: officer })).status, 404)
        assert.ok(
          !(await call(path, { user: student })).data.events.some(
            (event) => event._id === draft.data._id,
          ),
        )
        assert.ok(
          (await call(path + '/manage/events', { user: officer })).data.some(
            (event) => event._id === draft.data._id,
          ),
        )
        assert.equal(
          (
            await call(route, {
              user: officer,
              method: 'PATCH',
              body: { status: 'published' },
            })
          ).status,
          400,
        )
        const published = await call(route, {
          user: officer,
          method: 'PATCH',
          body: {
            status: 'published',
            name: 'Draft test event',
            description: 'Description',
            place: 'Campus',
            startDatetime: new Date(now + 900_000).toISOString(),
            endDatetime: new Date(now + 1_200_000).toISOString(),
          },
        })
        assert.equal(published.status, 200)
        const { event } = (await call(route)).data
        assert.equal(event.name, 'Draft test event')
        assert.deepEqual(event.tags, ['Workshop', 'Social'])
      },
    )

    await t.test(
      'exposes legacy event types as tags and lets officers replace or clear them',
      async () => {
        const path = eventPath(future)
        assert.deepEqual((await call(path)).data.event.tags, ['Workshop'])
        const query = new URLSearchParams({
          start: new Date(now).toISOString(),
          end: new Date(now + 1_200_000).toISOString(),
        })
        const { data: calendar } = await call('/api/calendar?' + query)
        assert.deepEqual(
          calendar.find(({ event }) => event._id === future.id).event.tags,
          ['Workshop'],
        )

        const edit = { user: officer, method: 'PATCH' }
        assert.equal(
          (await call(path, { ...edit, body: { tags: 'Meeting' } })).status,
          400,
        )
        const updated = await call(path, {
          ...edit,
          body: { tags: ['Meeting', 'Social'] },
        })
        assert.equal(updated.status, 200)
        const { data: memberships } = await call('/api/memberships/mine', {
          user: student,
        })
        const event = memberships[0].organizationId.events.find(
          ({ _id }) => _id === future.id,
        )
        assert.deepEqual(event.tags, ['Meeting', 'Social'])

        assert.equal(
          (await call(path, { ...edit, body: { tags: [] } })).status,
          200,
        )
        assert.deepEqual((await call(path)).data.event.tags, [])
      },
    )

    await t.test(
      'calendar uses the requested date range and keeps memberships and RSVPs scoped to the viewer',
      async () => {
        const start = new Date(now - 900_000)
        const end = new Date(now + 1_200_000)
        const otherClub = await Organization.create({
          name: 'Calendar test club',
          events: [
            {
              name: 'Saved public event',
              startDatetime: now + 500_000,
              endDatetime: end,
            },
            {
              name: 'Unsaved public event',
              startDatetime: now + 500_000,
              endDatetime: end,
            },
            {
              name: 'Saved private event',
              startDatetime: now + 500_000,
              endDatetime: end,
              private: true,
            },
            {
              name: 'Next range',
              startDatetime: end,
              endDatetime: now + 1_800_000,
            },
          ],
        })
        const [saved, unsaved, formerMemberEvent, nextRange] = otherClub.events
        await Rsvp.create(
          [saved, formerMemberEvent].map((event) => ({
            organizationId: otherClub._id,
            eventId: event._id,
            userId: student._id,
          })),
        )

        const query =
          '/api/calendar?' +
          new URLSearchParams({
            start: start.toISOString(),
            end: end.toISOString(),
          })
        const anonymous = await call(query)
        assert.equal(anonymous.status, 200)
        assert.ok(
          anonymous.data.every(
            ({ kind, event }) => kind === 'other' && !event.private,
          ),
        )
        assert.equal(
          await call(query + '&scope=mine').then(({ status }) => status),
          401,
        )
        assert.equal(
          await call('/api/calendar?start=invalid').then(
            ({ status }) => status,
          ),
          400,
        )

        const discover = await call(query, { user: student })
        const mine = await call(query + '&scope=mine', { user: student })
        const kind = (response, event) =>
          response.data.find((entry) => entry.event._id === event.id)?.kind
        assert.equal(kind(discover, saved), 'rsvp')
        assert.equal(kind(discover, unsaved), 'other')
        assert.equal(kind(discover, privateEvent), undefined)
        assert.equal(kind(discover, past), undefined)
        assert.equal(kind(mine, saved), 'rsvp')
        assert.equal(kind(mine, unsaved), undefined)
        assert.equal(kind(mine, formerMemberEvent), undefined)
        assert.equal(kind(mine, nextRange), undefined)
        assert.equal(kind(mine, past), 'joined')
      },
    )

    await t.test(
      'discover returns filtered public events ten at a time',
      async () => {
        const pagedClub = await Organization.create({
          name: 'Pagination test club',
          tags: ['Arts'],
          assets: [
            { type: 'logo', link: '/logo.png' },
            { type: 'cover', link: '/cover.png' },
          ],
          events: [
            ...Array.from({ length: 12 }, (_, index) => ({
              name: `Public listing ${index + 1}`,
              startDatetime: now + 2_000_000 + index * 60_000,
              endDatetime: now + 2_600_000 + index * 60_000,
              tags: index < 11 ? ['Workshop'] : ['Social'],
            })),
            {
              name: 'Private listing',
              startDatetime: now + 3_000_000,
              endDatetime: now + 3_600_000,
              private: true,
              tags: ['Workshop'],
            },
          ],
        })
        const query = new URLSearchParams({
          scope: 'discover',
          club: pagedClub.id,
        })
        const first = await call('/api/calendar?' + query)
        assert.equal(first.status, 200)
        assert.equal(first.data.entries.length, 10)
        assert.equal(first.data.hasNext, true)
        assert.deepEqual(
          first.data.entries[0].club.assets.map(({ type, link }) => ({
            type,
            link,
          })),
          [{ type: 'logo', link: '/logo.png' }],
        )
        const second = await call('/api/calendar?' + query + '&page=2')
        assert.equal(second.data.entries.length, 2)
        assert.equal(second.data.hasNext, false)
        assert.ok(
          [...first.data.entries, ...second.data.entries].every(
            ({ event }) => !event.private,
          ),
        )

        const filtered = await call(
          '/api/calendar?' + query + '&eventTag=Workshop&clubTag=Arts',
        )
        assert.equal(filtered.data.entries.length, 10)
        assert.ok(
          filtered.data.entries.every(
            ({ club, event }) =>
              club._id === pagedClub.id && event.tags.includes('Workshop'),
          ),
        )
        assert.deepEqual(filtered.data.eventTags, ['Workshop', 'Social'])
      },
    )

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
        const membership = await Membership.create({
          userId: visitor._id,
          organizationId: otherClub._id,
        })
        await ClubAccess.create({
          _id: otherClub._id,
          roles: [
            { name: 'Coordinator', permissions, memberIds: [membership._id] },
          ],
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

    await t.test(
      'approval creates the submitted roles and combines permissions across assignments',
      async (t) => {
        t.mock.method(storage, 'putFile', async () => {})
        const admin = await User.create({
          firstName: 'Site',
          lastName: 'Admin',
          email: 'admin@example.edu',
          appRole: 'admin',
        })
        const roleSetup = [
          {
            name: 'Co-president',
            maxMembers: 2,
            permissions,
            assignApplicant: true,
          },
          {
            name: 'Events team',
            maxMembers: null,
            permissions: ['events'],
            assignApplicant: false,
          },
          {
            name: 'Door',
            maxMembers: 1,
            permissions: ['attendance'],
            assignApplicant: false,
          },
          {
            name: 'Roles team',
            maxMembers: null,
            permissions: ['roles'],
            assignApplicant: false,
          },
        ]
        const application = await call('/api/applications', {
          user: student,
          method: 'POST',
          body: clubApplicationForm({
            organizationName: 'Role test club',
            roleSetup,
          }),
        })
        assert.equal(application.status, 201)
        const approved = await call(
          '/api/applications/' + application.data._id,
          {
            user: admin,
            method: 'PATCH',
            body: { status: 'approved' },
          },
        )
        assert.equal(approved.status, 200)
        const clubs = (await call('/api/organizations')).data
        const created = clubs.find((item) => item.name === 'Role test club')
        assert.ok(created)
        const clubPath = '/api/organizations/' + created._id
        const permissionPath = clubPath + '/manage/permissions'
        const rolesPath = clubPath + '/roles'
        const join = (user) =>
          call('/api/memberships', {
            user,
            method: 'POST',
            body: { organizationId: created._id },
          })
        const visitorMember = (await join(visitor)).data
        const officerMember = (await join(officer)).data
        const applicant = (
          await call('/api/memberships/mine', { user: student })
        ).data.find((item) => item.organizationId._id === created._id)

        assert.deepEqual(
          (await call(permissionPath, { user: student })).data,
          permissions,
        )
        assert.deepEqual(
          (await call(permissionPath, { user: visitor })).data,
          [],
        )
        const [leader, eventsTeam, door, roleTeam] = (
          await call(rolesPath, { user: student })
        ).data
        assert.equal(leader.maxMembers, 2)
        assert.deepEqual(leader.memberIds, [applicant._id])
        assert.equal(eventsTeam.maxMembers, null)

        function assign(role, memberIds, user = student, name = role.name) {
          return call(rolesPath + '/' + role._id, {
            user,
            method: 'PUT',
            body: {
              name,
              maxMembers: role.maxMembers,
              permissions: role.permissions,
              memberIds,
            },
          })
        }

        assert.equal(
          (await assign(eventsTeam, [staffMembership.id])).status,
          400,
        )
        assert.equal(
          (await assign(door, [visitorMember._id, officerMember._id])).status,
          409,
        )
        assert.equal(
          (await assign(eventsTeam, [visitorMember._id, officerMember._id]))
            .status,
          200,
        )
        assert.equal((await assign(door, [visitorMember._id])).status, 200)
        assert.deepEqual(
          (await call(permissionPath, { user: visitor })).data.sort(),
          ['attendance', 'events'],
        )
        assert.equal(
          (
            await call(clubPath, {
              user: visitor,
              method: 'PATCH',
              body: { name: 'Unauthorized' },
            })
          ).status,
          403,
        )
        assert.equal((await call(rolesPath, { user: visitor })).status, 403)
        assert.equal(
          (await call(clubPath + '/manage/events', { user: visitor })).status,
          200,
        )

        assert.equal((await assign(roleTeam, [visitorMember._id])).status, 200)
        assert.equal(
          (await assign(leader, [applicant._id, visitorMember._id], visitor))
            .status,
          403,
        )
        assert.equal(
          (
            await assign(
              eventsTeam,
              [visitorMember._id],
              visitor,
              'Workshops team',
            )
          ).status,
          200,
        )
        const history = (await call(rolesPath + '/history', { user: admin }))
          .data
        assert.equal(history[0].after.name, 'Workshops team')
        assert.equal(
          (
            await call(rolesPath + '/history/' + history[0]._id + '/undo', {
              user: admin,
              method: 'POST',
            })
          ).status,
          204,
        )
        assert.ok(
          (await call(rolesPath, { user: admin })).data.some(
            (item) => item.name === 'Events team',
          ),
        )

        assert.equal(
          (
            await call(rolesPath + '/' + leader._id, {
              user: student,
              method: 'DELETE',
            })
          ).status,
          409,
        )
        assert.equal(
          (
            await call('/api/memberships/' + applicant._id, {
              user: student,
              method: 'DELETE',
            })
          ).status,
          409,
        )
        assert.equal(
          (await assign(leader, [applicant._id, officerMember._id])).status,
          200,
        )
        const leaving = await Promise.all([
          call('/api/memberships/' + applicant._id, {
            user: student,
            method: 'DELETE',
          }),
          call('/api/memberships/' + officerMember._id, {
            user: officer,
            method: 'DELETE',
          }),
        ])
        assert.deepEqual(leaving.map(({ status }) => status).sort(), [204, 409])
        const remaining = (await call(rolesPath, { user: admin })).data.find(
          (role) => role._id === leader._id,
        )
        assert.equal(remaining.memberIds.length, 1)
      },
    )

    await t.test(
      'converts legacy leaders when the club is first accessed',
      async () => {
        const legacyClub = await Organization.create({ name: 'Legacy club' })
        const membership = await Membership.create({
          organizationId: legacyClub._id,
          userId: officer._id,
        })
        await Membership.collection.updateOne(
          { _id: membership._id },
          { $set: { organizationRole: 'owner' } },
        )
        const rolesPath = '/api/organizations/' + legacyClub.id + '/roles'
        const result = await call(rolesPath, { user: officer })
        assert.equal(result.status, 200)
        assert.equal(result.data.length, 1)
        assert.equal(result.data[0].name, 'Club administrator')
        assert.deepEqual(result.data[0].memberIds, [membership.id])
      },
    )
  },
)
