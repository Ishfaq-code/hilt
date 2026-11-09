# Hilt instructor check-in — 9 November 2026

Team 2 is first listed for today's check-in. Upload the finished documents before presenting. No Canvas upload, submission, or push has been performed. The API/web profile update was deployed after Alexander's explicit approval; the result is recorded below.

## Diagrams

| Artifact | Readable output | Editable source |
| --- | --- | --- |
| Implemented MongoDB ERD | [SVG](erd.svg), [PNG](erd.png) | [PlantUML](erd.puml) |
| Proposed PRD relationships | [SVG](planned-erd.svg), [PNG](planned-erd.png) | [PlantUML](planned-erd.puml) |
| Gantt and delivery forecast | [SVG](gantt.svg), [PNG](gantt.png) | [PlantUML](gantt.puml) |

The [combined PDF](hilt-check-in-diagrams.pdf) contains the implemented ERD, Gantt, and proposed ERD appendix on three landscape A3 pages. The SVG files retain scalable text for slides.

The implemented ERD includes every field declared in `apps/backend/models/User.js`, `Session.js`, and `Organization.js`, plus automatic IDs, timestamps where enabled, and Mongoose version keys. It distinguishes references from embedded ID arrays. Organization exists as a model/seed; this checkout has no organization-management API. MongoDB does not enforce the diagram's reference cardinalities. The proposed ERD is a separate logical design, not an implemented schema or migration. Membership, RSVP, and attendance stay separate; page layout is embedded and event blocks refer to event records.

This review uses the active `hilt/accounts` checkout at `4d0c821` plus the existing uncommitted minimal auth UI and the local changes made today. Stashed work is preserved and excluded from claims about the implemented product. Compiled editor assets do not establish an integrated, current source implementation.

## Gantt evidence and assumptions

| Recorded milestone | Evidence |
| --- | --- |
| 22 October: scaffold, Docker, models and seed | Commits `e8edcb1`, `df69fa7`, `74b43a5`, `0eb52a7`; author Ishfaq |
| 24 October: PRD draft | Commit `74cc333`; author Alexander |
| 29 October: auth checkpoint | Commit `4d0c821`; author Alexander |
| 6 November: minimal auth UI and disposable-account demo | Existing local source changes; historical result only |
| 9 November: diagrams and profile workflow | Local tests and approved live rollout; verification results below |

Milestones indicate dated evidence, not a claim that work began or occupied the entire day. No historical hours are inferred. Future bars are proposed calendar windows, not recorded effort or commitments. The PRD explicitly leaves feature owners unassigned; future names are therefore omitted. The forecast assumes parallel work by the five-person team, agreement on a course demonstration subset, and reduced holiday capacity. The larger PRD remains visible after that demonstration rather than being represented as finished.

