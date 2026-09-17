# Meridian — Phase 2 Spec: Real Application

## §1 What it is

Turn Meridian from a one-page mock (hardcoded sample timeline, no backend
calls) into a usable, multi-user application: paralegals and attorneys log
in, create cases, upload records, watch extraction run, review/verify the
generated timeline, resolve flags, and export a signed-off PDF — all wired
to the real Django API.

## §2 Goals

- Real authentication with roles (paralegal, attorney, admin).
- Case list/dashboard backed by the API.
- Case detail page driven by live data (documents, timeline, flags) — no
  more `sampleData.ts` on the real path.
- Working upload flow: pick/drop a file → stored on disk → Celery stub
  extraction runs → timeline events appear without a manual refresh.
- Review workflow: mark individual timeline events verified, attach a
  reviewer note, see case-level review progress.
- Case sign-off: gated action (attorney/admin only) that locks the case
  as complete.
- PDF export reachable from the UI, not just curl/API.

## §3 Non-goals (this phase)

- Real OCR/LLM (Textract/Bedrock) — stubs stay stubs.
- Case/paralegal assignment, workload balancing.
- Per-flag resolution state (resolving is "mark the whole event verified,"
  not "dismiss this one flag").
- Password reset / email flows, SSO.
- S3 storage (local disk `FileField` only; swap-in point already exists
  via `USE_REAL_OCR`).
- Mobile-responsive polish beyond "doesn't break."

## §4 Locked decisions

1. **Auth**: full multi-role auth now. Three roles: `paralegal`,
   `attorney`, `admin`. Implemented as a `Profile` model
   (`OneToOne` to `auth.User`) with a `role` field — not a custom
   `AUTH_USER_MODEL` swap, since the DB has no user data yet and the
   Profile approach is less invasive.
2. **Auth transport**: DRF `TokenAuthentication`. Frontend stores the
   token and sends `Authorization: Token <token>`. Chosen over session
   cookies to sidestep cross-origin CSRF plumbing between
   `localhost:3000` and `localhost:8000`.
3. **Scope**: everything end-to-end in one phase — list, live detail,
   upload, review/flag workflow, PDF export trigger.
4. **Upload**: real file storage. Add `SourceDocument.file` as a Django
   `FileField` (local disk in dev, `MEDIA_ROOT`), keep `storage_ref` as
   the OCR-service-facing pointer (set from `file.name` on save so the
   existing stub pipeline in `services/ocr.py` keeps working unchanged).
5. **Role permissions**:
   - `paralegal`: create/edit cases, upload documents, edit timeline
     events, mark events verified, add reviewer notes. Cannot sign off.
   - `attorney`: everything a paralegal can do, **plus** sign-off
     (`POST /api/cases/<id>/sign_off/`), which sets `status=complete`.
   - `admin`: everything, plus Django admin access (already exists) for
     user/role management — no new admin UI in the Next.js app this
     phase.
6. **Flag resolution model**: add `TimelineEvent.verified` (bool,
   default `False`) and `TimelineEvent.reviewer_note` (text, blank).
   Flags (`flags` JSON list) stay informational/unchanged; "resolving"
   = verifying the event, not clearing individual flags.

## §5 Data model changes

`cases/models.py`:
- New `Profile` model: `user` (OneToOne → `auth.User`), `role`
  (choices: paralegal/attorney/admin).
- `SourceDocument`: add `file = models.FileField(upload_to='documents/%Y/%m/', blank=True)`.
  `storage_ref` auto-populated from `file.name` in `save()` or the
  serializer, so `services/ocr.py` needs no changes.
- `TimelineEvent`: add `verified = models.BooleanField(default=False)`,
  `reviewer_note = models.TextField(blank=True)`.
- `Case`: add `reviewed_by` (FK → `auth.User`, null), `reviewed_at`
  (DateTimeField, null) — set by the sign-off action.

New migration on top of the `0001_initial` generated during the run
session (that migration is currently uncommitted — commit it first,
then layer `0002` on top).

## §6 Backend: auth endpoints & permissions

- `POST /api/auth/login/` — username+password → `{token, user: {id, username, role}}`.
- `POST /api/auth/logout/` — invalidate token.
- `GET /api/auth/me/` — current user + role (for frontend bootstrap).
- All existing viewsets require authentication
  (`IsAuthenticated`); write actions on `sign_off` require a custom
  `IsAttorneyOrAdmin` permission class.
- Seed data: a management command or fixture creating one user per
  role for local dev/demo (`paralegal1`, `attorney1`, `admin1`), since
  there's no self-registration.

## §7 Backend: API surface additions

- `POST /api/cases/<id>/sign_off/` — attorney/admin only. Sets
  `status=complete`, `reviewed_by=request.user`, `reviewed_at=now()`.
  Hard-blocks (400) if any `TimelineEvent` on the case is unverified —
  a signed-off case with unverified events defeats the point of the
  product.
- `PATCH /api/events/<id>/` already supports updating `verified` /
  `reviewer_note` — no new endpoint needed, just serializer fields.
- `POST /api/documents/` becomes `multipart/form-data` (file upload)
  instead of JSON.

## §8 Frontend: routes (Next.js App Router)

- `/login` — username/password form, stores token (httpOnly cookie is
  ideal but out of scope for local dev; use a client-side auth context
  backed by `localStorage` + an in-memory fetch wrapper that attaches
  the header).
- `/cases` — dashboard: table/cards of cases (claimant, firm, status,
  document/event counts, review progress %), "New Case" action, status
  filter. Default landing page after login.
- `/cases/new` — create-case form.
- `/cases/[id]` — case detail:
  - Header: claimant, firm, status badge, sign-off button (role-gated,
    disabled with a tooltip explaining why if blocked).
  - Documents panel: list with extraction status pill, upload
    control (drag-and-drop or file picker), polls or refetches after
    upload to reflect extraction progress (`pending → processing →
    complete/failed`).
  - Timeline panel: replaces `sampleData.ts` with `api.events.list({caseId})`;
    keeps the existing filter-chip UX from `Timeline.tsx`; each event
    row gains a "Mark verified" toggle + reviewer note field
    (paralegal/attorney only — read-only display otherwise... but
    there is no read-only role this phase, so just gate on
    authenticated).
  - Export PDF button → hits `api.cases.exportPdfUrl(id)`.
- Route guard: unauthenticated access to any `/cases*` route redirects
  to `/login`.

## §9 Frontend: components/lib changes

- `lib/auth.ts` (new): login/logout, token storage, `useAuth()` hook /
  context provider wrapping the app in `layout.tsx`.
- `lib/api.ts`: attach `Authorization` header from stored token to
  every request; `documents.create` switches to `FormData`; add
  `auth.login/logout/me` calls; add `cases.signOff(id)`.
- `lib/types.ts`: add `role`, `verified`, `reviewer_note`,
  `reviewed_by`, `reviewed_at`, `file` fields to match model changes.
- `components/Timeline.tsx`: extend event row with verify
  toggle/note input; keep existing filter-chip logic.
- New: `components/CaseList.tsx`, `components/UploadDropzone.tsx`,
  `components/LoginForm.tsx`.
- Delete the sample-data path from the real pages once `/cases/[id]`
  is live; `lib/sampleData.ts` can stay as fixture data for
  tests/storybook-style dev only if useful, otherwise removed.

## §10 Out of scope follow-ups (for later phases)

- Real OCR/LLM wiring.
- Case assignment / workload views.
- Per-flag (not per-event) resolution.
- Password reset, SSO, audit-log UI surfaced from `simple_history`.
- S3-backed storage, virus scanning on upload.
