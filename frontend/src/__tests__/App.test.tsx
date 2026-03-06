import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';

const renderApp = () =>
    render(<App />);

describe('App', () => {
    it('renders the DiagnoAI brand name', () => {
        renderApp();
        expect(screen.getByText('DiagnoAI')).toBeInTheDocument();
    });

    it('shows Home link in navigation', () => {
        renderApp();
        expect(screen.getByText('Home')).toBeInTheDocument();
    });

    it('shows About link in navigation', () => {
        renderApp();
        expect(screen.getByText('About')).toBeInTheDocument();
    });

    it('shows Sign in button when not authenticated', () => {
        renderApp();
        // The navbar shows Sign in when not authenticated
        expect(screen.getByText('Sign in')).toBeInTheDocument();
    });
});