The course demo target of 30 November and full PRD target of 12 February are estimates for planning. They are not instructor deadlines. The [course schedule](https://docs.google.com/spreadsheets/d/1jrs6ai3QpvChMNpvXw_X75MM-Wz_YAB6e4OaF-LJDiI/edit#gid=429347037), read on 9 November, has no teams assigned in its Monday–Thursday presentation slots. Confirm the actual team presentation date and owners, then revise the forecast. The [check-in assignment](https://webcourses.ucf.edu/courses/1522264/assignments/9613144) has a Canvas placeholder due date; the [instructor announcement](https://webcourses.ucf.edu/courses/1522264/discussion_topics/8728942) requires uploading diagrams before the team's check-in.

Dependencies: agree scope before club workflows; university/account eligibility and club approval precede protected participation; club records precede events/RSVP; roles precede recovery permissions; communications and recovery must reconcile delivery history; web/mobile integration and API acceptance precede delivery. Later bars assume the course core is complete. If that slips, later estimates move too. Payments remain stretch scope and have no completion estimate.

## Profile milestone

`PATCH /api/auth/me` accepts one or both of `firstName` and `lastName`, trims them, and validates each as 1–100 characters after trimming. The authenticated session selects the user. Unknown fields are rejected atomically; this endpoint cannot change credentials, email, ID, or roles. It returns the same safe profile shape as `GET /api/auth/me`. Existing documents need no migration because this only edits existing name fields.

The signed-in UI provides Edit profile, Save profile, and Cancel. Save errors preserve entered names. Success updates the visible name from the server response. Logout and a fresh login return the persisted name. The profile update is deployed at [Hilt](https://hilt.paolini.dev/) following Alexander's approval on 9 November.

Verified on 9 November:

- Backend: 22 passing Node test-runner tests (21 named cases plus the parent test), against a randomly named database on an isolated local MongoDB instance. Passed both on the host and in the backend's Node 22 Docker image. Covers authenticated/anonymous/revoked/expired access, partial updates, malformed/oversized requests, atomic rejection of credential/ID/role changes, other-user isolation, and logout/fresh-login persistence.
- Frontend: ESLint and a production TypeScript/Vite build passed in Docker. Existing UI changes were preserved.
- Local browser at `http://127.0.0.1:63445`: real registration 201, wrong password 401, login 200, profile PATCH 200, logout 204, fresh login 200 with the edited name. Also verified whitespace validation, Cancel discarding unsaved names, 390px layout without horizontal overflow, failed-network input preservation, retry success, and final sign-out. The single network failure was deliberately injected; successful requests used the real API.
- Live site after the approved rollout: disposable account registration 201, login 200, profile PATCH 200, GET profile 200 with saved names and no password hash, logout 204, revoked-token GET 401, page reload and fresh login 200 with the persisted name, mobile editor loaded saved names, final logout 204. Anonymous profile PATCH also returned 401. These disposable-account results do not resolve the separate personal credential mismatch.
- Read-only VPS diagnosis: the reported personal account exists and has an Argon2 password hash. A read-only Argon2 comparison confirmed that the previously supplied password does not match that hash. This explains the reported invalid-credentials response; the record is neither an unknown email nor a passwordless seed account. No password or real-user record was changed. Signing in requires the matching password or a separately authorized credential-recovery action. Passwords and hashes are excluded from these artifacts.
- Diagrams: all three PlantUML sources rendered to SVG and PNG locally. Every PDF page was rendered and visually inspected; the PDF has three pages with captions and numbering.
- `git diff --check` passed. The approved rollout recreated only the API and web services. The MongoDB container and image IDs stayed unchanged, and protected Compose, Caddy, server, and existing styling files matched their pre-rollout checksums. Source backups and rollback image tags are recorded in [rollout.md](rollout.md). No pushes, Canvas uploads, credential changes, or modifications to real profile records were performed. Live checks used separately named disposable test accounts and ended signed out.

## Remaining check-in gaps

- Confirm the final presentation date, course demonstration scope, and feature owners with the team.
- Complete use case, class, and activity/sequence diagrams, slides, contribution/AI disclosure, and rehearsal. These are separate required artifacts; the ERDs and Gantt do not replace them.
- The current checkout does not demonstrate clubs/events, a mobile app, university email verification/recovery, page publishing, attendance, notifications, or administrative recovery. The Gantt forecasts this work without claiming it is complete.
- The real-account login is blocked by a confirmed mismatch between the supplied password and stored hash. The owner must use the matching password or separately authorize recovery; the successful disposable-account test does not resolve that personal credential mismatch.
- Upload materials before the check-in. No Canvas upload or submission has been performed.

## Re-render

The renderer used is the official `plantuml/plantuml:latest` image, observed as PlantUML 1.2026.9 (image digest `sha256:9b5071ab56a4192aac458ab4b0d42261c22c8109695894ae5be6013c3be6cac1`). From the repository root:

```sh
docker run --rm -v "$PWD/docs/check-in:/work" -w /work plantuml/plantuml@sha256:9b5071ab56a4192aac458ab4b0d42261c22c8109695894ae5be6013c3be6cac1 -tsvg erd.puml planned-erd.puml gantt.puml
docker run --rm -v "$PWD/docs/check-in:/work" -w /work plantuml/plantuml@sha256:9b5071ab56a4192aac458ab4b0d42261c22c8109695894ae5be6013c3be6cac1 -tpng erd.puml planned-erd.puml gantt.puml
```

After rendering PNGs, run `python3 docs/check-in/render-pdf.py` with ReportLab installed to rebuild the combined PDF.

Syntax follows the official [ERD](https://plantuml.com/ie-diagram) and [Gantt](https://plantuml.com/gantt-diagram) documentation. Rendering runs locally and does not send project data to a PlantUML server.

Temporary verification logs and screenshots were removed after use. Historical VPS paths in the rollout record describe the deployed checkout; current local source is under `apps/backend` and `apps/frontend`.
