# Vet Manager

Vet Manager is a Django REST API for managing veterinary practices. It handles pet owners, pets, vaccinations and medical records, and is built as a multi-tenant system, meaning it can serve multiple independent clinics (or a whole clinic chain) from a single deployment without their data ever mixing.

## Why this project stands out

**Multi-tenancy done properly.** Every clinic operates within its own `ClinicGroup`. Owners, staff accounts and invitations are all scoped to a clinic at the database level (via foreign keys and unique constraints), so one clinic's data is never visible or reachable by another.

**Full audit trail.** Pets, vaccinations and medical records use `django-simple-history`, so every change to a patient's record is versioned automatically. Nothing gets silently overwritten. This matters a lot in a medical context, where you need to know who changed what and when.

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

## Testing

```bash
pytest
```

## Roadmap

- Appointment scheduling
- Billing and invoicing
- File attachments for medical records (lab results, x-rays)
- Analytics/dashboard endpoints
