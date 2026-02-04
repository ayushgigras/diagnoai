import React from 'react';
import { Card } from '../common/Card';
import { cn } from '../../lib/utils';
import { Droplets, Activity, FlaskConical, Pizza, Fingerprint } from 'lucide-react';

interface TestTypeSelectorProps {
    selected: string;
    onSelect: (type: string) => void;
}

const types = [
    { id: 'cbc', label: 'Complete Blood Count', icon: Droplets },
    { id: 'metabolic', label: 'Metabolic Panel', icon: Activity },
    { id: 'liver', label: 'Liver Function', icon: FlaskConical },
    { id: 'lipid', label: 'Lipid Profile', icon: Pizza },
    { id: 'thyroid', label: 'Thyroid Panel', icon: Fingerprint },
];

const TestTypeSelector = ({ selected, onSelect }: TestTypeSelectorProps) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {types.map((type) => {
                const Icon = type.icon;
                return (
                    <Card
                        key={type.id}
                        className={cn(
                            "cursor-pointer transition-all hover:shadow-md hover:border-secondary/50 flex flex-col items-center justify-center p-4 gap-2 text-center h-full",
                            selected === type.id
                                ? "bg-secondary/5 border-secondary ring-1 ring-secondary"
                                : "bg-white dark:bg-slate-800"
                        )}
                        onClick={() => onSelect(type.id)}
                    >
                        <div className={cn(
                            "p-2 rounded-full",
                            selected === type.id ? "bg-secondary text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500"
                        )}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <span className="font-medium text-xs md:text-sm">{type.label}</span>
                    </Card>
                );
            })}
        </div>
    );
};

export default TestTypeSelector;
