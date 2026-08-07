# Vet Manager

A multi-tenant practice-management system for veterinary clinics, built as a Django REST API with a React/TypeScript frontend. It covers pet owners, pets, vaccinations, medical records and clinic staff, with each clinic's data kept fully isolated from every other clinic on the same deployment.

## Overview

Vet Manager is meant to run either as a single-clinic install or as the backend for a whole clinic chain. Every account, owner, pet and record is scoped to a `ClinicGroup` at the database level, so tenants never see each other's data.

The project is split into two parts that live in the same repository:

- **`backend/`** — Django REST Framework API: auth, data model, permissions, audit history.
- **`frontend/`** — React + TypeScript client that consumes that API.

They're developed together and versioned together, but each can be run and tested independently.

## Screenshots 

### Login 
JWT authentication with access and refresh tokens, secure login flow, form validation and rate limiting on authentication endpoints.

<img width="1918" height="902" alt="image" src="https://github.com/user-attachments/assets/a09f0d0d-e717-4bfc-b9bb-e4f6237d5a95" />

### Dashboard 
Overview of the clinic with quick access to owners, pets, medical records and staff management.

<img width="1918" height="907" alt="image" src="https://github.com/user-attachments/assets/62a19f3a-a837-4a6f-a9b4-40df8f892042" />

### Pets list 
Searchable and filterable list of pets with owner information, species, breed and quick navigation to detailed records.

<img width="1917" height="910" alt="image" src="https://github.com/user-attachments/assets/65f24c07-2ac2-4f0c-956b-e427ca33348f" />

### Pet detail
Complete pet profile including owner information, vaccinations, medical history and audit trail of changes.

<img width="1917" height="906" alt="image" src="https://github.com/user-attachments/assets/8f044a4e-0b3d-4fc5-a5c6-69ad885e32be" />

### Send invitation page
Admin-only page for inviting new clinic members through secure, time-limited invitation links with role assignment.

<img width="1915" height="908" alt="image" src="https://github.com/user-attachments/assets/7daa0a42-5422-4632-97b4-d80353c877d5" />

## Features

- **Multi-tenant data model.** Owners, staff and invitations are tied to a clinic through foreign keys and unique constraints, enforced at the database layer rather than only in application code.
- **Full audit trail.** Pets, vaccinations and medical records use `django-simple-history`, so every change is versioned. History is exposed over the API via a `/history/` endpoint on each record, scoped to the caller's own clinic.
- **JWT authentication.** Access tokens expire after 15 minutes, refresh tokens after 7 days. Refresh tokens rotate on each use and are blacklisted once replaced, so a stolen refresh token has a short useful life.
- **Rate limiting on sensitive endpoints.** Login, password reset, invitation send/accept and logout each have their own throttle rate to slow down brute-force and abuse attempts.
- **Role-based access control.** Three roles — Admin, Vet, Staff — govern what each account can read, write or delete. New accounts are created through a time-limited, revocable invitation flow rather than open registration.
- **Production-aware settings.** With `DEBUG=False`, the backend automatically turns on HTTPS redirects, secure cookies, HSTS, clickjacking protection and MIME-sniffing protection. CORS and CSRF trusted origins are read from the environment instead of being left open.
- **Data integrity constraints.** Medical records use `on_delete=PROTECT` on their foreign keys, so a pet or vet can't be deleted while history still references them. Owners, clinics and medical records are soft-deleted; pets are hard-deleted and blocked by the database if dependent records exist.
- **OpenAPI schema and interactive docs**, generated with `drf-spectacular`.
- **Health check endpoint** for uptime monitoring.

## Technologies Used

**Backend**

- Django 6.0 and Django REST Framework
- PostgreSQL
- `djangorestframework-simplejwt` for JWT auth
- `drf-spectacular` for OpenAPI/Swagger documentation
- `django-simple-history` for audit trails
- `django-filter` for query filtering
- WhiteNoise for static file serving
- `django-health-check`
- pytest / pytest-django for testing
- Gunicorn for the WSGI server

**Frontend**

- React 18 with TypeScript
- Vite
- TanStack Query for server state, caching and mutation handling
- React Router 6
- react-hook-form with Zod for form validation
- Axios
- Plain CSS with a design-token file (no CSS framework or component library)
- Cypress for end-to-end tests

**Infrastructure**

- Docker and docker-compose for local orchestration of the database, API and frontend

## Project Structure

```text
vet-manager/
├── backend/
│   ├── apps/
│   │   ├── accounts/        # Users, roles, invitations, auth, password reset
│   │   ├── clinics/         # ClinicGroup and Clinic (multi-location support)
│   │   ├── owners/          # Pet owners
│   │   ├── pets/            # Pets and vaccinations
│   │   └── medical_records/ # Vet visits, diagnosis, treatment
│   │       (each app: models.py, serializers.py, views.py, urls.py, admin.py, filters.py, migrations/, tests/)
│   ├── vetmanager/          # Project settings, urls, wsgi/asgi, custom exceptions
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── api/         # HTTP client, typed resource functions, error normalization
│       ├── hooks/       # useAuth, useToast, useCooldown, useDebounce, per-resource queries
│       ├── components/  # layout, ui, forms, route guards
│       ├── pages/       # one folder per feature area
│       ├── lib/         # env, jwt decode, formatting, role capabilities, zod schemas
│       └── styles/      # tokens.css → base.css → components.css
├── postman/             # Postman collection for the API
├── docker-compose.yml
├── conftest.py
└── pytest.ini
```
## Installation

