# DiagnoAI Frontend

Modern React application for the DiagnoAI healthcare platform — live at [https://diagnoai.app](https://diagnoai.app)

## Features

- **X-Ray Analysis Interface**: Drag & drop upload with synchronous analysis, confidence scores, Grad-CAM heatmap, and XAI explainability cards.
- **Lab Analysis Interface**:
  - Manual parameter entry
  - PDF/Image upload with Gemini 2.5 Flash OCR extraction
  - Review and edit extracted data
- **Medical Chatbot**: Floating AI assistant widget powered by Gemini, context-aware of the active report.
- **History View**: Shows report status and summarized result previews with PDF download.
- **Modern UI**: Built with Tailwind CSS and Framer Motion.

## Role-Based Access Control (RBAC)

- **Admin/Doctor**: Full access — X-Ray Analysis, Lab Analysis, History, Admin Panel.
- **Patient**: Limited to Lab Analysis and History. X-Ray Analysis is restricted.

New registrations default to the `patient` role.

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- React Router DOM
- Zustand (State Management)
- Lucide React (Icons)
- Axios (API calls)

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables** (optional)
   ```env
   VITE_API_URL=http://localhost:8000/api
   VITE_WS_URL=ws://localhost:8000/api/ws
   VITE_GOOGLE_CLIENT_ID=<YOUR_GOOGLE_OAUTH_CLIENT_ID>
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```
   Access at `http://localhost:5173`

4. **Build for Production**
   ```bash
   npm run build
   ```

## Testing

```bash
npm test
```

Runs the Vitest test suite covering auth store (login, logout, localStorage persistence) and App component rendering.

## Production Configuration

For production, set in `frontend/.env.production`:

```env
VITE_API_URL=https://diagnoai.app/api
VITE_WS_URL=wss://diagnoai.app/api/ws
VITE_GOOGLE_CLIENT_ID=<YOUR_GOOGLE_OAUTH_CLIENT_ID>
```