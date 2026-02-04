import React from 'react';
import { Card } from '../common/Card';
import { cn } from '../../lib/utils';
import { Stethoscope, Activity, User, Scan } from 'lucide-react';

interface XRayTypeSelectorProps {
    selected: string;
    onSelect: (type: string) => void;
}

const types = [
    { id: 'chest', label: 'Chest', icon: Stethoscope },
    { id: 'bone', label: 'Bone', icon: Activity },
    { id: 'abdomen', label: 'Abdomen', icon: User },
    { id: 'dental', label: 'Dental', icon: Scan },
    { id: 'spine', label: 'Spine', icon: Activity },
];

const XRayTypeSelector = ({ selected, onSelect }: XRayTypeSelectorProps) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {types.map((type) => {
                const Icon = type.icon;
                return (
                    <Card
                        key={type.id}
                        className={cn(
                            "cursor-pointer transition-all hover:shadow-md hover:border-primary/50 flex flex-col items-center justify-center p-4 gap-2",
                            selected === type.id
                                ? "bg-primary/5 border-primary ring-1 ring-primary"
                                : "bg-white dark:bg-slate-800"
                        )}
                        onClick={() => onSelect(type.id)}
                    >
                        <div className={cn(
                            "p-2 rounded-full",
                            selected === type.id ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500"
                        )}>
                            <Icon className="w-6 h-6" />
                        </div>
                        <span className="font-medium text-sm">{type.label}</span>
                    </Card>
                );
            })}
        </div>
    );
};

export default XRayTypeSelector;
