# Hilt Product Requirements Draft

Draft for team review • October 24, 2026

Prepared for Alexander, Ishfaq, Lucas, Nishant, and Jacob.

Hilt is a home for university clubs: a place to give a club its own identity, publish events, help students discover where they belong, and carry an event from its first announcement through the people who show up. It takes inspiration from Knight Hacks Forge and Blade, but is designed for clubs that may not have a technical team of their own.

This scope describes the intended product, not a reduced classroom prototype. Core scope includes customizable club pages, flexible permissions, event publishing, RSVPs, optional attendance tracking, and communications across web and mobile. Payment processing is the stretch goal; its financial and operational details remain a separate scoping discussion.

The behavior below reflects the agreed direction. Items explicitly marked as open decisions or proposed defaults need team agreement before implementation.

## Product goals

A club should be able to establish its presence and run an event without assembling a website, signup form, spreadsheet, attendance tool, and mailing workflow separately. Students should be able to follow an event link, understand what is happening, and express interest with little friction.

Hilt should preserve a club's identity rather than making every organization feel like the same listing. Its permissions should also fit how clubs actually operate: officers have different titles, authority may be shared, and leadership changes from year to year.

Success means that a club can publish a distinctive, usable space; a student can join and RSVP from a phone; and officers can communicate with members and understand participation without confusing interest with attendance. RSVP conversion is a useful measurement when attendance is tracked, not a promise or an artificial target of 100 percent.

## Audience and access

University students are the primary audience, with alumni and other people who retain a qualifying university email also able to participate. Every account must be anchored to a verified university email. Verification proves control of that address; it does not establish current enrollment, university endorsement, or official recognition of a club.

Public club pages, public events, and discovery should remain browseable without an account. Signing in is required to join a club, RSVP, check in, or perform management actions. Following a shared event link should preserve the destination throughout sign-in and onboarding.

University support must not be hardcoded to UCF. The product must associate clubs and accounts with universities while supporting different institution names and email domains. A .edu suffix alone is not a sufficient universal rule.

Open decisions: the initial supported institutions and domain-verification process; whether membership across universities is unrestricted; treatment of alumni who lose access to their university address; and whether genuinely unaffiliated guests can participate without creating accounts. Anonymous participation is not currently part of the agreed account model.

## Accounts and student profiles

New users complete a short required step, followed by optional profile information that can be skipped and edited later. Account creation includes university-email verification and a recovery path. Email/password authentication is required for the course's forgotten-password flow; Google and Microsoft sign-in are intended entry points, subject to confirming university affiliation and safe account linking.

Proposed required fields are a displayable name, university, and verified university email. The precise name fields remain open. Candidate optional fields are first name, last name, nickname, pronouns, major, and birthday. The team must agree which fields have a real product use and who may see them; birthday is not a prerequisite to participation.

Profiles distinguish public identity from private account information. Email addresses, birthdays, and other private fields must not appear in public member lists or QR codes. Optional onboarding must never become a disguised requirement for joining or RSVPing.

Users can edit their profiles, manage communication preferences, and recover access. Linking or changing an authentication method must not silently create a second identity or detach existing memberships and RSVPs.

## Clubs and membership

Any eligible account can request a club. The application collects the club name, university affiliation, description, contact information, and enough links or context for a site administrator to make a lightweight judgment that it is genuine. Approval is an anti-spam and trust measure, not a formal university accreditation process.

Applications have pending, approved, and rejected states. Administrators can explain a rejection or request clarification. Proposed behavior: applicants can prepare private drafts while pending, but the club cannot appear in public discovery or publish public events until approved.

Joining an approved club is immediate. There is no membership application or officer approval queue. Students can belong to multiple clubs and leave independently. Leaving stops member-targeted communications, subject to any separate event RSVP preferences.

A club has a stable identity and shareable address, with a name, description, logo or imagery, university affiliation, links, and published pages. Officers can update club information and manage membership according to permissions.

Public and members-only events are supported. Members-only means an authenticated account has joined the club; it is not a selective admissions mechanism, because joining itself is open.

Open decisions: whether nonmembers can see a members-only event's title or listing; whether officers can remove or ban abusive members and prevent immediate rejoining; and how a suspended or archived club appears to existing members.

## Roles and leadership continuity

Roles have customizable names and permissions. President, vice president, treasurer, and secretary may be useful starting examples, but Hilt must not require that structure. A club can have one person with maximum authority or several people with equivalent authority.

