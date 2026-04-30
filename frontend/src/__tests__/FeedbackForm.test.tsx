import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FeedbackForm from '../components/common/FeedbackForm';
import api from '../services/api';

vi.mock('../services/api');

describe('FeedbackForm', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('renders thumbs up and thumbs down buttons', () => {
        render(<FeedbackForm reportId={1} reportType="xray" />);
        expect(screen.getByRole('button', { name: /^accurate$/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^inaccurate$/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /submit feedback/i })).toBeInTheDocument();
    });

    it('clicking thumbs up calls submitFeedback with "up" and optional comment', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({ data: { message: "Success" } });
        
        render(<FeedbackForm reportId={123} reportType="xray" />);
        
        // Initially submit is disabled
        const submitButton = screen.getByRole('button', { name: /submit feedback/i });
        expect(submitButton).toBeDisabled();
        
        // Click accurate
        const accurateBtn = screen.getByRole('button', { name: /^accurate$/i });
        fireEvent.click(accurateBtn);
        
        // Now it's enabled and we can submit without writing a comment
        expect(submitButton).not.toBeDisabled();
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith('/feedback', {
                report_id: 123,
                report_type: 'xray',
                rating: 'up',
                comment: null
            });
            expect(screen.getByText(/thank you for your feedback/i)).toBeInTheDocument();
        });
    });

    it('comment field optional but included if provided', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({ data: { message: "Success" } });
        
        render(<FeedbackForm reportId={123} reportType="xray" />);
        
        // Write comment
        const commentArea = screen.getByPlaceholderText(/additional comments/i);
        fireEvent.change(commentArea, { target: { value: 'Looks great!' } });
        
        // Click down
        const inaccurateBtn = screen.getByRole('button', { name: /^inaccurate$/i });
        fireEvent.click(inaccurateBtn);
        
        const submitButton = screen.getByRole('button', { name: /submit feedback/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith('/feedback', {
                report_id: 123,
                report_type: 'xray',
                rating: 'down',
                comment: 'Looks great!'
            });
        });
    });
});
