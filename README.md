# Vet Manager

A multi-tenant practice-management system for veterinary clinics. Covers owners, pets, vaccinations, medical records and clinic staff, with each clinic's data isolated at the database level.

![CI](https://github.com/sandramilosevic/vet-manager/actions/workflows/tests.yml/badge.svg)

## Overview

Runs as a single-clinic install or as the backend for a whole clinic chain: every account, owner, pet and record is scoped to a `ClinicGroup`, so tenants never see each other's data.

- `backend/`: Django REST Framework API, auth, data model, permissions, audit history.
- `frontend/`: React + TypeScript client.

Developed and versioned together, but each can be run and tested independently.

## Features

- **Multi-tenant model**: enforced at the DB level via `ClinicGroup` foreign keys and unique constraints.
- **Full audit trail**: `django-simple-history` on pets, vaccinations and medical records, exposed via `/history/`.
- **JWT auth**: 15-min access / 7-day refresh, refresh tokens rotate and blacklist on use.
- **Rate limiting**: login, password reset, invitations, logout each throttled separately.
- **RBAC**: Admin / Vet / Staff roles; accounts created only through invitations, no open registration.
- **Production-aware settings**: `DEBUG=False` auto-enables HTTPS redirect, secure cookies, HSTS, clickjacking/MIME protection; CORS/CSRF origins from env.
- **Data integrity**: medical records use `PROTECT` FKs; owners/clinics/records soft-deleted, pets hard-deleted (blocked if dependents exist).
- OpenAPI schema + interactive docs (`drf-spectacular`), health check endpoint.

## Tech Stack

**Backend:** Django 6.0, DRF, PostgreSQL, `djangorestframework-simplejwt`, `drf-spectacular`, `django-simple-history`, `django-filter`, WhiteNoise, `django-health-check`, pytest, Gunicorn.

**Frontend:** React 18, TypeScript, Vite, TanStack Query, Cypress.

**Infra:** Docker, Docker Compose.

## Project Structure

```
vet-manager/
├── backend/
│   ├── apps/
│   │   ├── accounts/        # Users, roles, invitations, auth, password reset
│   │   ├── clinics/         # ClinicGroup and Clinic (multi-location)
│   │   ├── owners/
│   │   ├── pets/             # Pets and vaccinations
│   │   └── medical_records/
│   ├── vetmanager/           # Settings, urls, wsgi/asgi
│   └── manage.py
├── frontend/                 # React + TypeScript client
├── .github/workflows/         # CI (pytest + Cypress)
├── postman/
└── docker-compose.yml
```

## Installation

### Backend

Requires Python 3.12+ and PostgreSQL.

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in your own values
python manage.py migrate
python manage.py createsuperuser
```

### Frontend

Requires Node 18+.

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Runs at `http://localhost:5173`, expects the backend at `VITE_API_BASE_URL`.

### Docker

```bash
docker compose up --build
```

DB on host port 5433, backend on 8000, frontend dev server on 5173.

## Configuration

Both apps read `.env` (git-ignored), copy each `.env.example` before running outside Docker.

`VITE_API_BASE_URL` (frontend) and `FRONTEND_URL` (backend) must point at each other: the backend uses `FRONTEND_URL` to build invitation/password-reset links.

With `DEBUG=True`, CORS opens automatically for local dev. In production, set `DEBUG=False` and list the real frontend origin in `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS`.

## Running the Backend

`python manage.py runserver`, API docs at `/api/docs/`. Regenerate the schema after changing a serializer/filter/route:

```bash
python manage.py spectacular --file schema.yaml
```

## Testing

**Backend:**
```bash
cd backend
pytest
```
Config in `pytest.ini`; shared fixtures (clinics, users per role, invitations) in `conftest.py`.

**Frontend (Cypress e2e):**
```bash
cd frontend
npx cypress run
```

**CI:** every push/PR runs the backend test suite and the full Cypress suite via GitHub Actions (`.github/workflows/`). Merges require both to pass.

## API Endpoints

| Endpoint | Methods | Access |
|---|---|---|
| `/api/v1/auth/login/`, `/auth/token/refresh/` | POST | public (throttled) |
| `/api/v1/accounts/me/` | GET | any authenticated user |
| `/api/v1/accounts/users/`, `/users/{id}/` | GET / GET,PUT,PATCH,DELETE | Admin |
| `/api/v1/accounts/invitations/` | GET, POST | Admin |
| `/api/v1/accounts/invitations/{id}/revoke/` | POST | Admin |
| `/api/v1/accounts/invitations/accept/` | POST | public (throttled) |
| `/api/v1/accounts/logout/`, `/password-reset/`, `/password-reset/confirm/` | POST | throttled |
| `/api/v1/clinics/` | GET, PUT, PATCH | read: all, write: Admin |
| `/api/v1/clinics/locations/`, `/locations/{id}/` | full CRUD | read: all, write: Admin |
| `/api/v1/owners/`, `/owners/{id}/` | full CRUD | delete: Admin |
| `/api/v1/pets/`, `/pets/{id}/` | full CRUD | delete: Admin |
| `/api/v1/pets/{id}/history/` | GET | any clinic member |
| `/api/v1/pets/vaccinations/`, `/vaccinations/{id}/` | full CRUD | delete: Admin |
| `/api/v1/pets/vaccinations/{id}/history/` | GET | any clinic member |
| `/api/v1/medical-records/`, `/medical-records/{id}/` | full CRUD | write: Vet/Admin, delete: Admin |
| `/api/v1/medical-records/{id}/history/` | GET | any clinic member |
| `/api/v1/health/` | GET | - |

Postman collection under `postman/`.

> Invitation list never returns the invite token (email-only), so listing isn't subject to the invite-send throttle.

## Environment Variables

**Backend (`backend/.env`)**

| Variable | Purpose |
|---|---|
| `SECRET_KEY` | Django secret key |
| `DEBUG` | `True` for local dev only |
| `ALLOWED_HOSTS` | Comma-separated allowed hostnames |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | PostgreSQL connection |
| `EMAIL_BACKEND`, `EMAIL_PORT`, `EMAIL_USE_TLS`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL` | Outgoing mail |
| `FRONTEND_URL` | Base URL for emailed links |
| `CSRF_TRUSTED_ORIGINS`, `CORS_ALLOWED_ORIGINS` | Allowed origins |

**Frontend (`frontend/.env`)**

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Base URL of the backend API |

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
