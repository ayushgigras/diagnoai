import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock the API service so no real HTTP calls are made in tests
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { status: 'ok' } }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

// Mock Google OAuth to avoid needing a real clientId in tests
vi.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useGoogleLogin: vi.fn(),
  googleLogout: vi.fn(),
}));

// Mock ChatbotWidget to avoid complex state dependencies
vi.mock('../components/common/ChatbotWidget', () => ({
  ChatbotWidget: () => null,
}));

import App from '../App';

const renderApp = () =>
  render(<App />);

describe('App', () => {
  it('renders without crashing', () => {
    renderApp();
    // App renders a root div
    expect(document.body).toBeTruthy();
  });

  it('renders the DiagnoAI brand name in navigation', () => {
    renderApp();
    // Navbar splits the brand into <span>Diagno</span><span>AI</span>
    // so we check that the "Diagno" part is at least present
    expect(screen.getByText('Diagno')).toBeInTheDocument();
  });

  it('shows Sign in button when not authenticated', () => {
    renderApp();
    // Use getAllByText to handle multiple matching elements, just check at least one exists
    const signInElements = screen.getAllByText(/sign in/i);
    expect(signInElements.length).toBeGreaterThan(0);
  });
});
