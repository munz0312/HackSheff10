# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (gcc needed for some python packages)
RUN apt-get update && apt-get install -y gcc && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install dependencies including uvicorn standard (for websockets)
RUN pip install --no-cache-dir -r requirements.txt "uvicorn[standard]"

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]