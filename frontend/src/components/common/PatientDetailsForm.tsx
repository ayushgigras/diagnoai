import type { PatientDetails } from '../../types';
import Button from './Button';

interface PatientDetailsFormProps {
    value: PatientDetails;
    onChange: (value: PatientDetails) => void;
    onContinue: () => void;
    isSubmitting?: boolean;
}

const PatientDetailsForm = ({ value, onChange, onContinue, isSubmitting = false }: PatientDetailsFormProps) => {
    const updateField = (field: keyof PatientDetails, fieldValue: string) => {
        onChange({ ...value, [field]: fieldValue });
    };

    return (
        <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Patient Details</h2>
            <p className="text-sm text-slate-500 mb-6">Doctors must provide patient details before running analysis.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">First Name *</label>
                    <input
                        type="text"
                        value={value.first_name}
                        onChange={(e) => updateField('first_name', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder="Enter first name"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Last Name *</label>
                    <input
                        type="text"
                        value={value.last_name}
                        onChange={(e) => updateField('last_name', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder="Enter last name"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Date of Birth</label>
                    <input
                        type="date"
                        value={value.date_of_birth || ''}
                        onChange={(e) => updateField('date_of_birth', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Gender</label>
                    <select
                        value={value.gender || ''}
                        onChange={(e) => updateField('gender', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Contact Number</label>
                    <input
                        type="text"
                        value={value.contact_number || ''}
                        onChange={(e) => updateField('contact_number', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder="e.g. +91xxxxxxxxxx"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Address</label>
                    <input
                        type="text"
                        value={value.address || ''}
                        onChange={(e) => updateField('address', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder="Optional"
                    />
                </div>
            </div>

            <div className="mt-6 flex justify-end">
                <Button onClick={onContinue} disabled={isSubmitting}>
                    Continue to Analysis
                </Button>
            </div>
        </div>
    );
};

export default PatientDetailsForm;
