FROM python:3.11-slim

# WeasyPrint's runtime deps (Pango/GDK-Pixbuf/Cairo, which pull in gobject) —
# this is the piece that has no equivalent on native Windows.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev \
    libpango-1.0-0 libpangoft2-1.0-0 libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 libcairo2 libffi-dev \
    shared-mime-info fonts-liberation \
    tesseract-ocr poppler-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
