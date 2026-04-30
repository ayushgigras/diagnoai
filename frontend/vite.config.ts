/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    pool: 'forks',
    env: {
      VITE_API_URL: 'http://localhost:8000/api',
      VITE_GOOGLE_CLIENT_ID: 'fake-google-client-id-for-tests',
    },
  },
})