Permissions should cover club settings, page editing and publishing, event management, membership management, role administration, attendance management, communications, and integrations. The API enforces permissions within the relevant club; hiding a button is not authorization. A role in one club grants no authority in another.

Leadership transitions are an explicit workflow rather than an informal exchange of credentials. Proposed behavior: an authorized officer invites or promotes a successor, the successor accepts, and the club retains a history of the change. Existing leaders can step down or be reassigned without recreating the club.

There must always be at least one active person able to administer roles and leadership. The system must prevent an accidental removal, departure, or demotion that strands the club. Site administrators provide a recovery route for abandoned clubs or disputed access.

Officers with equal full-access authority may remove or demote one another, provided at least one active full-access administrator remains. A single protected owner or a second officer's approval is not required. Role and membership changes enter the audit history and can be reversed by a site administrator through club recovery. Open decision: which invitations or leadership handoffs require the recipient's acceptance.

## Club spaces and the page editor

Each club can create one or more pages, with no product-defined maximum page count. Pages appear as tabs or equivalent navigation within a persistent club shell, so visitors can move between pages without losing the sense of being inside that club. The precise navigation and visual interaction will be developed during design.

Pages support meaningful drag-and-drop customization of their content and layout. Officers can create, rename, reorder, duplicate, draft, publish, unpublish, and remove pages. Removing a page must not silently remove the underlying events or membership records. A club must retain a usable published entry page.

The editor uses sections and columns rather than a free-positioned canvas. Officers can rearrange sections, organize content into columns, and customize text, headings, raster images, SVG graphics, links or buttons, event listings, and RSVP components. Club branding and page appearance are customizable. SVGs are treated as static design assets: scripts, unsafe external references, and other executable content must be stripped or rejected before serving. Editors can preview desktop and mobile layouts before publishing. Reordering must have keyboard-accessible alternatives to dragging.

Page editing is a web-only workflow. The student-facing result must remain usable on mobile. Draft edits must not change the live page until published; saving, validation failures, and unsaved changes must be visible.

Event information and RSVP components refer to real event records. Reusing an event across pages must not create duplicate RSVP lists or require officers to manually synchronize dates and locations.

Pages are stored as structured sections, columns, and content blocks. The published page retains the same content, branding, and layout intent on the website and mobile app, with responsive reflow for smaller screens rather than a separately designed native substitute. Raw HTML, custom CSS, and executable code remain future extension points. Open design decisions: supported column arrangements and responsive controls, embeds, and the editor's undo and version-history interface. Site-admin recovery is required separately under Audit history and club recovery.

## Events and publishing

An authorized officer creates an event from the club dashboard, enters its details and graphics, chooses public or members-only access, and customizes its presentation. Publishing produces a stable RSVP link for existing communication channels and Hilt notifications.

Required event details include a title, description, date and time with a timezone, location or online meeting destination, organizing club, and access setting. Events support draft, published, and cancelled states. Completed events remain available for history and reporting. Proposed default: editing or cancelling an event preserves its identity and RSVP history.

An event page displays its current details, graphics, organizing club, access requirements, RSVP action, and check-in state when applicable. Lists distinguish upcoming events from past or cancelled events. An officer can preview before publishing and deliberately notify affected users of material changes.

The agreed scope has no RSVP approval, waitlist, or maximum-capacity workflow. An RSVP is an expression of interest, not a reserved seat or a guaranteed commitment.

Open decisions: all-day and multi-day events, recurring events, co-hosting by multiple clubs, event-specific custom questions, and whether search engines may index public pages. These should not be implied by the basic event model.

## RSVP and calendar flow

A student follows an event link or discovers an event, signs in if necessary, and RSVPs. If the event is members-only, the student must join the club first. Membership and RSVP remain separate actions and records, even if the interface presents them conveniently together.

An RSVP is unique to a user and event. Repeated requests do not create duplicates. Students can withdraw and RSVP again while permitted. Officers can view and search the interest list and see current counts.

After RSVPing, the student sees a clear confirmation and an Add to Calendar action. Hilt offers a calendar file or supported provider links containing the current time, timezone, location, and event link. Reminder preferences should be included where supported, without promising that every calendar client imports them identically.

Proposed behavior: signing in returns the student to the event without requiring them to find it again. Joining a club does not automatically RSVP to every event. Cancelling an RSVP does not remove club membership. Event cancellation closes the RSVP action and notifies affected users.

