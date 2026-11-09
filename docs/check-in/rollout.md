# Profile-editing rollout

Status: deployed and verified on 9 November 2026 after Alexander explicitly approved this rollout. No push or Canvas submission occurred.

The reviewed change adds authenticated own-name editing to the existing minimal auth app. The API accepts only first/last name changes; ID, email, credentials, and roles remain outside this endpoint. No schemas, dependencies, or persisted formats change. The [OpenAPI contract](../auth.openapi.yaml) documents the endpoint. Local verification and artifacts are recorded in [README](README.md).

Executed scope:

1. Recheck `/opt/hilt` and the running API/web images. Preserve VPS-specific Compose, Caddy, environment, trust-proxy settings, and existing unrelated source changes.
2. Back up the affected source files and tag both running images for rollback. Apply the reviewed `backend/auth.js` change and the profile UI changes to the existing frontend source. Do not replace the repository wholesale or apply stashes.
3. Rebuild the API and web images using the existing production configuration. Recreate only those two services, preserving the MongoDB service and volume. Expect a brief API/web restart.
4. Check live health and repeat registration, profile save, logout, and fresh login with a separate disposable account. Do not update Alexander's name or credentials as part of verification. End signed out.
5. If checks fail, restore the backed-up source and tagged API/web images. Leave MongoDB intact. Record the rollout outcome separately from the local result.

The existing personal password mismatch is a separate issue. Deploying profile editing does not repair it. No credential reset is included in this rollout.

## Verified outcome

The production checkout remains on `03c64a9` with the existing uncommitted changes preserved. The guarded patch changed only `backend/auth.js` and `frontend/src/App.tsx`. Both source preimages were checked before application, and `git apply --check` passed.

- API image: `sha256:2f8bde2945e01efc1d6436e102f048cefa34fd8265420e54725675a19280ce85`.
- Web image: `sha256:99d63c4e8008e3e857c46d35057d889ef29fced0fd67e59a43c4d47227c4cb74`.
- MongoDB container and image IDs were unchanged. Protected files (`backend/server.js`, `frontend/Caddyfile`, `docker-compose.prod.yml`, `frontend/index.html`, and `frontend/src/index.css`) matched their original checksums after deployment.
- Health returned `{"status":"ok","mongodb":"connected"}`. There was a brief 502 during the API/web restart; health recovered and the subsequent end-to-end check passed.
- A disposable account registered, logged in, edited its own name, logged out, reloaded, and logged back in with the persisted name. The API returned the updated safe profile, the revoked token returned 401, the mobile editor showed saved values, and final logout succeeded.

The temporary local verification files were removed after use. This historical record retains the rollout outcome and VPS rollback references.

## Rollback material

VPS directory: `/opt/hilt-rollbacks/profile-20261109-9c1b3fbe`. It contains the source archive, guarded patch, before/after identities, build and restart logs. The source archive excludes environment files and database data.

Rollback image tags:

- `hilt-backend:before-profile-20261109-9c1b3fbe`
- `hilt-web:before-profile-20261109-9c1b3fbe`

If rollback is needed, restore only the two affected source files from the archive, retag those API/web images to the production image names, and recreate only API/web with the existing Compose configuration. Preserve MongoDB and unrelated source/configuration changes.
