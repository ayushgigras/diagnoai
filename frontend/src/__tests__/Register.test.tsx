import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Register from '../pages/Register';
import api from '../services/api';
import useAuthStore from '../store/useAuthStore';

// Mock the dependencies
vi.mock('../services/api');
vi.mock('../store/useAuthStore');

describe('Register Page', () => {
    const mockLogin = vi.fn();

    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(useAuthStore).mockImplementation((selector: any) => {
            if (typeof selector === 'function') {
                return selector({ login: mockLogin } as any);
            }
            return { login: mockLogin } as any;
        });
        vi.mocked(useAuthStore.getState).mockReturnValue({ login: mockLogin } as any);
    });

    const renderRegister = () => {
        return render(
            <MemoryRouter>
                <Register />
            </MemoryRouter>
        );
    };

    it('renders required fields', () => {
        renderRegister();
        expect(screen.getByText(/I am a.../i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/John Doe/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/john@example.com/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Min 8 chars/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^create account$/i })).toBeInTheDocument();
    });

    it('submit empty form shows validation errors / disables submit correctly', () => {
        renderRegister();
        
        const submitButton = screen.getByRole('button', { name: /^create account$/i });
        // Initially submit should be disabled because password rules aren't met
        expect(submitButton).toBeDisabled();
    });

    it('password mismatch/weak password shows error rules visually and keeps submit disabled', () => {
        renderRegister();
        
        const passwordInput = screen.getByPlaceholderText(/Min 8 chars/i);
        fireEvent.change(passwordInput, { target: { value: 'weakpass' } }); // doesn't meet rules
        
        // Rules should be visible
        expect(screen.getByText(/Password must have:/i)).toBeInTheDocument();
        
        // Button still disabled because of mismatch with rules
        expect(screen.getByRole('button', { name: /^create account$/i })).toBeDisabled();
    });

    it('successful registration calls API/mock request', async () => {
        vi.mocked(api.post).mockImplementation(async (url) => {
            if (url === '/auth/register') return { data: { message: "Success" } };
            if (url === '/auth/login') return { data: { access_token: "mock_token", user: { id: 1 } } };
            return { data: {} };
        });

        renderRegister();
        
        fireEvent.change(screen.getByPlaceholderText(/John Doe/i), { target: { value: 'John Smith' } });
        fireEvent.change(screen.getByPlaceholderText(/john@example.com/i), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByPlaceholderText(/Min 8 chars/i), { target: { value: 'Strong@Pass123' } });
        
        const submitButton = screen.getByRole('button', { name: /^create account$/i });
        expect(submitButton).not.toBeDisabled();
        
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith('/auth/register', expect.objectContaining({
                email: 'test@example.com',
                password: 'Strong@Pass123',
                full_name: 'John Smith',
                role: 'patient'
            }));
            expect(api.post).toHaveBeenCalledWith('/auth/login', expect.any(Object), expect.any(Object));
            expect(mockLogin).toHaveBeenCalled();
            expect(screen.getByText(/Welcome to DiagnoAI!/i)).toBeInTheDocument();
        });
    });
});
