import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, Image as ImageIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Card } from '../common/Card';

interface ImageUploaderProps {
    onUpload: (file: File) => void;
}

const ImageUploader = ({ onUpload }: ImageUploaderProps) => {
    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            onUpload(acceptedFiles[0]);
        }
    }, [onUpload]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.jpeg', '.jpg', '.png', '.dcm']
        },
        maxFiles: 1,
        multiple: false
    });

    return (
        <Card
            {...getRootProps()}
            className={cn(
                "border-2 border-dashed h-64 flex flex-col items-center justify-center cursor-pointer transition-colors",
                isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-slate-300 dark:border-slate-700 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            )}
        >
            <input {...getInputProps()} />
            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full mb-4">
                <UploadCloud className="w-8 h-8 text-primary" />
            </div>
            <p className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-1">
                {isDragActive ? "Drop the X-ray here" : "Drag & drop X-ray image here"}
            </p>
            <p className="text-sm text-slate-500 mb-2">or click to browse</p>
            <div className="flex gap-2 text-xs text-slate-400">
                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">JPG</span>
                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">PNG</span>
                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">DICOM</span>
            </div>
        </Card>
    );
};

export default ImageUploader;
