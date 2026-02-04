import React from 'react';
import { cn } from '../../lib/utils';
import { PenTool, FileText } from 'lucide-react';

interface InputMethodSelectorProps {
    method: 'manual' | 'upload';
    onChange: (method: 'manual' | 'upload') => void;
}

const InputMethodSelector = ({ method, onChange }: InputMethodSelectorProps) => {
    return (
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-full max-w-md mx-auto mb-8">
            <button
                type="button"
                onClick={() => onChange('manual')}
                className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all",
                    method === 'manual'
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                )}
            >
                <PenTool className="w-4 h-4" />
                Manual Entry
            </button>
            <button
                type="button"
                onClick={() => onChange('upload')}
                className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all",
                    method === 'upload'
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                )}
            >
                <FileText className="w-4 h-4" />
                Upload File
            </button>
        </div>
    );
};

export default InputMethodSelector;
