# Hilt instructor check-in — 9 November 2026

Team 2 is first listed for today's check-in. Upload the finished documents before presenting. No Canvas upload, submission, or push has been performed. The API/web profile update was deployed after Alexander's explicit approval; the result is recorded below.

## Diagrams

| Artifact | Readable output | Editable source |
| --- | --- | --- |
| Implemented MongoDB ERD | [SVG](erd.svg), [PNG](erd.png) | [PlantUML](erd.puml) |
| Proposed PRD relationships | [SVG](planned-erd.svg), [PNG](planned-erd.png) | [PlantUML](planned-erd.puml) |
| Gantt and presentation delivery plan | [SVG](gantt.svg), [PNG](gantt.png) | [PlantUML](gantt.puml) |

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
| 9 November: club workflows, URL routing and cookie sessions | Commit `761b784`; local and live verification in [clubs-rollout.md](../clubs-rollout.md) |

Milestones indicate dated evidence, not a claim that work began or occupied the entire day. No historical hours are inferred. Orange bars form a proposed schedule with parallel backend, web, mobile and presentation work; they are planning estimates, not recorded completion or assigned team commitments. Email setup and roles run 9–10 November, events 9–11 November, followed by account recovery/OAuth, attendance, communications, page editing and administrative recovery. React Native work runs 10–15 November. Integration and acceptance testing run 17–18 November alongside final slides; 19 November is reserved for final fixes, release checks and rehearsal. The chart ends at the course's 20 November submission deadline. Email delivery is currently blocked; the plan assumes it is restored by 10 November.

Deadline verified on 9 November: the [Course Calendar](https://webcourses.ucf.edu/courses/1522264/pages/course-calendar) lists **MERN Project Presentations Due (11/20)**. The instructor's [2 November announcement](https://webcourses.ucf.edu/courses/1522264/discussion_topics/8720599) confirms that presentations are due **20 November 2026**, delayed by one week, and that presenting starts after Thanksgiving and continues into finals week. The calendar places those sessions in the weeks of 30 November and 7 December. The [team schedule](https://docs.google.com/spreadsheets/d/1jrs6ai3QpvChMNpvXw_X75MM-Wz_YAB6e4OaF-LJDiI/edit#gid=429347037) still has no assigned slots or dates, so Team 2's speaking time is unconfirmed. The [project assignment](https://webcourses.ucf.edu/courses/1522264/assignments/9613148) still displays 13 November and says slides must be submitted before presenting; the updated calendar and announcement supply the revised submission date. The previous 30 November and February delivery targets have been removed.

Dependencies: email delivery precedes verification/recovery and account linking; existing club records support events/RSVP, followed by attendance and communications. Roles and page editing precede administrative recovery. Feature work finishes by 16 November for web/mobile integration and API acceptance on 17–18 November. Those checks and final slides precede rehearsal and submission. Payments remain stretch scope and have no completion estimate. The [check-in announcement](https://webcourses.ucf.edu/courses/1522264/discussion_topics/8728942) separately requires diagrams to be uploaded before the team's check-in.

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

- Confirm Team 2's speaking slot and feature owners; presentation submission is due 20 November.
- Complete use case, class, and activity/sequence diagrams, slides, contribution/AI disclosure, and rehearsal. These are separate required artifacts; the ERDs and Gantt do not replace them.
- Events, a mobile app, university email verification/recovery, page publishing, attendance, notifications, and administrative recovery remain open. Club workflows and routed web access were completed later on 9 November; see [clubs-rollout.md](../clubs-rollout.md). The Gantt shows open work without claiming it is complete.
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
