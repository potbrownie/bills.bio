# Bill's agent API — Docker image for Linux deployment
FROM python:3.11-slim

WORKDIR /app

# Non-root user
RUN groupadd --gid 1000 appuser \
    && useradd --uid 1000 --gid appuser --shell /bin/bash --create-home appuser

# Dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application
COPY main.py .
COPY agent/ agent/
COPY tools/ tools/
COPY db/ db/
COPY extractors/ extractors/
COPY data/ data/
COPY logging_config.py .

RUN chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

ENV PYTHONUNBUFFERED=1

# Health check (optional; ensure server is up before checking)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
