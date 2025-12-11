import React from 'react';

interface NumberInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    subLabel?: string;
    suffix?: string;
}

export function NumberInput({ label, subLabel, suffix, className, ...props }: NumberInputProps) {
    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {label}
                {subLabel && <span className="ml-1 text-xs text-gray-400 font-normal">({subLabel})</span>}
            </label>
            <div className="relative">
                <input
                    type="number"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-50 dark:placeholder-gray-600"
                    {...props}
                />
                {suffix && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                        {suffix}
                    </span>
                )}
            </div>
        </div>
    );
}
