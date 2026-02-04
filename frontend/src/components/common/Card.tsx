import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    glass?: boolean;
}

export const Card = ({ className, glass = false, ...props }: CardProps) => (
    <div
        className={cn(
            "rounded-xl border border-slate-200 bg-white text-slate-950 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50",
            glass && "bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-white/20",
            className
        )}
        {...props}
    />
);

export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
);

export const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />
);

export const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("p-6 pt-0", className)} {...props} />
);
