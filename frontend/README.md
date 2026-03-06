# DiagnoAI Frontend

Modern React application for the DiagnoAI healthcare platform.

## Features

- **X-Ray Analysis Interface**: Drag & drop upload with async task polling and explainable results.
- **Lab Analysis Interface**: 
   - Manual parameter entry
   - PDF/Image upload with Gemini OCR extraction
    - Review and edit extracted data
- **History View**: Shows report status and summarized result previews.
- **Modern UI**: Built with Tailwind CSS and Framer Motion.

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- React Router DOM
- Zustand (Store)
- Lucide React (Icons)

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Development Server**
   ```bash
   npm run dev
   ```
   Access at `http://localhost:5173`

3. **Build for Production**
   ```bash
   npm run build
   ```

## Configuration

- API base URL is configured in `src/services/api.ts`.
- Default backend URL: `http://127.0.0.1:8000/api`.
- Ensure backend API and Celery worker are running before using analysis pages.
