# Club workflow rollout

Deployed and verified on 9 November 2026 under the user’s explicit approval. The club milestone includes discovery, private applications, site-admin review, membership, and shared club administration. Application entry appears in the footer.

Only API/web were rebuilt and restarted. MongoDB’s container and volume, existing proxy/Caddy/Compose/environment configuration, and unrelated source changes were preserved. UCF configuration/indexes were initialized without running the optional legacy-club migration. Stashed code was not used.

The identified personal account received site-administrator access. Its password was reset separately under the user’s explicit instruction, with existing sessions revoked. Global registration password requirements were preserved. No credentials are recorded in this document.

The live browser check verified applicant submission, private pending state, review/approval using the authorized personal administrator, shared-link sign-in, joining/leaving, fresh-login membership persistence, footer-only application entry, and the mobile layout. The personal administrator and two disposable accounts signed out. The synthetic club and two disposable accounts were then removed by exact IDs/names; cleanup confirmed zero remaining fixtures and retained the personal administrator.

Temporary local verification files have been removed. Source/image rollback material is retained on the VPS in `/opt/hilt-rollbacks/clubs-20261109-17ca7a6b`; rollback affects API/web only and preserves MongoDB.

Routing, cookie sessions, and the UI update were deployed and verified on 9 November 2026. Production source now lives under `apps/backend` and `apps/frontend`; production Compose settings changed only to point at those build contexts. MongoDB, existing credentials, the permanent administrator flag, university configuration, and proxy settings were preserved.

The HTTPS browser check passed registration/sign-in, the existing personal administrator login, Secure/HttpOnly cookie persistence through refreshes, application editing/review, direct club/member/account routes, profile dialogs, separate club-management permissions, mobile navigation, and sign-out followed by Back. Account is right-aligned in the shared page navigation. The disposable account and synthetic club were removed, with zero fixtures remaining.

Rollback source, image tags, build logs, source checksums, and verification results are retained on the VPS in `/opt/hilt-rollbacks/routing-ui-20261109-83159f91`. Temporary local deployment/browser files were removed after use. See [the workflow guide](clubs.md) for the current behavior.
