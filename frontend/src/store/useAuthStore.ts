import { create } from 'zustand';

interface User {
    id: number;
    email: string;
    full_name: string;
    role: "admin" | "doctor" | "patient";
}

interface AuthState {
    token: string | null;
    user: User | null;
    isAuthenticated: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
    updateUser: (user: User) => void;
}

const useAuthStore = create<AuthState>((set) => {
    // Check localStorage for existing token on initialization
    const storedToken = localStorage.getItem('diagnoai_token');
    const storedUser = localStorage.getItem('diagnoai_user');

    const initialToken = storedToken ? storedToken : null;
    const initialUser = storedUser ? JSON.parse(storedUser) : null;

    return {
        token: initialToken,
        user: initialUser,
        isAuthenticated: !!initialToken,

        login: (token: string, user: User) => {
            localStorage.setItem('diagnoai_token', token);
            localStorage.setItem('diagnoai_user', JSON.stringify(user));
            set({ token, user, isAuthenticated: true });
        },

        updateUser: (user: User) => {
            localStorage.setItem('diagnoai_user', JSON.stringify(user));
            set({ user });
        },

        logout: () => {
            localStorage.removeItem('diagnoai_token');
            localStorage.removeItem('diagnoai_user');
            set({ token: null, user: null, isAuthenticated: false });
        },
    };
});

export default useAuthStore;
