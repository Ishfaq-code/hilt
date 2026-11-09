# Club workflow milestone

Implemented from the current `apps/backend/` and `apps/frontend/` code. Stashed and compiled legacy app code is not used. Email verification and password recovery are deliberately deferred while email delivery is blocked.

## User journeys

- Anyone can browse/search approved clubs, filter by university, paginate results, and open a stable `/clubs/ID` link without signing in.
- Students sign in to join or leave clubs. Membership persists in MongoDB, repeated joins do not duplicate members, and signing in from a shared club link preserves that destination.
- “Apply for a club” is a secondary footer action. An applicant supplies the name, description, university, contact email, and up to five external links. Pending/rejected applications are private to their applicant and site administrators.
- Applicants read clarification/rejection messages, edit, and resubmit. Review history is retained. Approved applications keep the same ID as the public club.
- Site administrators use a separate Administration view to approve, reject, or request clarification. Rejection/clarification requires an explanation. Revision checks prevent stale forms or competing reviews from overwriting each other.
- Approval atomically makes the club discoverable and adds its applicant as a member and club administrator. Club administrators can view member names, share equal management authority, and remove an equally privileged administrator. The original applicant is not a permanently protected owner. Atomic guards prevent concurrent departures/demotions from removing the last administrator.

Account and sign-in are pages at `/account`; sign-in preserves the requested destination. Member management is a page at `/clubs/ID/members`. Profile edits, review decisions, administrator-role changes, and leave confirmations use the same dialog controls. Primary navigation stays available on every page, with administration shown only to authorized site administrators. External links open in a new tab.

## University access and email deferral

The API initializes a University collection with UCF (`ucf`, `ucf.edu`) if absent. Institutions and their exact email domains are data, not hardcoded eligibility checks in each endpoint. Operators can configure additional universities without changing the club workflow code. Existing university configuration is never overwritten at startup.

Registration and nonbrowser Bearer login keep their existing contract and accept ordinary valid email addresses. Applying for or joining a club requires the signed-in account's domain to match that club's configured university. A domain match currently establishes only the claimed affiliation; ownership verification is deferred and no account is labeled verified. Contact emails can differ from the applicant's university email. No email is sent by this milestone.

For local demonstrations, register disposable `@ucf.edu` accounts with passwords of at least 15 characters. The previous `@example.com` production test account still logs in but does not qualify to apply/join a UCF club.

## Administrator provisioning

Site administration is separate from club administration. Neither registration nor profile updates can assign a site-admin flag. Site-admin authorization is read from MongoDB for every request, so revocation applies to an existing session immediately. A club administrator has no site-admin authority and no management access to other clubs.

An operator explicitly grants/revokes site-admin access to an existing password-enabled account:

```sh
cd apps/backend
MONGODB_URI=YOUR_DATABASE_URI npm run site-admin -- grant reviewer@ucf.edu
MONGODB_URI=YOUR_DATABASE_URI npm run site-admin -- revoke reviewer@ucf.edu
```

Run this against the intended database only. No default administrator, first-user elevation, email allowlist, or public role-assignment endpoint is created. Production role grants require identifying the intended account; local tests use isolated disposable accounts.

## Persistence and compatibility

`User` adds the operator-controlled `isSiteAdmin` flag (default false). Its existing safe auth response shape is unchanged. University is a new collection. The existing Organization collection, IDs, owner references, and `members[]` representation are retained. Membership and administration remain independent of future RSVP/attendance records.

Organization gains `university`, `approvalStatus`, private `contactEmail`, `links[]`, `administrators[]`, a revision counter, and embedded review entries containing actor, decision, message, time, and revision. An application and the resulting club are one document, so approval/publication/initial membership need no cross-collection transaction. `owner` retains the original applicant's provenance; `administrators[]` governs current club-management access.

Existing organizations are not automatically approved, assigned a university, or rewritten on startup. They remain hidden from discovery. For legacy records whose owners match the explicitly selected institution, an optional additive migration is available:

```sh
cd apps/backend
MONGODB_URI=YOUR_DATABASE_URI npm run migrate:clubs -- --university ucf
MONGODB_URI=YOUR_DATABASE_URI npm run migrate:clubs -- --university ucf --apply
```

The first command is a read-only preview. The second adds review metadata and puts eligible legacy records into pending review. It preserves original fields, IDs, owners, members, and all user accounts, skips missing/nonqualifying owners, and is idempotent. It never approves legacy clubs. Start the API/configure the university first. No production migration has been run as part of local development.

## API and checks

Import [the club API contract](clubs.openapi.json) and [the auth contract](auth.openapi.yaml) into SwaggerHub/Swagger Editor. The club contract covers public discovery, applications, review, membership, and administration endpoints. Private APIs return no-store responses. Application bodies are capped at 16 KiB and submissions are limited to 20 attempts per account/hour. Rate limits use process memory in this single-instance milestone.

The MongoDB integration tests use randomly named temporary databases. Run `npm test` in `apps/backend/` with `TEST_MONGODB_URI` pointing to the test MongoDB instance. Coverage includes private pending/rejected state, validation and injection boundaries, exact configurable university domains, administrator revocation, review conflicts, pagination, idempotent membership, privacy, cross-club access, leadership races, and migration preservation.

Verified locally on 9 November:

- All 41 Node test-runner tests passed in Node 22 against isolated temporary MongoDB databases. The count includes the two parent tests. Startup preserves existing university configuration as well as legacy organization data; client attempts to assign site-admin status are rejected/ignored as appropriate.
- Frontend TypeScript/Vite production build and ESLint passed.
- The browser completed application submission, clarification, rejection, both resubmissions, approval, public search, shared-link sign-in, join/leave, roster updates, shared administration, original-applicant departure, last-administrator protection, and fresh-login membership persistence. Application entry is absent from primary navigation and present in the footer. The mobile layout was checked at 390px without horizontal overflow.
- Additional browser checks passed for review-queue pagination after approving the final item on a later page, Escape closing dialogs, profile and membership persistence through a fresh login, and recovery from an invalid shared club link.

The local routing/session follow-up also passed browser checks for direct club links, `/home`, search URLs and browser history, application-edit reloads, `/admin/applications`, new tabs, profile saves, sign-out followed by Back, and expired-session prompts. Cookie login/refresh/sign-out passed through both Caddy and the Vite development proxy. Cookie-mode responses omit the raw token; browser storage contains no token. These changes were subsequently deployed and verified on 9 November 2026.

Temporary browser logs, scripts, screenshots, and fixtures have been removed after verification. The local preview is `http://127.0.0.1:63447`. The club milestone was subsequently deployed and smoke-tested under explicit approval; see [the rollout record](clubs-rollout.md). The routing/session/UI update is also deployed and verified under explicit approval.

## Scope after this milestone

Custom roles/permission sets, club profile editing, pages/editor, events/RSVP/calendar, attendance, communications, moderation/recovery, native mobile, and email verification/recovery remain subsequent work. Their controls are not displayed as nonfunctional actions. Embedded application review history is not a claim that the full PRD's audit/recovery system exists.

The earlier `docs/check-in/` diagrams capture the auth/profile checkpoint and its forecast; they are not the schema specification for this later club milestone. The models, this document, and the new API contract describe the current club implementation.
