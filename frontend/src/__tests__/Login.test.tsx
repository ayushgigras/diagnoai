import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../pages/Login';
const mockedPost = vi.hoisted(() => vi.fn());

vi.mock('../services/api', () => ({
    default: {
        post: mockedPost,
    },
}));

describe('Login', () => {

    const renderLogin = () => {
        return render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>
        );
    };

    it('renders email input field', () => {
        renderLogin();

        const emailInput = document.querySelector('input[type="email"]');
        expect(emailInput).toBeInTheDocument();
    });

    it('renders password input field', () => {
        renderLogin();

        const passwordInput = document.querySelector('input[type="password"]');
        expect(passwordInput).toBeInTheDocument();
    });

    it('renders submit/login button', () => {
        renderLogin();

        expect(screen.getByRole('button', { name: /login|sign in/i })).toBeInTheDocument();
    });

    it('shows error message on failed login', async () => {
        mockedPost.mockRejectedValueOnce({
            response: { data: { detail: 'Invalid credentials' } },
        });

        renderLogin();

        fireEvent.change(screen.getByPlaceholderText('doctor@diagnoai.com'), {
            target: { value: 'test@example.com' },
        });
        fireEvent.change(screen.getByPlaceholderText('********'), {
            target: { value: 'wrong-password' },
        });
        fireEvent.click(screen.getByRole('button', { name: /login|sign in/i }));

        await waitFor(() => {
            expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
        });
    });
});
