import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useAuthStore from '../store/useAuthStore';

describe('useAuthStore', () => {
    beforeEach(() => {
        localStorage.clear();
        // Reset store state
        act(() => {
            useAuthStore.getState().logout();
        });
    });

    it('starts unauthenticated', () => {
        const { result } = renderHook(() => useAuthStore());
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.token).toBeNull();
        expect(result.current.user).toBeNull();
    });

    it('login sets token, user, and isAuthenticated', () => {
        const { result } = renderHook(() => useAuthStore());
        const mockUser = { id: 1, email: 'doc@test.com', full_name: 'Dr. Test', role: 'doctor' };

        act(() => {
            result.current.login('test-jwt-token', mockUser);
        });

        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.token).toBe('test-jwt-token');
        expect(result.current.user).toEqual(mockUser);
    });

    it('login persists to localStorage', () => {
        const { result } = renderHook(() => useAuthStore());
        const mockUser = { id: 1, email: 'doc@test.com', full_name: 'Dr. Test', role: 'doctor' };

        act(() => {
            result.current.login('test-jwt-token', mockUser);
        });

        expect(localStorage.getItem('diagnoai_token')).toBe('test-jwt-token');
        expect(JSON.parse(localStorage.getItem('diagnoai_user')!)).toEqual(mockUser);
    });

    it('logout clears state and localStorage', () => {
        const { result } = renderHook(() => useAuthStore());
        const mockUser = { id: 1, email: 'doc@test.com', full_name: 'Dr. Test', role: 'doctor' };

        act(() => {
            result.current.login('test-jwt-token', mockUser);
        });
        act(() => {
            result.current.logout();
        });

        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.token).toBeNull();
        expect(result.current.user).toBeNull();
        expect(localStorage.getItem('diagnoai_token')).toBeNull();
        expect(localStorage.getItem('diagnoai_user')).toBeNull();
    });
});
