import os
from pathlib import Path
import environ

BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env()
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

SECRET_KEY = env('DJANGO_SECRET_KEY', default='local-dev-only-change-me')

DEBUG = env.bool('DJANGO_DEBUG', default=False)

ALLOWED_HOSTS = env.list('DJANGO_ALLOWED_HOSTS', default=['localhost', '127.0.0.1'])

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'simple_history',
    'cases',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'simple_history.middleware.HistoryRequestMiddleware',
]

ROOT_URLCONF = 'meridian.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'meridian.wsgi.application'

DATABASES = {
    'default': env.db(
        'DATABASE_URL',
        default='postgres://meridian:meridian@localhost:5432/meridian',
    )
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Bulk upload sends files in client-side batches well under this, but keep
# headroom above Django's default of 100 for an unusually large single batch.
DATA_UPLOAD_MAX_NUMBER_FILES = 300

CELERY_BROKER_URL = env('CELERY_BROKER_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = env('CELERY_RESULT_BACKEND', default='redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TASK_TRACK_STARTED = True

CORS_ALLOWED_ORIGINS = env.list(
    'CORS_ALLOWED_ORIGINS',
    default=['http://localhost:3000'],
)

# Feature flags — all default to False so the project runs with zero external
# credentials out of the box. USE_REAL_OCR/USE_REAL_LLM are the AWS Textract/
# Bedrock path (unwired). USE_LOCAL_OCR/USE_ANTHROPIC_LLM are checked first
# and need no cloud account: Tesseract runs inside this container, and the
# Anthropic API just needs ANTHROPIC_API_KEY.
USE_REAL_OCR = env.bool('USE_REAL_OCR', default=False)
USE_REAL_LLM = env.bool('USE_REAL_LLM', default=False)
USE_LOCAL_OCR = env.bool('USE_LOCAL_OCR', default=False)
USE_ANTHROPIC_LLM = env.bool('USE_ANTHROPIC_LLM', default=False)
ANTHROPIC_API_KEY = env('ANTHROPIC_API_KEY', default='')
ANTHROPIC_MODEL = env('ANTHROPIC_MODEL', default='claude-opus-5')
