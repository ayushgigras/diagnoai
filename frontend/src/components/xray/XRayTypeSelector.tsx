import React from 'react';
import { Card } from '../common/Card';
import { cn } from '../../lib/utils';
import { Stethoscope, Activity, User, Scan, Lock } from 'lucide-react';

interface XRayTypeSelectorProps {
    selected: string;
    onSelect: (type: string) => void;
}

const types = [
    { id: 'chest', label: 'Chest X-Ray', icon: Stethoscope, available: true, description: '18 pathologies · Grad-CAM XAI' },
    { id: 'bone', label: 'Bone X-Ray', icon: Activity, available: false, description: 'Coming Soon' },
    { id: 'abdomen', label: 'Abdomen', icon: User, available: false, description: 'Coming Soon' },
    { id: 'dental', label: 'Dental', icon: Scan, available: false, description: 'Coming Soon' },
    { id: 'spine', label: 'Spine', icon: Activity, available: false, description: 'Coming Soon' },
];

const XRayTypeSelector = ({ selected, onSelect }: XRayTypeSelectorProps) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {types.map((type) => {
                const Icon = type.available ? type.icon : Lock;
                const isSelected = selected === type.id && type.available;

                return (
                    <Card
                        key={type.id}
                        className={cn(
                            "flex flex-col items-center justify-center p-4 gap-2 relative transition-all",
                            type.available
                                ? "cursor-pointer hover:shadow-md hover:border-primary/50"
                                : "cursor-not-allowed opacity-50",
                            isSelected
                                ? "bg-primary/5 border-primary ring-1 ring-primary"
                                : "bg-white dark:bg-slate-800"
                        )}
                        onClick={() => type.available && onSelect(type.id)}
                    >
                        <div className={cn(
                            "p-2 rounded-full",
                            isSelected
                                ? "bg-primary text-white"
                                : "bg-slate-100 dark:bg-slate-700 text-slate-500"
                        )}>
                            <Icon className="w-6 h-6" />
                        </div>
                        <span className="font-medium text-sm text-center">{type.label}</span>
                        <span className={cn(
                            "text-xs text-center",
                            type.available ? "text-slate-400" : "text-slate-400 italic"
                        )}>
                            {type.description}
                        </span>
                        {!type.available && (
                            <span className="absolute top-2 right-2 text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded-full font-medium">
                                Soon
                            </span>
                        )}
                        {isSelected && (
                            <span className="absolute top-2 right-2 text-[10px] bg-primary text-white px-1.5 py-0.5 rounded-full font-medium">
                                Active
                            </span>
                        )}
                    </Card>
                );
            })}
        </div>
    );
};

export default XRayTypeSelector;
