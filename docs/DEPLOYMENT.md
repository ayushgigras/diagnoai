# DiagnoAI — Production Deployment Guide

This guide covers deploying DiagnoAI to a production Linux server using Docker Compose, Nginx as a reverse proxy, and Let's Encrypt for HTTPS.

---

## Prerequisites

- Linux server (Ubuntu 22.04+ recommended)
- Docker Engine 24+ and Docker Compose V2
- Domain name pointing to your server's IP
- Open ports: 80 (HTTP), 443 (HTTPS)

---

## 1. Clone the Repository

```bash
git clone https://github.com/ayushgigras/diagnoai.git
cd diagnoai
```

---

## 2. Configure Environment Variables

### Backend (`backend/.env`)

```env
# === REQUIRED ===
JWT_SECRET_KEY=<generate with: openssl rand -hex 32>
ADMIN_REGISTRATION_KEY=<secure-random-string>
DATABASE_URL=postgresql://diagnoai:<db-password>@db:5432/diagnoai
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/1
GEMINI_API_KEY=<your-google-gemini-api-key>

# === OPTIONAL ===
APP_ENV=production
FRONTEND_URL=https://yourdomain.com
BACKEND_CORS_ORIGINS=["https://yourdomain.com"]
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Google OAuth (optional)
GOOGLE_CLIENT_ID=<your-google-oauth-client-id>

# SMTP for emails (optional — required for password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=<app-specific-password>
SMTP_SENDER_EMAIL=your-email@gmail.com
SMTP_USE_TLS=true
```

> [!CAUTION]
> Never commit `.env` to version control. Use a secrets manager (AWS Secrets Manager, Vault, etc.) in production.

### Frontend (`frontend/.env`)

```env
VITE_API_URL=https://yourdomain.com/api
VITE_GOOGLE_CLIENT_ID=<your-google-oauth-client-id>
```

---

## 3. Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: "3.9"

services:
  db:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_DB: diagnoai
      POSTGRES_USER: diagnoai
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U diagnoai"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: always
    volumes:
      - redis_data:/data

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: always
    env_file: ./backend/.env
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    volumes:
      - uploads:/app/uploads
    ports:
      - "8000:8000"

  worker:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: always
    command: celery -A app.celery_app.celery_app worker --loglevel=info --concurrency=2
    env_file: ./backend/.env
    depends_on:
      - redis
      - db
    volumes:
      - uploads:/app/uploads

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        VITE_API_URL: https://yourdomain.com/api
    restart: always
    ports:
      - "3000:80"

volumes:
  postgres_data:
  redis_data:
  uploads:
```

---

## 4. Docker Files

### Backend `Dockerfile`

```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN alembic upgrade head || true

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

### Frontend `Dockerfile`

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### Frontend `nginx.conf`

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # SPA routing — serve index.html for all paths
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|svg|ico|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 5. Database Migrations

Run Alembic migrations before starting the backend:

```bash
docker compose -f docker-compose.prod.yml run --rm backend alembic upgrade head
```

---

## 6. Nginx Reverse Proxy (Host)

Install Nginx on the host ([Certbot](https://certbot.eff.org/) for TLS):

```bash
sudo apt install nginx certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

`/etc/nginx/sites-available/diagnoai`:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 20M;
    }

    # WebSocket
    location /api/ws/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
    }
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}
```

---

## 7. Start Services

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 8. Monitoring & Maintenance

### View Logs

```bash
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f worker
```

### Health Check

```bash
curl https://yourdomain.com/api/health
```

### Backup Database

```bash
docker exec diagnoai-db-1 pg_dump -U diagnoai diagnoai > backup_$(date +%F).sql
```

### Update Deployment

```bash
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 9. Security Checklist

Before going live, verify:

- [ ] `JWT_SECRET_KEY` is a random 32+ character string
- [ ] `APP_ENV=production` is set (enforces CORS wildcard restriction)
- [ ] `BACKEND_CORS_ORIGINS` is set to your exact frontend domain
- [ ] `ALLOWED_HOSTS` includes only your domain
- [ ] Database password is strong and not the default
- [ ] Redis is not exposed to the internet (internal Docker network only)
- [ ] HTTPS is configured and HTTP redirects to HTTPS
- [ ] `ADMIN_REGISTRATION_KEY` is kept private
- [ ] Log rotation is configured
- [ ] Firewall only allows ports 80 and 443 from the internet

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET_KEY` | Yes | Random 32+ hex string for JWT signing |
| `ADMIN_REGISTRATION_KEY` | Yes | Secret to unlock admin registration |
| `DATABASE_URL` | Yes | Valid PostgreSQL connection string |
| `CELERY_BROKER_URL` | Yes | Redis URL for task queue |
| `CELERY_RESULT_BACKEND` | Yes | Redis URL for results |
| `GEMINI_API_KEY` | Yes | Google Gemini API for lab OCR |
| `APP_ENV` | No | `development` or `production` |
| `FRONTEND_URL` | No | Used for password reset links |
| `BACKEND_CORS_ORIGINS` | No | JSON array of allowed origins |
| `ALLOWED_HOSTS` | No | Comma-separated allowed hostnames |
| `GOOGLE_CLIENT_ID` | No | For Google OAuth sign-in |
| `SMTP_*` | No | Email settings for password reset |
| `RATELIMIT_ENABLED` | No | Set `false` to disable rate limiting |
