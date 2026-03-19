import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../pages/Login';
import api from '../services/api';
import useAuthStore from '../store/useAuthStore';

// Mock the dependencies
vi.mock('../services/api');
vi.mock('../store/useAuthStore');

describe('Login Page', () => {
    const mockLogin = vi.fn();

    beforeEach(() => {
        vi.resetAllMocks();
        // Setup default auth store mock to handle state selectors
        vi.mocked(useAuthStore).mockImplementation((selector: any) => {
            if (typeof selector === 'function') {
                return selector({ login: mockLogin } as any);
            }
            return { login: mockLogin } as any;
        });
        vi.mocked(useAuthStore.getState).mockReturnValue({ login: mockLogin } as any);
    });

    const renderLogin = () => {
        return render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>
        );
    };

    it('renders email and password fields and submit button', () => {
        renderLogin();
        
        // Use accessible queries or placeholder text
        expect(screen.getByPlaceholderText(/doctor@diagnoai/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/\*\*\*\*\*\*\*\*/i)).toBeInTheDocument();
        
        const submitButton = screen.getByRole('button', { name: /sign in/i });
        expect(submitButton).toBeInTheDocument();
    });

    it('shows error message on failed login', async () => {
        // Mock API to reject
        vi.mocked(api.post).mockRejectedValueOnce({
            response: { data: { detail: "Incorrect credentials" } }
        });

        renderLogin();
        
        fireEvent.change(screen.getByPlaceholderText(/doctor@diagnoai/i), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByPlaceholderText(/\*\*\*\*\*\*\*\*/i), { target: { value: 'wrongpass' } });
        fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

        await waitFor(() => {
            expect(screen.getByText(/incorrect credentials/i)).toBeInTheDocument();
        });
        
        expect(mockLogin).not.toHaveBeenCalled();
    });

    it('calls login store action on successful login', async () => {
        const mockResponse = {
            data: {
                access_token: 'fake-jwt-token',
                user: { id: 1, email: 'test@example.com', role: 'patient' }
            }
        };
        vi.mocked(api.post).mockResolvedValueOnce(mockResponse);

        renderLogin();
        
        fireEvent.change(screen.getByPlaceholderText(/doctor@diagnoai/i), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByPlaceholderText(/\*\*\*\*\*\*\*\*/i), { target: { value: 'password123' } });
        fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalledWith('fake-jwt-token', mockResponse.data.user);
        });
    });
});
