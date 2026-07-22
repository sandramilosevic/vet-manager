# Vet Manager

Vet Manager is a Django REST API for managing veterinary practices. It handles pet owners, pets, vaccinations and medical records, and is built as a multi-tenant system, meaning it can serve multiple independent clinics (or a whole clinic chain) from a single deployment without their data ever mixing.

## Why this project stands out

**Multi-tenancy done properly.** Every clinic operates within its own `ClinicGroup`. Owners, staff accounts and invitations are all scoped to a clinic at the database level (via foreign keys and unique constraints), so one clinic's data is never visible or reachable by another.

**Full audit trail.** Pets, vaccinations and medical records use `django-simple-history`, so every change to a patient's record is versioned automatically. Nothing gets silently overwritten. This matters a lot in a medical context, where you need to know who changed what and when. Those versions are readable over the API at `/history/` on each record, scoped to the caller's clinic exactly like the record itself.

**Security-conscious authentication.** Auth is handled with JWT (`djangorestframework-simplejwt`):
- Access tokens expire after 15 minutes, refresh tokens after 7 days
- Refresh tokens rotate on every use and old ones get blacklisted, so a leaked refresh token can't be reused indefinitely
- Login is throttled to 5 attempts per minute, and separate throttle rates exist for invitations, password resets and logout, to blunt brute-force and abuse attempts
- Password reset and invite-accept flows are token-based and time-limited

**Production-hardened settings, not just development defaults.** When `DEBUG` is off, the app automatically enforces HTTPS redirects, secure cookies, HSTS, clickjacking protection and MIME-sniffing protection. CORS and CSRF trusted origins are explicit and environment-driven rather than left wide open.

**Sane data modeling.** Things like unique email-per-clinic constraints, protected foreign keys on medical records (so a pet or vet can't be deleted out from under a medical history), and validation on birth date consistency show the data model was actually thought through, not just scaffolded.

**Role-based access.** Staff accounts are Admin, Vet or Staff, assigned through an invite flow with expiry and revocation, rather than open self-registration.

## Tech stack

- Django 6.0 + Django REST Framework
- PostgreSQL
- JWT authentication (djangorestframework-simplejwt)
- drf-spectacular for OpenAPI/Swagger documentation
- django-simple-history for audit trails
- django-filter for querying/filtering
- WhiteNoise for static file serving
- django-health-check for a health endpoint
- pytest for testing

## Project structure

```
vet-manager/
├── apps/
│   ├── accounts/          # Users, roles, invitations, auth, password reset
│   ├── clinics/           # ClinicGroup and Clinic (multi-location support)
│   ├── owners/             # Pet owners
│   ├── pets/                # Pets and vaccinations
│   └── medical_records/     # Vet visits, diagnosis, treatment
│       (each app: models.py, serializers.py, views.py, urls.py, admin.py, filters.py, migrations/, tests/)
├── vetmanager/             # Project settings, urls, wsgi/asgi, custom exceptions
├── postman/                # Postman collection for the API
├── manage.py
└── requirements.txt
```

## Getting started

Requires Python 3.12+ and a running PostgreSQL instance.

```bash
git clone https://github.com/sandramilosevic/vet-manager.git
cd vet-manager
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then fill in your own values
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Once running, interactive API documentation is available at `/api/docs/`.

The checked-in `schema.yaml` is generated, not hand-edited. Regenerate it after
changing any serializer, filter or route:

```bash
python manage.py spectacular --file schema.yaml
```

## Endpoint reference

| Endpoint | Methods | Access |
| --- | --- | --- |
| `/api/v1/auth/login/` · `/auth/token/refresh/` | POST | public (throttled) |
| `/api/v1/accounts/me/` | GET | any authenticated user |
| `/api/v1/accounts/users/` · `/users/{id}/` | GET · GET/PUT/PATCH/DELETE | Admin |
| `/api/v1/accounts/invitations/` | GET (list) · POST (send) | Admin |
| `/api/v1/accounts/invitations/{id}/revoke/` | POST | Admin |
| `/api/v1/accounts/invitations/accept/` | POST | public (throttled) |
| `/api/v1/accounts/logout/` · `/password-reset/` · `/password-reset/confirm/` | POST | see throttles |
| `/api/v1/clinics/` | GET · PUT/PATCH | read: all · write: Admin |
| `/api/v1/clinics/locations/` · `/locations/{id}/` | full CRUD | read: all · write: Admin |
| `/api/v1/owners/` · `/owners/{id}/` | full CRUD | delete: Admin |
| `/api/v1/pets/` · `/pets/{id}/` | full CRUD | delete: Admin |
| `/api/v1/pets/{id}/history/` | GET | any clinic member |
| `/api/v1/pets/vaccinations/` · `/vaccinations/{id}/` | full CRUD | delete: Admin |
| `/api/v1/pets/vaccinations/{id}/history/` | GET | any clinic member |
| `/api/v1/medical-records/` · `/medical-records/{id}/` | full CRUD | write: Vet/Admin · delete: Admin |
| `/api/v1/medical-records/{id}/history/` | GET | any clinic member |
| `/api/v1/health/` | GET | — |

Listing invitations is safe because the response never includes the invite
token: it exists only in the email that was sent. That is also why the list is
not covered by the `invite-send` throttle — browsing must not burn an admin's
daily quota for actually sending invitations.

## Testing

```bash
pytest
```

## Roadmap

- Appointment scheduling
- Billing and invoicing
- File attachments for medical records (lab results, x-rays)
- Analytics/dashboard endpoints
