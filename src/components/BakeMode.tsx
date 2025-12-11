import { useState, useEffect } from 'react';
import { CalculationResult, Ingredient } from '../lib/types';
import { toImperialWeight } from '../lib/conversion';

interface BakeModeProps {
    results: CalculationResult;
    onClose: () => void;
    unitSystem: 'metric' | 'imperial';
}

export default function BakeMode({ results, onClose, unitSystem }: BakeModeProps) {
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

    const formatWeight = (g: number) => {
        if (unitSystem === 'imperial') {
            const oz = toImperialWeight(g);
            return {
                val: oz.toFixed(2),
                unit: 'oz'
            };
        }
        return {
            val: g.toString(),
            unit: 'g'
        };
    };

    // Wake Lock
    useEffect(() => {
        let wakeLock: any = null;
        const requestWakeLock = async () => {
            try {
                if ('wakeLock' in navigator) {
                    // @ts-ignore
                    wakeLock = await navigator.wakeLock.request('screen');
                    console.log('Wake Lock is active');
                }
            } catch (err: any) {
                console.error(`${err.name}, ${err.message}`);
            }
        };

        requestWakeLock();

        const handleVisibilityChange = async () => {
            if (wakeLock !== null && document.visibilityState === 'visible') {
                requestWakeLock();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            if (wakeLock !== null) {
                wakeLock.release().then(() => {
                    console.log('Wake Lock released');
                });
            }
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    const toggleCheck = (id: string) => {
        setCheckedItems(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    // Prepare list items
    // We want to combine Main Flour, Main Water, and Ingredients into a single list layout

    // 1. Ingredients List Logic (Mirroring Calculator.tsx)
    const mappedIngs = results.ingredients.map((ing, i) => ({ ing, originalIndex: i }));
    const preferments = mappedIngs.filter(item => item.ing.type === 'preferment');
    const others = mappedIngs.filter(item => item.ing.type !== 'preferment');
    const orderedIngs = [...preferments, ...others];

    return (
        <div className="fixed inset-0 z-[200] bg-white/95 dark:bg-black/95 text-gray-900 dark:text-white flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full h-full max-w-2xl flex flex-col relative">
                <div className="flex items-center justify-between mb-8 pt-4">
                    <h2 className="font-display font-bold text-3xl text-primary">Bake Mode</h2>
                    <button
                        className="px-6 py-2 rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm font-bold uppercase tracking-wide"
                        onClick={onClose}
                    >
                        Exit Mode
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pb-8 hide-scroll">
                    {/* Main Flour */}
                    <div
                        className={`group flex items-center justify-between p-6 rounded-2xl transition-all cursor-pointer border select-none
                            ${checkedItems['main_flour']
                                ? 'bg-primary/20 border-primary/50 text-gray-400 dark:text-gray-400'
                                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-primary dark:hover:border-gray-700 shadow-sm text-gray-900 dark:text-white'}`}
                        onClick={() => toggleCheck('main_flour')}
                    >
                        <div className="flex items-center gap-6">
                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors
                                ${checkedItems['main_flour'] ? 'bg-primary border-primary' : 'border-gray-300 dark:border-gray-600 group-hover:border-primary/50 dark:group-hover:border-gray-400'}`}>
                                {checkedItems['main_flour'] && (
                                    <span className="material-symbols-outlined text-[20px] text-black font-bold">check</span>
                                )}
                            </div>
                            <div className="flex flex-col">
                                <span className={`text-xl font-bold ${checkedItems['main_flour'] ? 'line-through opacity-50' : ''}`}>Main Flour</span>
                                <span className="text-sm text-gray-500 font-medium">Rest of flour</span>
                            </div>
                        </div>
                        <span className={`text-4xl font-bold font-mono ${checkedItems['main_flour'] ? 'opacity-50 text-primary/50' : 'text-primary'}`}>
                            {formatWeight(results.mainFlour).val}
                            <span className="text-lg ml-1 text-gray-500">{formatWeight(results.mainFlour).unit}</span>
                        </span>
                    </div>

                    {/* Main Water */}
                    {results.mainWater > 0 && (
                        <div
                            className={`group flex items-center justify-between p-6 rounded-2xl transition-all cursor-pointer border select-none
                                ${checkedItems['main_water']
                                    ? 'bg-blue-100 dark:bg-blue-900/20 border-blue-300 dark:border-blue-500/50 text-gray-400 dark:text-gray-400'
                                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-gray-700 shadow-sm text-gray-900 dark:text-white'}`}
                            onClick={() => toggleCheck('main_water')}
                        >
                            <div className="flex items-center gap-6">
                                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors
                                    ${checkedItems['main_water'] ? 'bg-blue-500 border-blue-500' : 'border-gray-300 dark:border-gray-600 group-hover:border-blue-400 dark:group-hover:border-gray-400'}`}>
                                    {checkedItems['main_water'] && (
                                        <span className="material-symbols-outlined text-[20px] text-white font-bold">check</span>
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <span className={`text-xl font-bold ${checkedItems['main_water'] ? 'line-through opacity-50' : ''}`}>Water</span>
                                    <span className="text-sm text-gray-500 font-medium">To target hydration</span>
                                </div>
                            </div>
                            <span className={`text-4xl font-bold font-mono ${checkedItems['main_water'] ? 'opacity-50 text-blue-500/50' : 'text-blue-500'}`}>
                                {formatWeight(results.mainWater).val}
                                <span className="text-lg ml-1 text-gray-500">{formatWeight(results.mainWater).unit}</span>
                            </span>
                        </div>
                    )}

                    {/* Other Ingredients */}
                    {orderedIngs.map(({ ing }) => (
                        <div
                            key={ing.id}
                            className={`group flex items-center justify-between p-6 rounded-2xl transition-all cursor-pointer border select-none
                                ${checkedItems[ing.id]
                                    ? 'bg-primary/10 border-primary/30 text-gray-400'
                                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-primary dark:hover:border-gray-700 shadow-sm text-gray-900 dark:text-white'}`}
                            onClick={() => toggleCheck(ing.id)}
                        >
                            <div className="flex items-center gap-6">
                                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors
                                    ${checkedItems[ing.id] ? 'bg-primary/50 border-primary/50' : 'border-gray-300 dark:border-gray-600 group-hover:border-primary/50 dark:group-hover:border-gray-400'}`}>
                                    {checkedItems[ing.id] && (
                                        <span className="material-symbols-outlined text-[20px] text-black font-bold">check</span>
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xl font-bold ${checkedItems[ing.id] ? 'line-through opacity-50' : ''}`}>{ing.name}</span>
                                        {ing.isLiquid && <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded uppercase">Liq</span>}
                                    </div>
                                    {ing.type === 'preferment' && ing.breakdown && (
                                        <span className="text-sm text-gray-500 font-medium">
                                            Flour: {Math.round(ing.breakdown.flour)}g, Water: {Math.round(ing.breakdown.water)}g
                                        </span>
                                    )}
                                </div>
                            </div>
                            <span className={`text-4xl font-bold font-mono ${checkedItems[ing.id] ? 'opacity-50 text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                                {formatWeight(ing.weight || 0).val}
                                <span className="text-lg ml-1 text-gray-500">{formatWeight(ing.weight || 0).unit}</span>
                            </span>
                        </div>
                    ))}

                    <div className="mt-8 text-center pt-8 border-t border-gray-200 dark:border-gray-800">
                        <span className="text-gray-500 uppercase tracking-widest text-xs font-bold block mb-2">Total Dough Weight</span>
                        <span className="text-3xl font-bold text-gray-900 dark:text-white font-mono">
                            {formatWeight(results.totalDough).val} <span className="text-xl text-gray-500">{formatWeight(results.totalDough).unit}</span>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
