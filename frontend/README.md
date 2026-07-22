# Vet Manager — Frontend

A production-quality web client for the **Vet Manager** Django REST API: a
multi-tenant practice-management system for veterinary clinics (owners, pets,
vaccinations, medical records, staff).

---

## Quick start

```bash
# 1. Install dependencies (Node 18+ required; developed on Node 22)
npm install

# 2. Configure the API location
cp .env.example .env       # Windows: copy .env.example .env
#   then edit .env if your backend isn't on http://localhost:8000

# 3. Run against the backend
npm run dev                # http://localhost:5173
```

The Django backend must be running separately:

```bash
cd ../vetmenager
python manage.py runserver          # http://localhost:8000
```

With `DEBUG=True` the backend sets `CORS_ALLOW_ALL_ORIGINS = True`, so the dev
server works with no extra configuration. For production builds, add your
frontend origin to `CORS_ALLOWED_ORIGINS` in the backend's `.env`.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | Type-check (`tsc -b`) then build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Types only, no build |

### Configuration

All configuration comes from environment variables at build time. **There are
no secrets in this codebase** — see `.env.example`:

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | recommended | Backend origin, no trailing slash. Defaults to `http://localhost:8000` in dev, and to the page's own origin in production. |

Anything prefixed `VITE_` is inlined into the JavaScript bundle and is public.
Never put an API key, signing key or password in one. `.env` is git-ignored;
`.env.example` is the template to copy.

**The backend must know where this app lives.** Its `FRONTEND_URL` setting is
what it builds invitation and password-reset links from, so it has to point at
this frontend (e.g. `FRONTEND_URL=http://localhost:5173`).

---

## Stack, and why

| Choice | Reason |
| --- | --- |
| **React 18 + TypeScript** | The API contract has a lot of shapes (7 resources, 3 roles, 4 enums). Types catch a mismatched field at compile time instead of in a clinic. |
| **Vite** | Fast dev server, first-class `import.meta.env` handling for build-time config, tiny config surface. |
| **TanStack Query** | This app is almost entirely server state: paginated lists, filters, cache invalidation after mutations. Query handles caching, loading/error states, and request de-duplication that would otherwise be hand-rolled in every page. |
| **React Router 6** | Two of the routes (`/invite/:token`, `/reset-password/:uid/:token`) are dictated by links the backend emails, so real URL routing is required. |
| **react-hook-form + Zod** | Uncontrolled inputs (fewer re-renders on long clinical forms) plus one schema per form that mirrors the backend's model constraints. |
| **Plain CSS with design tokens** | The design brief is restrained and typographic. A token file plus semantic class names is smaller and more legible here than a utility framework, and it keeps the Helvetica Neue Light rhythm in one place. |

No CSS framework, no component library, no state-management library — the app
doesn't need them, and every dependency is a supply-chain surface.

---

## Project structure

```
src/
├─ api/                   The only place HTTP happens
│  ├─ client.ts           axios instance, auth header, token-refresh interceptor
│  ├─ resources.ts        typed functions for every endpoint
│  ├─ types.ts            request/response types mirroring the OpenAPI schema
│  ├─ tokens.ts           JWT storage (+ the security tradeoff, documented)
│  └─ errors.ts           normalises the API's three error shapes into one
├─ hooks/
│  ├─ useAuth.tsx         session context: identity, capabilities, login/logout
│  ├─ useToast.tsx        notification region
│  ├─ useCooldown.ts      throttle (HTTP 429) countdown handling
│  ├─ useDebounce.ts      keeps search boxes from flooding the API
│  └─ queries/            one module per resource: queries + mutations + cache keys
├─ components/
│  ├─ layout/AppShell     sidebar, topbar, role-aware navigation
│  ├─ ui/                 Button, Field, Modal, Pagination, Card, states…
│  ├─ forms/              one modal form per resource
│  ├─ guards/             RequireAuth, RequireRole, RedirectIfAuthenticated
│  └─ ErrorBoundary.tsx
├─ pages/                 one folder per feature area
├─ lib/                   env, jwt decode, formatting, role capabilities, zod schemas
└─ styles/                tokens.css → base.css → components.css
```

---

## Screens

| Route | Purpose | Access |
| --- | --- | --- |
| `/login` | Sign in (username + password) | public |
| `/forgot-password` | Request a reset email | public |
| `/reset-password/:uid/:token` | Set a new password from the emailed link | public |
| `/invite/:token` | Accept an invitation, choose a password | public |
| `/` | Dashboard: counts, vaccinations due, recent visits, quick actions | all roles |
| `/owners`, `/owners/:id` | Owner CRUD, their pets | all roles (delete: Admin) |
| `/pets`, `/pets/:id` | Pet CRUD, vaccinations + records for that animal | all roles (delete: Admin) |
| `/vaccinations` | Vaccination log with due/overdue status | all roles (delete: Admin) |
| `/medical-records` | Clinical records, read + detail view | read: all · write: Vet/Admin · delete: Admin |
| `/clinics` | Clinic locations | read: all · write: Admin |
| `/settings` | Practice name, your account, API connection | read: all · rename: Admin |
| `/staff` | Team list, role changes, deactivation, invitations | Admin only |

