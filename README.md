# Hilt

COP 4331 MERN

## Run with Docker

Start the Vite development server, Express API, and MongoDB:

```sh
docker compose up --build
```

The frontend is available at <http://localhost:5173>. Vite proxies requests
under `/api` to Express, which is also available at <http://localhost:3000>.
Check `http://localhost:5173/api/health` to confirm that Express is responding
and MongoDB is connected. MongoDB data is persisted in the `mongodb_data`
volume.

To stop the services, run `docker compose down`. To also remove persisted
MongoDB data, run `docker compose down --volumes`.

Seed the database with repeatable demo users and an organization:

```sh
make seed
```

This starts MongoDB if needed and upserts the same demo records on each run.

## Club workflow

The application now includes public club discovery, private club applications,
site-administrator review, join/leave, and shared club administration. “Apply for
a club” is a footer action. See [the milestone guide](docs/clubs.md) for the
complete workflow, administrator setup, university eligibility, and the optional
additive migration for legacy organizations. The [club API contract](docs/clubs.openapi.json)
is separate from the existing authentication contract.

Email delivery, verification, and recovery are deferred. UCF is the initial
configured university; applying/joining requires a configured university email
domain. The API initializes university configuration but does not rewrite or
approve legacy users/organizations. No public endpoint grants site-admin access.

## Authentication checkpoint

Import [the OpenAPI definition](docs/auth.openapi.yaml) into SwaggerHub or
Swagger Editor to review the API contract. The curl requests below demonstrate
the complete local authentication flow.

The API accepts JSON under `/api/auth`. Registration uses the existing user
fields: `firstName`, `lastName`, `emailAddress`, and `password`. Email addresses
are trimmed and lowercased; passwords are preserved exactly and must contain
15–128 characters. Names must contain 1–100 characters after trimming.

| Method | Endpoint             | Success                                                                          |
| ------ | -------------------- | -------------------------------------------------------------------------------- |
| POST   | `/api/auth/register` | `201` with a `user` containing `id`, `firstName`, `lastName`, and `emailAddress` |
| POST   | `/api/auth/login`    | `200` with `token`, `tokenType`, `expiresAt`, and `user`                         |
| GET    | `/api/auth/me`       | `200` with the current `user`; requires a session cookie or Bearer token         |
| PATCH  | `/api/auth/me`       | `200` with the saved own-name profile; requires a session cookie or Bearer token |
| POST   | `/api/auth/logout`   | `204`; revokes the current session                                               |

Start the API and database with `docker compose up --build -d backend`, then
register a new account:

```sh
curl -i http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"firstName":"Alex","lastName":"Student","emailAddress":"checkpoint@example.com","password":"my checkpoint passphrase"}'
```

Log in with the same credentials:

```sh
curl -i http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"emailAddress":"checkpoint@example.com","password":"my checkpoint passphrase"}'
```

Copy `token` from the login response into the following requests:

```sh
curl -i http://localhost:3000/api/auth/me \
  -H 'Authorization: Bearer REPLACE_WITH_TOKEN'

curl -i -X POST http://localhost:3000/api/auth/logout \
  -H 'Authorization: Bearer REPLACE_WITH_TOKEN'
```

After logout, the same `/me` request returns `401`. Registering an existing email
returns `409`; invalid input returns `400`; incorrect credentials return `401`.
Errors use `{ "error": "message" }`. Send JSON with `Content-Type:
application/json` (`415` otherwise); request bodies over 8 KiB return `413`.
Each IP gets 20 registration attempts and 20 failed login attempts per
15 minutes; exceeding a budget returns `429` with `Retry-After`.

Passwords use Argon2id with the library's default parameters, following
[OWASP's password storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
Sessions last 24 hours, persist in MongoDB, and store only a SHA-256 digest of
the random token. API responses never include password hashes. New protected
routes can use `requireSession` from `apps/backend/middleware/session.js`, which exposes the user
at `req.auth.user`. The web app requests `X-Session-Mode: cookie` at login:
its token stays in the host-only `hilt_session` cookie (HttpOnly, SameSite=Lax,
Path=/api, 24 hours), and the JSON response contains only `user` and `expiresAt`.
Cookie-mode login and authenticated writes require a matching `Origin` header.
The browser restores its account through `/api/auth/me` after navigation/reload.
Logout revokes the stored session and clears the cookie. Bearer login remains
available to nonbrowser clients.

Production cookies require HTTPS. The development Compose file explicitly sets
`SESSION_COOKIE_SECURE=false` for local HTTP; leave that override unset on HTTPS
hosting. Navigation uses `/discover`, `/clubs/:club_id`, `/home` (My clubs),
`/account`, `/apply`, `/clubs/:club_id/members`, and `/admin/applications`. Discovery searches, pagination,
and application edits also have URLs. `/` temporarily redirects to `/discover`
until the landing page is designed. `/account` contains the existing profile
controls while its final design remains deferred.

Existing users and seed records are preserved. Seed users have no passwords,
so create a new account through `/register` for the demo. This checkpoint covers
password login, registration, and own-name editing. Club participation now checks
configured university domains; email ownership verification, password recovery,
and social sign-in remain future work.
Rate limits currently use process memory; a deployment with multiple API
instances will need a shared rate-limit store and an explicit proxy trust setup.

## API tests

The integration suite sends real HTTP requests to Express and uses a uniquely
named temporary MongoDB database, which it removes afterward. It does not change
`HiltDB`. With MongoDB running:

```sh
cd apps/backend
npm ci
npm test
```

MongoDB defaults to `mongodb://127.0.0.1:27017`. Set `TEST_MONGODB_URI` to use
another MongoDB server; tests still choose their own temporary database name.
