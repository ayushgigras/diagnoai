# DiagnoAI — Heroku Deployment Guide

This guide provides a comprehensive walkthrough for deploying **DiagnoAI** (FastAPI backend + Celery worker + PostgreSQL + Redis + React frontend) to Heroku.

---

## 🚀 Recommended Deployment Method: Heroku Container (Docker)

Because DiagnoAI uses machine learning libraries (`torch`, `torchxrayvision`, `easyocr`) and native system packages (`tesseract-ocr`, `libgl1`), **Heroku Container (Docker)** is the recommended deployment method. It bypasses Heroku's 500MB slug size limit and guarantees all system dependencies are installed properly.

---

## Option 1: Deploy Using Heroku CLI (Fastest & Most Reliable)

### 1. Prerequisites
- [Heroku CLI installed](https://devcenter.heroku.com/articles/heroku-cli#install-the-heroku-cli)
- Docker Desktop installed and running
- A free or paid Heroku account

### 2. Log in to Heroku & Container Registry
```bash
heroku login
heroku container:login
```

### 3. Create Heroku App
```bash
heroku create diagnoai-api
```
*(Replace `diagnoai-api` with your preferred unique app name)*

### 4. Attach PostgreSQL and Redis Add-ons
```bash
heroku addons:create heroku-postgresql:essential-0 -a diagnoai-api
heroku addons:create heroku-redis:mini -a diagnoai-api
```

### 5. Set Environment Variables (Config Vars)
```bash
heroku config:set -a diagnoai-api \
  APP_ENV=production \
  JWT_SECRET_KEY=$(openssl rand -hex 32) \
  ADMIN_REGISTRATION_KEY=$(openssl rand -hex 16) \
  GEMINI_API_KEY="your-google-gemini-api-key" \
  ALLOWED_HOSTS=".herokuapp.com,localhost,127.0.0.1" \
  BACKEND_CORS_ORIGINS='["https://diagnoai-frontend.vercel.app","https://diagnoai-api.herokuapp.com"]'
```

### 6. Build and Push Docker Images to Heroku
From the project root:
```bash
# Push the backend image for the web dyno
heroku container:push web --context-path ./backend -a diagnoai-api

# Release the image to deploy
heroku container:release web -a diagnoai-api
```

### 7. Run Database Migrations
```bash
heroku run alembic upgrade head -a diagnoai-api
```

### 8. Verify Deployment
```bash
# Check logs
heroku logs --tail -a diagnoai-api

# Test health check endpoint
curl https://diagnoai-api.herokuapp.com/api/health
```

---

## Option 2: Deploy Using Heroku Dashboard + GitHub Integration

1. Go to [Heroku Dashboard](https://dashboard.heroku.com/) and click **New > Create new app**.
2. Go to the **Resources** tab:
   - In Add-ons, search and add **Heroku Postgres** (`essential-0`).
   - Search and add **Heroku Data for Redis** (`mini`).
3. Go to the **Settings** tab:
   - Click **Reveal Config Vars** and add:
     - `APP_ENV`: `production`
     - `JWT_SECRET_KEY`: `(generate 32+ hex characters)`
     - `ADMIN_REGISTRATION_KEY`: `(secure password for admin register)`
     - `GEMINI_API_KEY`: `(your Google Gemini API key)`
     - `ALLOWED_HOSTS`: `.herokuapp.com,localhost,127.0.0.1`
     - `BACKEND_CORS_ORIGINS`: `["*"]` or your frontend URL
4. Set stack to Container in Heroku CLI:
   ```bash
   heroku stack:set container -a <your-app-name>
   ```
5. Go to the **Deploy** tab:
   - Choose **GitHub** as deployment method.
   - Search and connect your repository (`diagnoai`).
   - Click **Deploy Branch** (Heroku will automatically use `heroku.yml`).

---

## 🎨 Frontend Deployment Options

### Choice A: Deploy Frontend to Vercel or Netlify (Recommended - Free & Fast)
1. Import your GitHub repository to [Vercel](https://vercel.com/) or [Netlify](https://netlify.com/).
2. Set Root Directory: `frontend`
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Add Environment Variable:
   - `VITE_API_URL`: `https://<your-backend-app>.herokuapp.com/api`
6. Deploy!

### Choice B: Deploy Frontend as a Separate Heroku App
1. Create a second Heroku app:
   ```bash
   heroku create diagnoai-frontend
   heroku buildpacks:set https://github.com/heroku/heroku-buildpack-static -a diagnoai-frontend
   ```
2. In `frontend/.env.production`:
   ```env
   VITE_API_URL=https://diagnoai-api.herokuapp.com/api
   ```
3. Build and deploy frontend subtree to Heroku:
   ```bash
   cd frontend
   npm run build
   git subtree push --prefix frontend heroku main
   ```

---

## ⚙️ Environment Variables Reference

| Variable | Required | Description | Example / Default |
|---|---|---|---|
| `DATABASE_URL` | Auto | Provided automatically by Heroku Postgres | `postgres://...` (auto converted to `postgresql://`) |
| `REDIS_URL` | Auto | Provided automatically by Heroku Redis | `redis://...` or `rediss://...` |
| `JWT_SECRET_KEY` | **Yes** | Secret for signing JWT tokens | 32+ random characters |
| `ADMIN_REGISTRATION_KEY` | **Yes** | Secret required to register admin accounts | Custom secret string |
| `GEMINI_API_KEY` | **Yes** | Google Gemini API key for lab report & AI chatbot | `AIzaSy...` |
| `APP_ENV` | No | Application environment mode | `production` |
| `ALLOWED_HOSTS` | No | Allowed hostnames | `.herokuapp.com,localhost` |
| `BACKEND_CORS_ORIGINS` | No | Allowed CORS origins for frontend requests | `["https://yourfrontend.vercel.app"]` |
| `FRONTEND_URL` | No | Frontend URL for password reset links | `https://yourfrontend.vercel.app` |
| `SINGLE_DYNO` | No | Run web + worker together on single dyno | `true` |

---

## 🔍 Troubleshooting

### 1. Database connection error (`NoSuchModuleError: postgres`)
- **Fixed automatically** in `app/database.py`: DiagnoAI automatically translates `postgres://` connection strings from Heroku into `postgresql://`.

### 2. Celery Redis SSL error with `rediss://`
- **Fixed automatically** in `app/celery_app.py` and `app/routers/ws.py`: SSL certificates for Heroku Redis are handled seamlessly with self-signed certificate fallback.

### 3. Exceeded Slug Size (500MB)
- Use **Docker Container Stack** (`heroku.yml` or `heroku container:push`) as outlined above, which has a multi-gigabyte container limit.

### 4. Database migrations on first deploy
If migrations did not run automatically, execute:
```bash
heroku run alembic upgrade head -a <your-app-name>
```
