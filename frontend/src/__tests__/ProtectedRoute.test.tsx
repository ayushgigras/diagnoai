import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/common/ProtectedRoute';
import useAuthStore from '../store/useAuthStore';

// Mock the zustand store module
vi.mock('../store/useAuthStore');

describe('ProtectedRoute', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    const renderWithRouter = (ui: React.ReactNode, initialEntries = ['/protected']) => {
        return render(
            <MemoryRouter initialEntries={initialEntries}>
                <Routes>
                    <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
                    <Route path="/" element={<div data-testid="home-page">Home Page</div>} />
                    <Route element={ui}>
                        <Route path="/protected" element={<div data-testid="protected-content">Protected Content</div>} />
                    </Route>
                </Routes>
            </MemoryRouter>
        );
    };

    it('redirects unauthenticated user to /login', () => {
        // Setup mock to return unauthenticated state
        vi.mocked(useAuthStore).mockImplementation((selector: any) => {
            if (selector.toString().includes('state.isAuthenticated')) return false;
            if (selector.toString().includes('state.user?.role')) return undefined;
            return false;
        });

        renderWithRouter(<ProtectedRoute />);
        
        expect(screen.getByTestId('login-page')).toBeInTheDocument();
        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('allows authenticated user with correct role to see protected content', () => {
        vi.mocked(useAuthStore).mockImplementation((selector: any) => {
            if (selector.toString().includes('state.isAuthenticated')) return true;
            if (selector.toString().includes('state.user?.role')) return 'doctor';
            return true;
        });

        renderWithRouter(<ProtectedRoute allowedRoles={['doctor', 'admin']} />);
        
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('redirects authenticated user with wrong role to /', () => {
        vi.mocked(useAuthStore).mockImplementation((selector: any) => {
            if (selector.toString().includes('state.isAuthenticated')) return true;
            if (selector.toString().includes('state.user?.role')) return 'patient';
            return true;
        });

        renderWithRouter(<ProtectedRoute allowedRoles={['admin']} />);
        
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('redirects authenticated user with undefined role to / when roles are required', () => {
        vi.mocked(useAuthStore).mockImplementation((selector: any) => {
            if (selector.toString().includes('state.isAuthenticated')) return true;
            if (selector.toString().includes('state.user?.role')) return undefined; // simulates missing role
            return true;
        });

        renderWithRouter(<ProtectedRoute allowedRoles={['patient']} />);
        
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
});