---

## Security notes

- **No secrets in the frontend.** The only configuration is a public API URL.
- **Token storage.** The backend issues JWTs in a JSON response body and
  authenticates via the `Authorization` header; it has no cookie-auth mode, so
  httpOnly cookies aren't available. Tokens are kept in `localStorage`, and the
  XSS tradeoff that accepts is documented at the top of `src/api/tokens.ts`.
  Mitigations: 15-minute access tokens, no `dangerouslySetInnerHTML` anywhere,
  `console.*` stripped from production builds, refresh token blacklisted on
  logout.
- **Automatic refresh.** A 401 triggers one refresh and one retry. Because the
  backend rotates refresh tokens (`ROTATE_REFRESH_TOKENS` + blacklist), all
  concurrent 401s share a single in-flight refresh — otherwise the second
  request would present an already-blacklisted token and kill the session. A
  failed refresh hard-logs-out: tokens cleared, cache cleared, redirect to
  `/login`.
- **XSS.** All user-generated content is rendered as text through JSX, which
  escapes by default. There is no `dangerouslySetInnerHTML` and no `innerHTML`
  in the codebase.
- **Role checks are UX, not security.** `src/lib/permissions.ts` mirrors the
  backend's permission classes so the UI doesn't offer buttons that are
  guaranteed to 403. The backend enforces every rule independently.
- **Rate limits are respected.** Login (5/min), password reset (5/hour), invite
  accept (10/hour), invite send (20/day) and logout (10/min) are throttled
  server-side. On a 429 the UI shows a countdown and disables the submit button
  instead of retrying. Queries never auto-retry 4xx responses; mutations never
  auto-retry at all.
- **No PII or tokens logged.** Errors are normalised into a display message;
  raw error objects (which carry request bodies) are never logged, and
  production builds drop `console.*` entirely.

---

## Backend requirements

This frontend expects the backend changes made alongside it (see
`../vetmenager`). Specifically it needs:

- `GET /api/v1/accounts/me/` — the caller's own profile.
- `GET /api/v1/accounts/invitations/` — list, so revoking is reachable.
- `GET /api/v1/pets/{id}/history/`, `/pets/vaccinations/{id}/history/`,
  `/medical-records/{id}/history/` — audit trails.
- `owner_name` on Pet, `pet_name` on Vaccination and MedicalRecord, and
  `vet`/`vet_email` on MedicalRecord.
- Filters: `owner` on pets, `pet` + `next_due` on vaccinations, `pet` + `vet`
  on medical records, plus `ordering` on pets and vaccinations.

Against an older backend the app still loads, but names show as blank, the
history buttons error, and the dashboard's "due soon" panel comes back empty.

## Remaining backend behaviours worth knowing

1. **Login takes `username`, not `email`.** For invited users the backend sets
   `username = email`, so in practice an email works; the field is labelled
   accordingly.
2. **`DELETE` on a user deactivates** (`is_active = False`) rather than
   deleting; the UI calls it "Deactivate". Owners, clinics and medical records
   are soft-deleted; pets are hard-deleted and will be refused by the server if
   vaccinations or records still reference them (`on_delete=PROTECT`). The
   confirmation dialogs say which is which.
3. **There is no in-app password change.** Only the emailed reset flow exists,
   so Settings points users at it.
4. **Invitation `status` stays `"sent"` after expiry.** The list's `is_expired`
   flag is what distinguishes a live invite from a lapsed one, and the UI
   renders that rather than the raw status.
5. **The invite token is never returned by the API**, by design — it only goes
   out by email. The UI therefore cannot show or copy an invite link.

---

## Accessibility

Semantic HTML throughout (`<table>` with `<caption>` and `scope`, real
`<label>`s, `<nav>`/`<main>` landmarks), a skip-to-content link, visible focus
rings that are never removed, `aria-invalid` + `role="alert"` on field errors,
focus trapping and restoration in dialogs, `aria-live` on toasts and pagination
status, and `prefers-reduced-motion` support. Text/background pairs in
`tokens.css` meet WCAG AA at body sizes.

## Responsiveness

Desktop-first, as befits practice-management software. Below 1024px the sidebar
becomes a drawer; below 640px tables scroll horizontally inside their own
container and definition lists stack. Nothing horizontally scrolls the page
body.