Open decision: whether calendar changes use downloadable snapshots or subscribed feeds that can receive future event updates.

## Attendance and check in

Attendance tracking is configurable per event. When disabled, students take no attendance action and Hilt reports attendance as not tracked. It must not treat RSVPs as attendance or display an untracked event as having zero attendees.

When tracking is enabled, the product supports three explicit paths:

- A student scans the event's QR code and completes authenticated check-in.

- A signed-in student selects "I am here" on the site or mobile app. This is intentionally lax self-reporting: no code, QR scan, location check, or other proof of presence is required.

- An authorized officer scans the student's event check-in QR code at the door. Clubs that want more reliable attendance records can use this staff-recorded method instead of self-reporting.

Authorized staff can also look up a participant and correct or record attendance manually, with the acting staff member retained in the record. Check-in has an event-defined window. Its result is visible immediately to the student and the officer's attendance view.

Attendance is unique to a user and event and records its method and timestamp, keeping self-reported and staff-recorded check-ins distinguishable. A student can check in without a prior RSVP when the club allows walk-ins. Hilt preserves that distinction rather than inventing an earlier RSVP. For tracked events, reporting separates RSVPs, attendees who RSVPed, and walk-ins.

QR payloads must not expose private profile data. The server validates the event, authenticated identity, authorization, and check-in window. Repeated scans are safe. Codes must not grant club-management access.

The "I am here" action works independently of QR check-in and makes no claim to verify physical presence. Clubs choose the attendance methods appropriate for their events. Open decisions for the QR and staff workflows: static versus rotating event QR codes, whether attendee codes are global or event-specific, officer correction and reversal rules, walk-in defaults, and offline scanning.

## Discovery and student navigation

Students can browse and search clubs and upcoming public events. Listings show enough context to make a choice: club identity, university, description or category, and event timing and location. University filters should help students find relevant activity without hardwiring the platform to one campus.

A club's entry page leads into its custom tabs, upcoming events, and Join action. Students can also return to their joined clubs, RSVPs, past participation, and inbox from their account or mobile app.

Public discovery must not expose private events, unpublished pages, participant lists, private profile fields, or club-management controls. Members-only content follows the visibility decision described under Clubs and membership.

Open decisions: discovery categories, university defaults, geographic filters, and whether public membership lists exist at all.

## Communications and notifications

For students, Hilt supports email, mobile push, and an in-app inbox. For clubs, it supports Discord webhook integrations. Communication channels share the same underlying event or announcement so the product can track what was delivered without treating each channel as a different message.

The intended notification types include RSVP confirmation, scheduled event reminders, material event changes, cancellation, and club announcements. Proposed audience choices are club members, current event RSVPs, and recorded event attendees. Officers may communicate only with audiences they are authorized to manage, never the platform's entire student directory.

Users can choose applicable email and push preferences. Security messages and service-critical notices are distinguished from optional announcements. The inbox supports read and unread state and links back to the relevant club, event, or action. A denied push permission must not prevent using the app.

Officers can configure a Discord webhook, test it, and select which event or announcement types are published. Webhook secrets are kept server-side and out of public page data. Messages should respect event visibility rather than posting member-only information to a public destination by default.

Delivery must tolerate retries without duplicating successful sends, surface failures to an appropriate manager, and avoid sending reminders for cancelled events. Basic rate limits and audience previews help prevent accidental spam.

Open decisions: notification defaults, reminder timing, scheduled versus immediate announcements, per-club preference controls, Discord mention behavior, and editing or cancelling an announcement that is already queued.

## Web and mobile responsibilities

The web application supports discovery and student participation alongside club administration, event management, page editing, communications, integrations, and platform moderation.

The mobile application supports discovery, club membership, event details, RSVP, calendar handoff, check-in, notifications, and the in-app inbox. Authorized officers can create events on mobile and use the check-in tools required by the chosen door workflow. Club page editing remains exclusive to the web.

Both clients use the same identities, access rules, and authoritative backend records. They must not disagree about RSVP or attendance state. Published club pages use the same content, branding, and design on web and mobile, adapting sections and columns responsively to the available screen. Mobile must not drop page components or replace a club's design with an unrelated native layout. A shared link should reach the appropriate content in a browser and, where configured, the installed app.

React Native is the tentative mobile framework, subject to confirmation against the course's mobile requirements. The published MERN assignment and rubric require a mobile application but do not name a framework or supported operating systems. Supported platforms and mobile event-editing scope remain to be confirmed; mobile event creation is included. Published club pages retain responsive visual parity, while page editing remains web-only.

