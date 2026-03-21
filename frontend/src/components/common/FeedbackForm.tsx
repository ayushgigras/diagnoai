import { useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare, Send } from 'lucide-react';

interface FeedbackFormProps {
    reportId?: string | number | null;
}

export default function FeedbackForm({ reportId }: FeedbackFormProps) {
    const [rating, setRating] = useState<'up' | 'down' | null>(null);
    const [comment, setComment] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Submitting feedback for report:', reportId);
        // Simulating submission for now; actual API would take the reportId and payload.
        setTimeout(() => setSubmitted(true), 500);
    };

    if (submitted) {
        return (
            <div className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-6 rounded-xl border border-emerald-200 dark:border-emerald-500/20 text-center animate-in fade-in zoom-in-95 duration-300 mt-8">
                <ThumbsUp className="w-8 h-8 mx-auto mb-2" />
                <h3 className="text-lg font-bold">Thank you for your feedback!</h3>
                <p className="text-sm mt-1 opacity-80">Your insights help improve our AI diagnostic models.</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm mt-8">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Provide Analysis Feedback
            </h3>
            <p className="text-sm text-slate-500 mb-4">
                Was this AI analysis helpful and accurate? Let us know.
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-4">
                    <button
                        type="button"
                        onClick={() => setRating('up')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition-all font-medium ${rating === 'up' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' : 'border-slate-200 dark:border-slate-700 bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                        <ThumbsUp className={`w-5 h-5 ${rating === 'up' ? 'fill-current' : ''}`} />
                        Accurate
                    </button>
                    <button
                        type="button"
                        onClick={() => setRating('down')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition-all font-medium ${rating === 'down' ? 'border-red-500 bg-red-50 dark:bg-red-500/10 text-red-600' : 'border-slate-200 dark:border-slate-700 bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                        <ThumbsDown className={`w-5 h-5 ${rating === 'down' ? 'fill-current' : ''}`} />
                        Inaccurate
                    </button>
                </div>
                
                <div>
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Additional comments or corrections (optional)..."
                        rows={3}
                        className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm text-sm dark:text-white resize-none"
                    />
                </div>
                
                <button
                    type="submit"
                    disabled={!rating}
                    className="w-full py-3 bg-primary hover:bg-primary/90 disabled:bg-slate-300 disabled:dark:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all"
                >
                    <Send className="w-4 h-4" /> Submit Feedback
                </button>
            </form>
        </div>
    );
}
