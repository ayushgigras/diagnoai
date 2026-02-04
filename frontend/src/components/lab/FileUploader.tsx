import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, FileImage } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Card } from '../common/Card';

interface FileUploaderProps {
    onUpload: (file: File) => void;
}

const FileUploader = ({ onUpload }: FileUploaderProps) => {
    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            onUpload(acceptedFiles[0]);
        }
    }, [onUpload]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.jpeg', '.jpg', '.png'],
            'application/pdf': ['.pdf']
        },
        maxFiles: 1,
        multiple: false
    });

    return (
        <Card
            {...getRootProps()}
            className={cn(
                "border-2 border-dashed h-48 flex flex-col items-center justify-center cursor-pointer transition-colors",
                isDragActive
                    ? "border-secondary bg-secondary/5"
                    : "border-slate-300 dark:border-slate-700 hover:border-secondary/50 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            )}
        >
            <input {...getInputProps()} />
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-full mb-3">
                <Upload className="w-6 h-6 text-secondary" />
            </div>
            <p className="font-medium text-slate-700 dark:text-slate-300">
                {isDragActive ? "Drop the report here" : "Drag & drop lab report"}
            </p>
            <p className="text-sm text-slate-500 mt-1">PDF or Images (Max 10MB)</p>

            <div className="flex gap-4 mt-4 text-xs text-slate-400">
                <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> PDF</span>
                <span className="flex items-center gap-1"><FileImage className="w-3 h-3" /> JPG/PNG</span>
            </div>
        </Card>
    );
};

export default FileUploader;