## Platform administration and trust

Site administrators review club applications with a lightweight approval interface, see the context submitted, and approve, reject, or request clarification. Approval should be described as permission to use Hilt, not official endorsement by Hilt or the university.

Administrators need a way to handle spam clubs, fake events, abuse reports, and lost leadership access. Suspension should be reversible and preserve relevant records. Club changes must have an attributable audit history that supports both undoing an individual change and restoring a club to a selected historical point. Recovery behavior is specified under Audit history and club recovery.

University-email eligibility reduces anonymous account creation but does not eliminate spam or establish trust by itself. Authorization, safe uploads, controlled outbound messages, and basic abuse controls remain necessary.

Open decisions: the initial administrators; report and appeal flows; approval notification copy; verification evidence; and retention of suspended or deleted content.

## Audit history and club recovery

Hilt maintains an attributable history of changes to each club, including its settings, pages, navigation, assets, roles, permission assignments, memberships, events, RSVPs, attendance, and integration configuration. Each entry identifies the actor, time, affected records, and the before-and-after state or recoverable reference. System-generated changes are identifiable as such. Retained history must be sufficient to restore state; a plain text list of actions is not enough.

Site administrators can inspect this history, undo an individual change, or restore the club's managed records to a chosen historical point. Recovery includes deleted pages and records, access changes, and the historical assets needed to reproduce the selected page version. The interface shows a preview of affected records, people, and permissions before confirmation, and detects changes made while the preview was open.

A point-in-time restore produces a consistent club state rather than a mixture of unrelated record versions. Individual undo must detect dependencies and conflicts with later changes instead of silently overwriting them. Restoring must not strand the club without an active administrator.

Audit history is append-only from the perspective of club officers: editing or removing a club record cannot erase the evidence. A recovery action adds a new entry describing its initiator, reason, target time or change, and effect. Later recovery can reverse that action without deleting the intervening history.

Rollback restores Hilt-managed club state, not the outside world. It cannot unsend email, push notifications, or Discord messages, remove calendar entries already imported by students, or reverse an external payment. Previously delivered communications remain recorded as delivered. Pending reminders and outbound jobs must be reconciled against the restored event state without duplicating old sends.

Global user profiles, passwords, verified identities, current user notification preferences, platform suspensions, and revoked credentials are outside a club rollback. Integration history must not reveal webhook secrets or reactivate revoked credentials; affected integrations require reconnection when appropriate.

Open decisions: history retention and storage limits; the timestamp-selection and recovery-preview interface; how dependent changes are presented during a single-action undo; and whether a restore temporarily pauses club edits. Retention and recoverability must be explicit rather than promising restoration beyond the stored history.

## Core records and boundaries

The conceptual records below establish ownership and relationships without prescribing a final database schema.

| Record | Purpose |
| --- | --- |
| University and email domain | Institution identity and supported account affiliation |
| User and verified identity | Login methods, verified university email, profile, preferences |
| Club and application | Club identity, affiliation, approval status and submitted context |
| Membership | The relationship between a user and a club |
| Role and role assignment | Club-specific permission sets and their holders |
| Page and published content | Club navigation, editable layout and published presentation |
| Event | Timing, location, access, publication status and check-in settings |
| RSVP | A user's current expression of interest in an event |
| Attendance | Recorded participation, check-in method, timestamp and corrections |
| Notification and delivery | Inbox entry, audience, scheduled send and per-channel delivery state |
| Integration | A club's configured Discord webhook and publishing settings |
| Audit entry and recoverable history | Attributable club changes, retained prior state, and individual or point-in-time recovery |

Membership, RSVP, and attendance must remain independently representable. Every club-owned record is scoped to its club, and access is checked on the server. Event components refer back to one event record regardless of how many pages display them.

Proposed data policy: collect only useful fields, keep private fields private by default, and provide an explicit retention and deletion policy. The final schema, indexing strategy, and API contracts belong to the technical design.

## Quality and acceptance

The product is ready for a complete demonstration when these journeys work across real persisted data:

1. A user verifies a qualifying university email, completes or skips optional profile fields, and can recover access.

2. A user requests a club, an administrator approves it, and the club becomes discoverable.

3. Officers create custom roles, share authority, remove an equally privileged officer when authorized, and hand leadership over without stranding the club. A site administrator can recover a mistaken or malicious access change.

