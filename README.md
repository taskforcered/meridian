# Meridian

Meridian is an AI-assisted medical-record review platform for personal-injury and mass-tort plaintiff firms. It ingests raw medical records in any format — scanned/OCR PDFs, CCDA, FHIR, DICOM imaging-report text — and produces a cited, chronological injury/causation timeline with flagged items (pre-existing conditions, record conflicts, treatment gaps) for a human reviewer (paralegal or legal nurse consultant) to verify and sign off on before the timeline is used in a demand letter or claim file. The beachhead customer is mid-size personal-injury/mass-tort plaintiff firms currently paying for offshore chart review.

**Clean-room notice:** This codebase was built from scratch. No code from any other repository was copied, adapted, or referenced during implementation.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11+, Django 4.2, Django REST Framework |
| Async jobs | Celery 5, Redis broker |
| Database | PostgreSQL 16 |
| Audit trail | django-simple-history (immutable, diffable snapshots) |
| PDF export | WeasyPrint |
| Frontend | Next.js 14 (App Router), React, Tailwind CSS, TypeScript |
| OCR (stubbed) | AWS Textract — swap `USE_REAL_OCR=True` + AWS credentials to enable |
| LLM (stubbed) | Anthropic Claude via AWS Bedrock — swap `USE_REAL_LLM=True` to enable |

---

## Quick start

### Prerequisites

- Docker + Docker Compose
- Python 3.11+
- Node.js 18+

### 1 — Start Postgres and Redis

```bash
docker-compose up -d
```

Wait for both services to report healthy (`docker-compose ps`).

### 2 — Backend setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS / Linux:
# source .venv/bin/activate

pip install -r requirements.txt

# Copy local env config (review values if needed)
copy .env.example .env        # Windows
# cp .env.example .env        # macOS/Linux

# Apply database migrations
python manage.py migrate

# (Optional) Create a Django admin superuser
python manage.py createsuperuser

# Start the development server
python manage.py runserver
```

- Django admin: http://localhost:8000/admin/
- DRF API root: http://localhost:8000/api/

### 3 — Celery worker

In a **separate terminal** (same virtualenv, same `backend/` directory):

```bash
celery -A meridian worker -l info
```

The stub `extract_document` task will be called automatically whenever a `SourceDocument` is created via the API.

### 4 — Frontend

```bash
cd frontend
npm install
npm run dev
```

Next.js app: http://localhost:3000

The mock timeline page renders sample data with client-side filter chips — no backend connection required for this initial view.

---

## PDF export

After creating a Case and at least one TimelineEvent (via the admin or API):

```bash
# Management command — writes case_<id>.pdf to the current directory
python manage.py export_pdf 1

# Or specify an output path
python manage.py export_pdf 1 --output /tmp/jane_doe_timeline.pdf
```

Or via the REST API:

```
GET /api/cases/<id>/export_pdf/
```

> **Windows note:** WeasyPrint requires GTK/Cairo runtime libraries.
> See the [WeasyPrint installation guide](https://doc.courtbouillon.org/weasyprint/stable/first_steps.html)
> for platform-specific setup. On Windows, install the
> [GTK3 runtime for Windows](https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer).

---

## Environment variables (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `DJANGO_SECRET_KEY` | local dev value | Change before any production use |
| `DJANGO_DEBUG` | `True` | Set `False` in production |
| `DATABASE_URL` | `postgres://meridian:meridian@localhost:5432/meridian` | Matches docker-compose defaults |
| `CELERY_BROKER_URL` | `redis://localhost:6379/0` | Redis broker |
| `CELERY_RESULT_BACKEND` | `redis://localhost:6379/0` | Redis result store |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | Allowed frontend origins |
| `USE_REAL_OCR` | `False` | `True` → AWS Textract (needs AWS creds + `AWS_S3_BUCKET`) |
| `USE_REAL_LLM` | `False` | `True` → Bedrock Claude (needs AWS creds + `BEDROCK_MODEL_ID`) |

---

## API endpoints (v0)

```
GET/POST   /api/cases/
GET/PATCH/DELETE /api/cases/<id>/
GET        /api/cases/<id>/export_pdf/

GET/POST   /api/documents/
GET/PATCH/DELETE /api/documents/<id>/

GET/POST   /api/events/          ?case=<id>  &flag=causation_relevant
GET/PATCH/DELETE /api/events/<id>/
```

---

## Project layout

```
Meridian/
├── backend/
│   ├── cases/             Django app — models, views, tasks, PDF
│   ├── services/          OCR + LLM integration stubs
│   ├── templates/pdf/     WeasyPrint HTML template
│   ├── meridian/          Django project (settings, celery, urls)
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── app/               Next.js App Router pages
│   ├── components/        React components
│   └── lib/               API client, types, sample data
├── docker-compose.yml
├── .gitignore
└── README.md
```
