#!/bin/sh
set -e

echo "Running database migrations..."
python manage.py migrate --noinput

echo "Seeding data..."
python manage.py seed_users

echo "Starting Django..."
exec "$@"