### Backend

Requires Python 3.12+ and a running PostgreSQL instance.

```bash
git clone https://github.com/[your-username]/vet-manager.git
cd vet-manager/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then fill in your own values
python manage.py migrate
python manage.py createsuperuser
```

### Frontend

Requires Node 18+ (developed on Node 22).

```bash
cd ../frontend
npm install
cp .env.example .env   # edit if the backend isn't on http://localhost:8000
```

### Docker

A `docker-compose.yml` at the repository root brings up PostgreSQL, the backend and the frontend together:

```bash
docker compose up --build
```

The database is exposed on host port `5433`, the backend on `8000`, and the frontend dev server on `5173`.

## Configuration

Both apps read their configuration from `.env` files, which are git-ignored. Copy the corresponding `.env.example` in each directory and fill in real values before running anything outside Docker.

The frontend's `VITE_API_BASE_URL` and the backend's `FRONTEND_URL` need to point at each other — the backend uses `FRONTEND_URL` to build invitation and password-reset links, so it must match wherever the frontend is actually served.

With `DEBUG=True` on the backend, CORS is opened up automatically for local development. For anything resembling production, set `DEBUG=False` and list the real frontend origin in `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS`.

## Running the Project

**Backend**

```bash
cd backend
python manage.py runserver
```

Interactive API documentation is served at `/api/docs/`. The checked-in `schema.yaml` is generated, not hand-edited — regenerate it after changing a serializer, filter or route:

```bash
python manage.py spectacular --file schema.yaml
```

**Frontend**

```bash
cd frontend
npm run dev
```

The dev server runs at `http://localhost:5173` and expects the backend to already be running on `http://localhost:8000` (or whatever `VITE_API_BASE_URL` points at).

Other frontend scripts:

| Command | What it does |
| --- | --- |
| `npm run build` | Type-checks (`tsc -b`) then builds to `dist/` |
| `npm run preview` | Serves the production build locally |
| `npm run typecheck` | Type-checking only, no build |

## API Endpoints

| Endpoint | Methods | Access |
| --- | --- | --- |
| `/api/v1/auth/login/`, `/api/v1/auth/token/refresh/` | POST | public (throttled) |
| `/api/v1/accounts/me/` | GET | any authenticated user |
| `/api/v1/accounts/users/`, `/users/{id}/` | GET / GET, PUT, PATCH, DELETE | Admin |
| `/api/v1/accounts/invitations/` | GET (list), POST (send) | Admin |
| `/api/v1/accounts/invitations/{id}/revoke/` | POST | Admin |
| `/api/v1/accounts/invitations/accept/` | POST | public (throttled) |
| `/api/v1/accounts/logout/`, `/password-reset/`, `/password-reset/confirm/` | POST | throttled |
| `/api/v1/clinics/` | GET, PUT, PATCH | read: all — write: Admin |
| `/api/v1/clinics/locations/`, `/locations/{id}/` | full CRUD | read: all — write: Admin |
| `/api/v1/owners/`, `/owners/{id}/` | full CRUD | delete: Admin |
| `/api/v1/pets/`, `/pets/{id}/` | full CRUD | delete: Admin |
| `/api/v1/pets/{id}/history/` | GET | any clinic member |
| `/api/v1/pets/vaccinations/`, `/vaccinations/{id}/` | full CRUD | delete: Admin |
| `/api/v1/pets/vaccinations/{id}/history/` | GET | any clinic member |
| `/api/v1/medical-records/`, `/medical-records/{id}/` | full CRUD | write: Vet/Admin — delete: Admin |
| `/api/v1/medical-records/{id}/history/` | GET | any clinic member |
| `/api/v1/health/` | GET | — |

A Postman collection covering these endpoints is included under `postman/`.

Note on invitations: the list endpoint never returns the invite token — it exists only in the email that was sent — which is also why listing isn't subject to the invite-send throttle; browsing shouldn't burn an admin's daily quota for actually sending invites.

## Testing

**Backend**

```bash
cd backend
pytest
```

Test configuration lives in `pytest.ini`, and shared fixtures (clinics, users per role, pending/expired invitations) are defined in `conftest.py`.

**Frontend**

End-to-end tests are written with Cypress:

```bash
cd frontend
npx cypress open   # interactive
npx cypress run    # headless
```

## Environment Variables

**Backend (`backend/.env`)**

| Variable | Purpose |
| --- | --- |
| `SECRET_KEY` | Django secret key |
| `DEBUG` | `True` for local development only, never in production |
| `ALLOWED_HOSTS` | Comma-separated list of allowed hostnames |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | PostgreSQL connection settings |
| `EMAIL_BACKEND`, `EMAIL_PORT`, `EMAIL_USE_TLS`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL` | Outgoing mail for invitations and password resets |
| `FRONTEND_URL` | Base URL of the frontend, used to build emailed links |
| `CSRF_TRUSTED_ORIGINS` | Origins allowed to make CSRF-protected requests |
| `CORS_ALLOWED_ORIGINS` | Origins allowed to call the API from a browser |

**Frontend (`frontend/.env`)**

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Base URL of the backend API |

Anything prefixed `VITE_` is inlined into the built JavaScript bundle and is public — never put a secret in a frontend environment variable.

## Future Improvements

- Appointment scheduling
- Billing and invoicing
- File attachments on medical records (lab results, x-rays)
- Analytics and dashboard endpoints
- In-app password change (currently only the emailed reset flow exists)

- Docker and docker-compose for local orchestration of the database, API and frontend
