# DiagnoAI Frontend

Modern React application for the DiagnoAI healthcare platform.

## Features

- **X-Ray Analysis Interface**: Drag & drop upload, visual results with heatmaps (mock).
- **Lab Analysis Interface**: 
    - Manual parameter entry
    - PDF/Image upload with OCR extraction (Mock)
    - Review and edit extracted data
- **Modern UI**: Built with Tailwind CSS, Framer Motion, and Glassmorphism design.

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

- API Base URL is configured in `src/services/api.ts`. Default: `http://localhost:8000/api`.
