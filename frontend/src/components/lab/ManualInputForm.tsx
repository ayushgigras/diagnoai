import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Card } from '../common/Card';
import Button from '../common/Button';

interface ManualInputFormProps {
    testType: string;
    onSubmit: (values: Record<string, number>) => void;
    isLoading?: boolean;
    initialValues?: Record<string, number>; // For OCR pre-fill
}

const getFieldsForType = (type: string) => {
    switch (type) {
        case 'cbc':
            return [
                { name: 'wbc', label: 'WBC Count', unit: 'cells/μL', min: 0, max: 50000 },
                { name: 'rbc', label: 'RBC Count', unit: 'million/μL', min: 0, max: 10 },
                { name: 'hemoglobin', label: 'Hemoglobin', unit: 'g/dL', min: 0, max: 25 },
                { name: 'hematocrit', label: 'Hematocrit', unit: '%', min: 0, max: 100 },
                { name: 'platelets', label: 'Platelets', unit: '/μL', min: 0, max: 1000000 },
                { name: 'mcv', label: 'MCV', unit: 'fL', min: 0, max: 150 },
            ];
        case 'metabolic':
            return [
                { name: 'glucose', label: 'Glucose', unit: 'mg/dL', min: 0, max: 500 },
                { name: 'calcium', label: 'Calcium', unit: 'mg/dL', min: 0, max: 20 },
                { name: 'sodium', label: 'Sodium', unit: 'mmol/L', min: 100, max: 200 },
                { name: 'potassium', label: 'Potassium', unit: 'mmol/L', min: 0, max: 10 },
            ];
        default:
            return [];
    }
};

const ManualInputForm = ({ testType, onSubmit, isLoading, initialValues }: ManualInputFormProps) => {
    const { register, handleSubmit, reset } = useForm();
    const fields = getFieldsForType(testType);

    useEffect(() => {
        if (initialValues) {
            reset(initialValues);
        }
    }, [initialValues, reset]);

    return (
        <form onSubmit={handleSubmit((data) => onSubmit(data as Record<string, number>))} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
                {fields.map((field) => (
                    <div key={field.name} className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {field.label}
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.01"
                                {...register(field.name, { valueAsNumber: true, required: true })}
                                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-secondary"
                                placeholder={`e.g. ${field.min + (field.max - field.min) / 2}`}
                            />
                            <span className="absolute right-3 top-2.5 text-xs text-slate-400">
                                {field.unit}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {fields.length === 0 && (
                <div className="text-center p-8 bg-slate-50 dark:bg-slate-900 rounded-lg border border-dashed text-slate-500">
                    Parameters for {testType} are not configured yet in this demo.
                </div>
            )}

            {fields.length > 0 && (
                <div className="flex justify-end">
                    <Button type="submit" variant="secondary" size="lg" isLoading={isLoading}>
                        Analyze Parameters
                    </Button>
                </div>
            )}
        </form>
    );
};

export default ManualInputForm;