4. An officer creates multiple club pages using sections and columns, includes raster images and safe SVG graphics, rearranges navigation and content, previews responsive layouts, and publishes without exposing drafts. The published pages retain their content and design on web and mobile.

5. An officer publishes a customized public event and shares its stable RSVP link.

6. A student follows the link on a phone, signs in, RSVPs once, receives confirmation, and adds the event to a calendar.

7. A members-only event enforces club membership even when accessed through a copied link.

8. Each enabled check-in method records attendance once; a walk-in remains distinguishable from someone who RSVPed.

9. A tracking-disabled event remains usable and reports attendance as not tracked.

10. Authorized officers see consistent counts, while unauthorized users cannot read or modify another club's records.

11. Event updates, cancellation, reminders, club announcements, inbox state, and configured Discord messages respect audience and preferences.

12. Failed sends, expired sessions, invalid scans, and repeated requests produce understandable, recoverable outcomes.

13. A site administrator can inspect attributable club history, preview and undo an individual change, and restore the club's managed records to a selected historical point. Recovery preserves the audit trail, does not resend past communications, and does not restore platform-banned access or globally revoked credentials.

The editor and published pages need keyboard navigation, labeled inputs, readable contrast, responsive layouts, and usable error messages. Image handling and page rendering must support the course's Lighthouse requirements. Private data, authentication secrets, webhook credentials, and draft content must not leak through public APIs or exports.

Performance and concurrency load targets remain to be agreed; no tested capacity is claimed in this PRD.

## Payments stretch goal

The first payment use cases are club dues and donations. A club may initially link to its existing collection destination, but the desired direction includes payment status or records that officers can track.

Before defining an integrated checkout, the team must establish who receives funds, whether the university controls the destination, what provider can support that arrangement, and how refunds, receipts, fees, reconciliation, and access to financial records work. A manually recorded payment and a provider-confirmed payment must be distinguishable.

Hilt should not collect or store raw card information. It must not assume that the platform can receive money on a club's behalf. External payment links are a possible first integration, not evidence that the full payments stretch goal is solved.

Payment-provider selection and financial workflows will be scoped separately. Paid tickets and capacity reservations are not part of the current event requirements.

## Course delivery requirements

The product scope above is separate from the supporting work needed for COP4331C. The assignment requires a MERN web application using JSON APIs, a mobile application, a remote database, DigitalOcean hosting, a domain name, email verification, password recovery, and at least one test per API endpoint. At least one endpoint must be demonstrated through SwaggerHub.

The presentation includes the team and contributions, technology, AI disclosure, what went well and poorly, a Gantt chart, ERD, use case diagram, class diagram, and sequence or activity diagram, plus web and mobile demonstrations and questions. The rubric lists Lighthouse targets of at least 95 for desktop performance and accessibility, and at least 95 on mobile.

Canvas lists November 13, 2026, but the assignment states the actual submission deadline follows the team's presentation date and the slides must be submitted beforehand. The instructions mention both 12 and 15 minutes; the team should confirm the allotted duration rather than build a presentation around that ambiguity.

Source: [MERN Stack Project assignment](https://webcourses.ucf.edu/courses/1522264/assignments/9613148). These are delivery obligations, not a reason to reduce the agreed product scope.

## Decisions for the next team discussion

The next discussion should resolve these design dependencies before work splits across clients:

- Page editing: supported section and column controls, responsive breakpoints, embeds, and the editor's undo/version interface. The editor is not a free-positioned canvas; raster images and safe SVG assets are supported.

- Leadership: invitation and handoff acceptance. Equal full-access officers can remove one another; site-admin recovery and preservation of at least one full-access administrator are required.

- Accounts: required name fields, Google/Microsoft support, eligible university domains, and recovery after losing a school address.

- Event access: visibility to nonmembers, cross-university participation, and walk-in defaults.

- Attendance: QR code lifecycle, staff correction permissions, walk-in defaults, and whether offline scanning is necessary. The unverified I am here action is already decided.

- Communications: defaults, reminder timing, general announcement audiences, and what reaches Discord.

- Mobile: confirm the course's framework and platform constraints, with React Native as the tentative choice; decide event editing beyond the included event-creation flow.

- Administration: initial reviewers, suspension flows, lightweight approval evidence, recovery-history retention, and the treatment of dependent changes during an individual undo.

No feature owners, delivery estimates, or team commitments are assigned here. Alexander, Ishfaq, Lucas, Nishant, and Jacob should agree responsibilities and the sequence of implementation together.
