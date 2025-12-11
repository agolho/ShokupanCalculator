'use client';

import { useState, useEffect, useMemo } from 'react';
import { auth, db } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// Debounce helper
const useDebounce = <T,>(value: T, delay: number): T => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
};

import { Ingredient, Preset, CalculationResult } from '../lib/types';
import { DEFAULT_INGREDIENTS, BUILT_IN_PRESETS } from '../config/presets';
import BakeMode from './BakeMode';
import { toImperialLength, toMetricLength, toImperialWeight, toMetricWeight } from '../lib/conversion';

export default function Calculator() {
    // Auth State
    const [user, setUser] = useState<User | null>(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    // State
    const [pan, setPan] = useState({ x: 20, y: 10, z: 10 });
    const [targetLiters, setTargetLiters] = useState(2.0); // Only used for the input field value when typing
    const [settings, setSettings] = useState({
        grPerLiter: 286,
        density: 1.0,
        hydration: 70,
    });
    const [ingredients, setIngredients] = useState<Ingredient[]>(DEFAULT_INGREDIENTS);
    const [isDark, setIsDark] = useState(true);
    const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric');
    const [modalConfig, setModalConfig] = useState<{
        type: 'alert' | 'confirm' | 'prompt' | 'add_ingredient' | null;
        title?: string;
        message?: string;
        defaultValue?: string;
        onConfirm?: (val?: string) => void;
        onCancel?: () => void;
    }>({ type: null });
    const [promptInputValue, setPromptInputValue] = useState('');

    // Mode State
    const [calculationMode, setCalculationMode] = useState<'volume' | 'flour'>('volume');
    const [targetFlourInput, setTargetFlourInput] = useState(500);

    // Presets Interaction State
    const [customPresets, setCustomPresets] = useState<Preset[]>([]);
    const [selectedPresetName, setSelectedPresetName] = useState<string>('');
    const [isBakeMode, setIsBakeMode] = useState(false);

    // Modal State
    const [newIng, setNewIng] = useState({
        name: '',
        percent: 1,
        type: 'simple',
        isLiquid: false,
        compFlour: 1,
        compWater: 1,
    });

    // Loading State to prevent overwrite
    const [isLoaded, setIsLoaded] = useState(false);

    // --- Firebase Auth ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            setLoadingAuth(false);
            if (currentUser) {
                try {
                    // Load User Data
                    const userDocRef = doc(db, 'users', currentUser.uid);
                    const docSnap = await getDoc(userDocRef);

                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        if (data.pan) setPan(data.pan);
                        if (data.settings) setSettings(data.settings);
                        if (data.ingredients) setIngredients(data.ingredients);
                        if (data.calculationMode) setCalculationMode(data.calculationMode);
                        if (data.calculationMode) setCalculationMode(data.calculationMode);
                        if (data.targetFlourInput) setTargetFlourInput(data.targetFlourInput);
                        if (data.unitSystem) setUnitSystem(data.unitSystem);
                        if (data.customPresets) {
                            setCustomPresets(prev => {
                                // Merge Server and Local presets
                                // Priority: Server versions for conflicts, but keep Local-only (unsynced) items
                                const merged = new Map();
                                // 1. Add Server presets first
                                (data.customPresets as Preset[]).forEach(p => merged.set(p.name, p));
                                // 2. Add Local presets if they don't exist on server (preserve unsaved work)
                                prev.forEach(p => {
                                    if (!merged.has(p.name)) {
                                        merged.set(p.name, p);
                                    }
                                });
                                return Array.from(merged.values());
                            });
                        }
                        // User requested login shouldn't change theme, so we rely on local preference.
                        // if (data.theme === 'dark') { ... }
                    } else {
                        // First time login?
                        // console.log("No remote data found.");
                    }
                } catch (error) {
                    console.error("Error loading user data:", error);
                }
            }
        });
        return () => unsubscribe();
    }, []);

    const handleLogin = async () => {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (error: unknown) {
            console.error("Login failed:", error);
            const err = error as Error;
            setModalConfig({
                type: 'alert',
                title: 'Login Error',
                message: err.message || 'Failed to sign in',
                onConfirm: () => setModalConfig({ type: null })
            });
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    // --- Hydrate from localStorage (Only if NOT logged in or initial load) ---
    useEffect(() => {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        /* eslint-disable react-hooks/set-state-in-effect */
        // Always load local config initially for instant render
        const saved = localStorage.getItem('shokupanState_v4');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // We only apply local storage if we haven't loaded firebase yet or if not logged in
                // But effects run in order. Auth effect is async.
                // So this runs first.
                if (parsed.pan) {
                    setPan({
                        x: parseFloat(parsed.pan.x) || 20,
                        y: parseFloat(parsed.pan.y) || 10,
                        z: parseFloat(parsed.pan.z) || 10
                    });
                }
                if (parsed.settings) setSettings(parsed.settings);
                if (parsed.ingredients) setIngredients(parsed.ingredients);
                if (parsed.calculationMode) setCalculationMode(parsed.calculationMode);
                if (parsed.calculationMode) setCalculationMode(parsed.calculationMode);
                if (parsed.targetFlourInput) setTargetFlourInput(parsed.targetFlourInput);
                if (parsed.unitSystem) setUnitSystem(parsed.unitSystem);
            } catch (e) {
                console.error("Failed to load state", e);
            }
        }

        const savedPresets = localStorage.getItem('shokupanPresets');
        if (savedPresets) {
            try {
                setCustomPresets(JSON.parse(savedPresets));
            } catch (e) {
                console.error("Failed to load presets", e);
            }
        }

        // Theme
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            setIsDark(false);
            document.documentElement.classList.remove('dark');
        } else {
            // Default to Dark
            setIsDark(true);
            document.documentElement.classList.add('dark');
        }

        // Mark as loaded so we can start saving
        setIsLoaded(true);
        /* eslint-enable react-hooks/set-state-in-effect */
    }, []);

    // --- Debounced Saving ---
    const currentState = useMemo(() => ({
        pan,
        settings,
        ingredients,
        calculationMode,
        targetFlourInput,
        unitSystem,
        customPresets,
        theme: isDark ? 'dark' : 'light'
    }), [pan, settings, ingredients, calculationMode, targetFlourInput, unitSystem, customPresets, isDark]);

    const debouncedState = useDebounce(currentState, 800); // Reduced to 800ms for responsiveness

    // Save to LocalStorage (Always)
    useEffect(() => {
        if (!isLoaded) return; // Prevent overwriting with default state on mount

        const serializable = {
            pan: currentState.pan,
            settings: currentState.settings,
            ingredients: currentState.ingredients,
            calculationMode: currentState.calculationMode,
            targetFlourInput: currentState.targetFlourInput,
            unitSystem: currentState.unitSystem,
        };
        localStorage.setItem('shokupanState_v4', JSON.stringify(serializable));
        localStorage.setItem('theme', currentState.theme);
        localStorage.setItem('shokupanPresets', JSON.stringify(currentState.customPresets));
    }, [currentState, isLoaded]);

    // Save to Firestore (If Logged In)
    useEffect(() => {
        if (user && !loadingAuth) {
            const saveToFirestore = async () => {
                try {
                    // Filter undefined values
                    const cleanState = JSON.parse(JSON.stringify(debouncedState));
                    await setDoc(doc(db, 'users', user.uid), cleanState, { merge: true });
                    // console.log("Synced to Firestore");
                } catch (err) {
                    console.error("Error saving to Firestore:", err);
                }
            };
            saveToFirestore();
        }
    }, [debouncedState, user, loadingAuth]);


    // Theme Handling (UI only, logic handled in effects)
    const toggleTheme = () => {
        const newDark = !isDark;
        setIsDark(newDark);
        if (newDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    // Calculation Logic (Memoized)
    const results: CalculationResult = useMemo(() => {
        const volLiters = (pan.x * pan.y * pan.z) / 1000;
        const targetHydration = settings.hydration / 100;

        // Calculate Total Percentage
        let totalPercentage = 1 + targetHydration;
        ingredients.forEach(ing => {
            if (ing.type === 'preferment') return;
            if (!ing.isLiquid) {
                totalPercentage += (ing.percent / 100);
            }
        });

        let totalFlour = 0;
        let totalDoughTarget = 0;
        let calculatedPanVolume = 0;

        if (calculationMode === 'volume') {
            // Mode: Volume -> Dough -> Flour
            calculatedPanVolume = volLiters * 1000;
            totalDoughTarget = volLiters * settings.grPerLiter * settings.density;
            totalFlour = totalDoughTarget / totalPercentage;
        } else {
            // Mode: Flour -> Dough -> Suggest Volume
            totalFlour = targetFlourInput;
            totalDoughTarget = totalFlour * totalPercentage;
            const suggestedVolumeLiters = totalDoughTarget / (settings.grPerLiter * settings.density);
            calculatedPanVolume = suggestedVolumeLiters * 1000;
        }

        const totalTargetWater = totalFlour * targetHydration;

        let prefermentFlourTotal = 0;
        let prefermentWaterTotal = 0;
        let assignedLiquidTotal = 0;

        // A. Pre-ferments
        const calculatedIngredients: Ingredient[] = [];

        for (const originalIng of ingredients) {
            // Clone to avoid mutating state directly
            const ing: Ingredient = { ...originalIng };

            if (ing.type === 'preferment') {
                const pFlour = totalFlour * (ing.percent / 100);
                const ratio = ing.composition || { flour: 1, water: 0 };
                const waterRatio = ratio.water / ratio.flour;
                const pWater = pFlour * waterRatio;

                ing.breakdown = { flour: pFlour, water: pWater };
                ing.weight = Math.round(pFlour + pWater);

                prefermentFlourTotal += pFlour;
                prefermentWaterTotal += pWater;
            } else {
                const weight = Math.round(totalFlour * (ing.percent / 100));
                ing.weight = weight;
                if (ing.isLiquid) {
                    assignedLiquidTotal += weight;
                }
            }
            calculatedIngredients.push(ing);
        }

        const waterSupplied = prefermentWaterTotal + assignedLiquidTotal;
        const mainWater = Math.max(0, totalTargetWater - waterSupplied);
        const mainFlour = Math.max(0, totalFlour - prefermentFlourTotal);

        let totalCalcWeight = mainFlour + mainWater + prefermentFlourTotal + prefermentWaterTotal;
        calculatedIngredients.forEach(i => {
            if (i.type !== 'preferment') totalCalcWeight += (i.weight || 0);
        });

        return {
            mainFlour: Math.round(mainFlour),
            mainWater: Math.round(mainWater),
            totalFlour: Math.round(totalFlour),
            totalWater: Math.round(totalTargetWater),
            actualHydration: targetHydration * 100,
            totalDough: Math.round(totalCalcWeight),
            ingredients: calculatedIngredients,
            panVolume: calculatedPanVolume
        } as CalculationResult;
    }, [pan, settings, ingredients, calculationMode, targetFlourInput]);

    // Handlers
    const handlePanChange = (field: 'x' | 'y' | 'z', val: number) => {
        setPan(prev => ({ ...prev, [field]: val }));
        // Update targetLiters input to match new reality
        const newVol = (field === 'x' ? val : pan.x) * (field === 'y' ? val : pan.y) * (field === 'z' ? val : pan.z);
        setTargetLiters(parseFloat((newVol / 1000).toFixed(2)));
    };

    const handleLitersChange = (newLiters: number) => {
        setTargetLiters(newLiters);
        const currentVol = pan.x * pan.y * pan.z;
        if (currentVol > 0 && newLiters > 0) {
            const scale = Math.cbrt((newLiters * 1000) / currentVol);
            setPan(prev => ({
                x: parseFloat((prev.x * scale).toFixed(2)),
                y: parseFloat((prev.y * scale).toFixed(2)),
                z: parseFloat((prev.z * scale).toFixed(2))
            }));
        }
    };

    const updateIngredientPercent = (index: number, newPercent: number) => {
        const newIngs = [...ingredients];
        newIngs[index].percent = Math.max(0, parseFloat(newPercent.toFixed(1)));
        setIngredients(newIngs);
    };

    const removeIngredient = (index: number) => {
        setModalConfig({
            type: 'confirm',
            title: 'Remove Ingredient',
            message: `Remove ${ingredients[index].name}?`,
            onConfirm: () => {
                setIngredients(prev => prev.filter((_, i) => i !== index));
                setModalConfig({ type: null });
            },
            onCancel: () => setModalConfig({ type: null })
        });
    };

    const addCustomIngredient = () => {
        if (!newIng.name) return;
        const ingToAdd: Ingredient = {
            id: 'custom_' + Date.now(),
            name: newIng.name,
            percent: parseFloat(newIng.percent.toString()),
            isLiquid: newIng.isLiquid,
            type: newIng.type as 'simple' | 'preferment',
        };

        if (newIng.type === 'preferment') {
            ingToAdd.composition = { flour: newIng.compFlour, water: newIng.compWater };
        }

        setIngredients([...ingredients, ingToAdd]);
        setModalConfig({ type: null });
        setNewIng({ name: '', percent: 1, type: 'simple', isLiquid: false, compFlour: 1, compWater: 1 });
    };

    // Preset Handlers
    const loadPreset = (preset: Preset) => {
        setModalConfig({
            type: 'confirm',
            title: 'Load Preset',
            message: `Load preset "${preset.name}"? This will overwrite current settings.`,
            onConfirm: () => {
                setPan(preset.pan);
                setSettings(preset.settings);
                setIngredients(JSON.parse(JSON.stringify(preset.ingredients))); // Deep copy to detach references
                setSelectedPresetName(preset.name);

                // Recalc visual targetLiters
                const newVol = preset.pan.x * preset.pan.y * preset.pan.z;
                setTargetLiters(parseFloat((newVol / 1000).toFixed(2)));

                // Recalc targetFlourInput to match the preset's volume
                const volLiters = newVol / 1000;
                const targetHydration = preset.settings.hydration / 100;
                let totalPercentage = 1 + targetHydration;
                preset.ingredients.forEach(ing => {
                    if (ing.type === 'preferment') return;
                    if (!ing.isLiquid) {
                        totalPercentage += (ing.percent / 100);
                    }
                });

                const totalDough = volLiters * preset.settings.grPerLiter * preset.settings.density;
                const calculatedFlour = totalDough / totalPercentage;
                setTargetFlourInput(Math.round(calculatedFlour));

                setModalConfig({ type: null });
            },
            onCancel: () => setModalConfig({ type: null })
        });
    };

    const saveCurrentAsPreset = () => {
        setPromptInputValue('');
        setModalConfig({
            type: 'prompt',
            title: 'Save Preset',
            message: "Enter a name for this preset:",
            defaultValue: '',
            onConfirm: (name) => {
                if (!name) return;

                if (BUILT_IN_PRESETS.some(p => p.name === name)) {
                    setModalConfig({
                        type: 'alert',
                        title: 'Error',
                        message: "Cannot overwrite built-in presets.",
                        onConfirm: () => setModalConfig({ type: null })
                    });
                    return;
                }

                const newPreset: Preset = {
                    name,
                    pan: { ...pan },
                    settings: { ...settings },
                    ingredients: JSON.parse(JSON.stringify(ingredients))
                };

                const updated = [...customPresets.filter(p => p.name !== name), newPreset];
                setCustomPresets(updated);
                // localStorage handled by effect
                setSelectedPresetName(name);

                setModalConfig({
                    type: 'alert',
                    title: 'Success',
                    message: `Saved preset "${name}"${!user ? ' to this device. Log in to sync across devices.' : '.'}`,
                    onConfirm: () => setModalConfig({ type: null })
                });
            },
            onCancel: () => setModalConfig({ type: null })
        });
    };

    const handleModeSwitch = (newMode: 'volume' | 'flour') => {
        if (newMode === calculationMode) return;

        if (newMode === 'volume') {
            // Switching FROM Flour TO Volume
            // We want to keep the target flour amount, so we need to set the pan volume to match.
            // Logic derived from useMemo calculation:
            // totalDough = totalFlour * totalPercentage
            // panVolume = totalDough / (grPerLiter * density)

            const targetHydration = settings.hydration / 100;
            let totalPercentage = 1 + targetHydration;
            ingredients.forEach(ing => {
                if (ing.type === 'preferment') return;
                if (!ing.isLiquid) {
                    totalPercentage += (ing.percent / 100);
                }
            });

            const totalDoughTarget = targetFlourInput * totalPercentage;
            const suggestedVolumeLiters = totalDoughTarget / (settings.grPerLiter * settings.density);

            // Now scale current pan dimensions to match this volume
            const currentVolCm3 = pan.x * pan.y * pan.z;
            const targetVolCm3 = suggestedVolumeLiters * 1000;

            if (currentVolCm3 > 0 && targetVolCm3 > 0) {
                const scale = Math.cbrt(targetVolCm3 / currentVolCm3);
                setPan({
                    x: parseFloat((pan.x * scale).toFixed(2)),
                    y: parseFloat((pan.y * scale).toFixed(2)),
                    z: parseFloat((pan.z * scale).toFixed(2))
                });
                setTargetLiters(parseFloat(suggestedVolumeLiters.toFixed(2)));
            }
        } else {
            // Switching FROM Volume TO Flour
            // Calculate what the total flour would be for the current volume
            const volLiters = (pan.x * pan.y * pan.z) / 1000;
            const targetHydration = settings.hydration / 100;
            let totalPercentage = 1 + targetHydration;
            ingredients.forEach(ing => {
                if (ing.type === 'preferment') return;
                if (!ing.isLiquid) {
                    totalPercentage += (ing.percent / 100);
                }
            });

            const totalDough = volLiters * settings.grPerLiter * settings.density;
            const calculatedFlour = totalDough / totalPercentage;

            setTargetFlourInput(Math.round(calculatedFlour));
        }
        setCalculationMode(newMode);
    };

    const handleSettingsChange = (field: keyof typeof settings, value: number) => {
        const newSettings = { ...settings, [field]: value };

        if (calculationMode === 'flour') {
            // If in Flour Mode, we treat the current "Suggested Volume" as the anchor.
            // When settings change (density/hydration), the capacity of that volume changes.
            // We update targetFlourInput so the Volume essentially stays the same.

            const anchorVolCm3 = results.panVolume;
            const anchorVolLiters = anchorVolCm3 / 1000;

            if (anchorVolLiters > 0) {
                // Calculate New Total Percentage (based on new hydration)
                const targetHydration = newSettings.hydration / 100;
                let totalPercentage = 1 + targetHydration;
                ingredients.forEach(ing => {
                    if (ing.type === 'preferment') return;
                    if (!ing.isLiquid) totalPercentage += (ing.percent / 100);
                });

                // Calculate New Dough Target for the Anchor Volume
                const newDoughTarget = anchorVolLiters * newSettings.grPerLiter * newSettings.density;

                // Calculate New Flour
                const newFlour = newDoughTarget / totalPercentage;

                setTargetFlourInput(Math.round(newFlour));
            }
        }

        setSettings(newSettings);
    };

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark text-gray-800 dark:text-gray-200 font-sans transition-colors duration-200 pb-20">
            {/* Header */}
            <header className="w-full bg-surface-light dark:bg-surface-dark border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex flex-col justify-center">
                        <h1 className="text-xl font-display font-bold text-gray-900 dark:text-white leading-tight">Shokupan</h1>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium tracking-wide">DOUGH CALCULATOR</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 mr-4">
                            <span
                                onClick={() => setUnitSystem('metric')}
                                className={`cursor-pointer transition-colors ${unitSystem === 'metric' ? 'text-primary font-bold' : 'hover:text-gray-900 dark:hover:text-white'}`}
                            >METRIC</span>
                            <span className="text-gray-300 dark:text-gray-700">|</span>
                            <span
                                onClick={() => setUnitSystem('imperial')}
                                className={`cursor-pointer transition-colors ${unitSystem === 'imperial' ? 'text-primary font-bold' : 'hover:text-gray-900 dark:hover:text-white'}`}
                            >IMPERIAL</span>
                        </div>

                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
                            title="Toggle Theme"
                        >
                            <span className="material-symbols-outlined text-[20px]">{isDark ? 'light_mode' : 'dark_mode'}</span>
                        </button>

                        <button
                            onClick={user ? handleLogout : handleLogin}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors flex items-center gap-2"
                            title={user ? 'Logout' : 'Login'}
                        >
                            {user?.photoURL ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={user.photoURL} alt="User" className="w-6 h-6 rounded-full" />
                            ) : (
                                <span className="material-symbols-outlined text-[20px]">person</span>
                            )}
                        </button>

                        <button
                            onClick={() => setIsBakeMode(true)}
                            className="ml-2 flex items-center gap-2 bg-primary hover:bg-yellow-600 text-white px-4 py-2 rounded-full shadow-lg shadow-yellow-500/20 transition-all transform active:scale-95"
                        >
                            <span className="font-medium text-sm">Bake Mode</span>
                            <span className="material-symbols-outlined text-[18px]">cookie</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column: Settings, Dimensions, Presets */}
                    <div className="lg:col-span-5 space-y-6">

                        {/* Pan Dimensions Section */}
                        <section className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="font-display text-lg font-bold text-gray-900 dark:text-white">
                                    {calculationMode === 'volume' ? 'Pan Dimensions' : 'Target Flour'}
                                </h2>
                                {calculationMode === 'volume' && (
                                    <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{unitSystem === 'metric' ? 'CM' : 'IN'}</span>
                                )}
                            </div>

                            {/* Mode Switcher */}
                            <div className="bg-input-light dark:bg-input-dark p-1 rounded-lg flex mb-6 relative">
                                <button
                                    onClick={() => handleModeSwitch('volume')}
                                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${calculationMode === 'volume' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                                >By Pan Volume</button>
                                <button
                                    onClick={() => handleModeSwitch('flour')}
                                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${calculationMode === 'flour' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                                >By Total Flour</button>
                            </div>

                            {calculationMode === 'volume' ? (
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Length</label>
                                        <div className="relative">
                                            <input
                                                className="w-full bg-input-light dark:bg-input-dark border-transparent focus:border-primary focus:ring-primary rounded-lg text-gray-900 dark:text-white font-semibold py-2.5 px-3"
                                                type="number"
                                                step="0.1"
                                                value={unitSystem === 'metric' ? pan.x : parseFloat(toImperialLength(pan.x).toFixed(2))}
                                                onChange={e => handlePanChange('x', unitSystem === 'metric' ? parseFloat(e.target.value) : toMetricLength(parseFloat(e.target.value)))}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Height</label>
                                        <div className="relative">
                                            <input
                                                className="w-full bg-input-light dark:bg-input-dark border-transparent focus:border-primary focus:ring-primary rounded-lg text-gray-900 dark:text-white font-semibold py-2.5 px-3"
                                                type="number"
                                                step="0.1"
                                                value={unitSystem === 'metric' ? pan.y : parseFloat(toImperialLength(pan.y).toFixed(2))}
                                                onChange={e => handlePanChange('y', unitSystem === 'metric' ? parseFloat(e.target.value) : toMetricLength(parseFloat(e.target.value)))}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Depth</label>
                                        <div className="relative">
                                            <input
                                                className="w-full bg-input-light dark:bg-input-dark border-transparent focus:border-primary focus:ring-primary rounded-lg text-gray-900 dark:text-white font-semibold py-2.5 px-3"
                                                type="number"
                                                step="0.1"
                                                value={unitSystem === 'metric' ? pan.z : parseFloat(toImperialLength(pan.z).toFixed(2))}
                                                onChange={e => handlePanChange('z', unitSystem === 'metric' ? parseFloat(e.target.value) : toMetricLength(parseFloat(e.target.value)))}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vol (L)</label>
                                        <div className="relative">
                                            <input
                                                className="w-full bg-input-light dark:bg-input-dark border-transparent focus:border-primary focus:ring-primary rounded-lg text-gray-900 dark:text-white font-semibold py-2.5 px-3"
                                                type="number"
                                                step="0.01"
                                                value={targetLiters}
                                                onChange={e => handleLitersChange(parseFloat(e.target.value))}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="mb-6 space-y-1">
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Flour ({unitSystem === 'metric' ? 'g' : 'oz'})</label>
                                    <div className="relative">
                                        <input
                                            className="w-full bg-input-light dark:bg-input-dark border-transparent focus:border-primary focus:ring-primary rounded-lg text-gray-900 dark:text-white font-semibold py-2.5 px-3 text-lg"
                                            type="number"
                                            value={unitSystem === 'metric' ? targetFlourInput : parseFloat(toImperialWeight(targetFlourInput).toFixed(1))}
                                            onChange={e => setTargetFlourInput(unitSystem === 'metric' ? parseFloat(e.target.value) : toMetricWeight(parseFloat(e.target.value)))}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between p-4 bg-primary/10 rounded-xl border border-primary/20">
                                <span className="text-sm font-medium text-primary dark:text-yellow-500">
                                    {calculationMode === 'volume' ? 'Calculated Volume' : 'Suggested Volume'}
                                </span>
                                <span className="text-lg font-bold text-primary dark:text-yellow-500">
                                    {results.panVolume.toFixed(0)} cm³
                                </span>
                            </div>
                        </section>

                        {/* Presets Section */}
                        <section className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                            <h2 className="font-display text-lg font-bold text-gray-900 dark:text-white mb-4">Recipe Presets</h2>
                            <div className="grid grid-cols-1 gap-3 mb-6">
                                {BUILT_IN_PRESETS.map(preset => (
                                    <button
                                        key={preset.name}
                                        onClick={() => loadPreset(preset)}
                                        className={`w-full text-left px-4 py-3 rounded-xl border transition-all group flex items-center justify-between
                                            ${selectedPresetName === preset.name
                                                ? 'border-primary bg-primary/5 dark:bg-primary/10'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                    >
                                        <span className={`font-medium transition-colors ${selectedPresetName === preset.name ? 'text-primary' : 'text-gray-700 dark:text-gray-200 group-hover:text-primary'}`}>
                                            {preset.name}
                                        </span>
                                        <span className={`material-symbols-outlined text-sm ${selectedPresetName === preset.name ? 'text-primary' : 'text-gray-400 group-hover:text-primary'}`}>
                                            arrow_forward_ios
                                        </span>
                                    </button>
                                ))}
                            </div>

                            <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        My Presets {user ? '(Synced)' : '(Local Device)'}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <div
                                        onClick={saveCurrentAsPreset}
                                        className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-lg text-sm font-medium border border-green-200 dark:border-green-800 cursor-pointer hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                                    >
                                        Current Recipe
                                        <span className="material-symbols-outlined text-[14px]">save</span>
                                    </div>

                                    {customPresets.map(preset => (
                                        <div key={preset.name} className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 group cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700">
                                            <span onClick={() => loadPreset(preset)}>{preset.name}</span>
                                            <span
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setModalConfig({
                                                        type: 'confirm',
                                                        title: 'Delete Preset',
                                                        message: `Delete ${preset.name}?`,
                                                        onConfirm: () => {
                                                            setCustomPresets(prev => prev.filter(p => p.name !== preset.name));
                                                            setModalConfig({ type: null });
                                                        }
                                                    });
                                                }}
                                                className="material-symbols-outlined text-[14px] text-gray-400 hover:text-red-500 ml-1"
                                            >close</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* Advanced Settings */}

                    </div>

                    {/* Right Column: Ingredients */}
                    <div className="lg:col-span-7 space-y-6">
                        <section className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col h-full">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white">Ingredients</h2>
                                <div className="text-right">
                                    <span className="text-xs text-gray-500 dark:text-gray-400 block">Total Dough Weight</span>
                                    <span className="text-xl font-bold text-gray-900 dark:text-white">
                                        {unitSystem === 'metric' ? `${results.totalDough} g` : `${toImperialWeight(results.totalDough).toFixed(2)} oz`}
                                    </span>
                                </div>
                            </div>

                            <div className="flex-1 p-6 space-y-1">
                                <div className="grid grid-cols-12 gap-2 md:gap-4 px-2 mb-2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                    <div className="col-span-4 md:pl-8">Percentage</div>
                                    <div className="col-span-6">Ingredient</div>
                                    <div className="col-span-2 text-right">Grams</div>
                                </div>

                                {/* Main Flour (Locked) */}
                                <div className="group flex items-center bg-gray-50 dark:bg-gray-800/40 rounded-xl p-3 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all mb-4">
                                    <div className="hidden md:flex w-8 justify-center text-gray-400">
                                        <span className="material-symbols-outlined text-sm">lock</span>
                                    </div>
                                    <div className="flex-1 grid grid-cols-12 gap-2 md:gap-4 items-center">
                                        <div className="col-span-4 pl-2 font-mono text-gray-400 text-sm">100%</div>
                                        <div className="col-span-6 font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                            Flour (Main)
                                            <span className="material-symbols-outlined text-[16px] text-gray-400 cursor-help" title="Main flour calculated after Yudane subtraction">info</span>
                                        </div>
                                        <div className="col-span-2 text-right font-bold text-lg text-gray-900 dark:text-white whitespace-nowrap">
                                            {results.mainFlour} g
                                        </div>
                                    </div>
                                </div>

                                {/* Dynamic Ingredients */}
                                {results.ingredients.map((ing, idx) => (
                                    <div key={ing.id} className="group flex items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl p-2 transition-all">
                                        <div className="hidden md:flex w-8 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => removeIngredient(idx)}>
                                                <span className="material-symbols-outlined text-gray-400 hover:text-red-500 cursor-pointer text-lg">delete</span>
                                            </button>
                                        </div>
                                        <div className="flex-1 grid grid-cols-12 gap-2 md:gap-4 items-center">
                                            {/* Percentage Control */}
                                            <div className="col-span-4 flex items-center gap-2 bg-white dark:bg-gray-900 rounded-lg p-1 border border-gray-200 dark:border-gray-700 shadow-sm">
                                                <button
                                                    onClick={() => updateIngredientPercent(idx, ing.percent - 0.1)}
                                                    className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                                                >-</button>
                                                <span
                                                    onClick={() => {
                                                        const val = prompt('Enter new percentage:', ing.percent.toString());
                                                        if (val) updateIngredientPercent(idx, parseFloat(val));
                                                    }}
                                                    className="w-full text-center text-sm font-bold text-gray-900 dark:text-white cursor-pointer select-none"
                                                >
                                                    {ing.percent.toFixed(1)}%
                                                </span>
                                                <button
                                                    onClick={() => updateIngredientPercent(idx, ing.percent + 0.1)}
                                                    className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                                                >+</button>
                                            </div>

                                            <div className="col-span-6 flex flex-col justify-center">
                                                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200 font-medium">
                                                    <button onClick={() => removeIngredient(idx)} className="md:hidden text-gray-400 hover:text-red-500 flex items-center">
                                                        <span className="material-symbols-outlined text-lg">delete</span>
                                                    </button>
                                                    {ing.isLiquid && (
                                                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 uppercase">Liq</span>
                                                    )}
                                                    {ing.name}
                                                </div>
                                                {ing.type === 'preferment' && ing.breakdown && (
                                                    <span className="text-xs text-gray-400 font-normal">
                                                        (Flour: {Math.round(ing.breakdown.flour)}g, Water: {Math.round(ing.breakdown.water)}g)
                                                    </span>
                                                )}
                                            </div>

                                            <div className="col-span-2 text-right font-mono font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                                {Math.round(ing.weight || 0)} g
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Water Row (Implicit) */}
                                {results.mainWater > 0 && (
                                    <div className="group flex items-center bg-blue-50/50 dark:bg-blue-900/10 rounded-xl p-3 border border-transparent transition-all mb-4">
                                        <div className="hidden md:flex w-8"></div>
                                        <div className="flex-1 grid grid-cols-12 gap-2 md:gap-4 items-center">
                                            <div className="col-span-4 pl-2 font-mono text-gray-400 text-sm">--</div>
                                            <div className="col-span-6 font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                                                Water
                                                <span className="material-symbols-outlined text-[16px] text-blue-400 cursor-help">opacity</span>
                                            </div>
                                            <div className="col-span-2 text-right font-bold text-lg text-gray-900 dark:text-white whitespace-nowrap">
                                                {results.mainWater} g
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-6 pb-2">
                                    <button
                                        onClick={() => setModalConfig({ type: 'add_ingredient' })}
                                        className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-gray-500 dark:text-gray-400 font-medium hover:border-primary hover:text-primary dark:hover:border-primary dark:hover:text-primary transition-all flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-xl">add</span>
                                        Add Custom Ingredient
                                    </button>
                                </div>
                            </div>

                            {/* Footer Summary */}
                            <div className="px-6 pb-4">
                                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-dashed border-gray-200 dark:border-gray-700/50">
                                    <div>
                                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Grams/Liter</label>
                                        <input
                                            className="w-full rounded-lg bg-gray-50 dark:bg-gray-800 border-none text-xs font-medium text-gray-700 dark:text-gray-300 py-1.5 px-2 focus:ring-1 focus:ring-primary"
                                            type="number"
                                            value={settings.grPerLiter}
                                            onChange={e => handleSettingsChange('grPerLiter', parseFloat(e.target.value))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Density</label>
                                        <input
                                            className="w-full rounded-lg bg-gray-50 dark:bg-gray-800 border-none text-xs font-medium text-gray-700 dark:text-gray-300 py-1.5 px-2 focus:ring-1 focus:ring-primary"
                                            type="number"
                                            step="0.01"
                                            value={settings.density}
                                            onChange={e => handleSettingsChange('density', parseFloat(e.target.value))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Hydration %</label>
                                        <input
                                            className="w-full rounded-lg bg-gray-50 dark:bg-gray-800 border-none text-xs font-medium text-gray-700 dark:text-gray-300 py-1.5 px-2 focus:ring-1 focus:ring-primary"
                                            type="number"
                                            value={settings.hydration}
                                            onChange={e => handleSettingsChange('hydration', parseFloat(e.target.value))}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Footer Summary */}
                            <div className="bg-gray-50 dark:bg-black/20 border-t border-gray-100 dark:border-gray-800 p-6">
                                <div className="grid grid-cols-3 gap-6 text-center divide-x divide-gray-200 dark:divide-gray-700">
                                    <div>
                                        <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Flour</span>
                                        <span className="block text-xl font-bold text-gray-900 dark:text-white">{results.totalFlour} g</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Water</span>
                                        <span className="block text-xl font-bold text-gray-900 dark:text-white">{results.totalWater} g</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs font-bold text-primary dark:text-primary uppercase tracking-wider mb-1">Hydration</span>
                                        <span className="block text-xl font-bold text-primary dark:text-primary">{results.actualHydration.toFixed(1)}%</span>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </main>

            <footer className="w-full py-6 text-center">
                <p className="text-xs text-gray-300 dark:text-gray-700 font-mono">v0.21.1</p>
            </footer>

            {/* Modals & Overlays - Reusing existing logic but wrapping in portal/overlay if needed */}
            {modalConfig.type && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold font-display">{modalConfig.title || 'Add Ingredient'}</h3>
                            <button onClick={() => setModalConfig({ type: null })} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {modalConfig.type === 'add_ingredient' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium uppercase text-gray-500 mb-1">Name</label>
                                    <input autoFocus type="text" className="w-full bg-input-light dark:bg-input-dark rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary"
                                        value={newIng.name} onChange={e => setNewIng({ ...newIng, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium uppercase text-gray-500 mb-1">Percentage %</label>
                                        <input type="number" className="w-full bg-input-light dark:bg-input-dark rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary"
                                            value={newIng.percent} onChange={e => setNewIng({ ...newIng, percent: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                    <div className="flex items-center pt-6">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" className="w-5 h-5 rounded text-primary focus:ring-primary bg-input-light dark:bg-input-dark border-gray-300"
                                                checked={newIng.isLiquid} onChange={e => setNewIng({ ...newIng, isLiquid: e.target.checked })}
                                            />
                                            <span className="text-sm font-medium">Is Liquid</span>
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium uppercase text-gray-500 mb-1">Type</label>
                                    <select className="w-full bg-input-light dark:bg-input-dark rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary"
                                        value={newIng.type} onChange={e => setNewIng({ ...newIng, type: e.target.value })}
                                    >
                                        <option value="simple">Simple Ingredient</option>
                                        <option value="preferment">Pre-ferment (Yudane/Poolish)</option>
                                    </select>
                                </div>

                                {newIng.type === 'preferment' && (
                                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <div>
                                            <label className="block text-xs font-medium uppercase text-gray-500 mb-1">Flour Part</label>
                                            <input type="number" className="w-full bg-white dark:bg-black/20 rounded-lg p-2 border border-gray-200 dark:border-gray-700"
                                                value={newIng.compFlour} onChange={e => setNewIng({ ...newIng, compFlour: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium uppercase text-gray-500 mb-1">Water Part</label>
                                            <input type="number" className="w-full bg-white dark:bg-black/20 rounded-lg p-2 border border-gray-200 dark:border-gray-700"
                                                value={newIng.compWater} onChange={e => setNewIng({ ...newIng, compWater: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                )}

                                <button onClick={addCustomIngredient} className="w-full py-3 bg-primary hover:bg-yellow-600 text-white font-bold rounded-xl shadow-lg shadow-yellow-500/20 transition-all mt-4">
                                    Add Ingredient
                                </button>
                            </div>
                        )}

                        {['alert', 'confirm', 'prompt'].includes(modalConfig.type || '') && (
                            <div className="space-y-4">
                                <p className="text-gray-600 dark:text-gray-300">{modalConfig.message}</p>
                                {modalConfig.type === 'prompt' && (
                                    <input autoFocus type="text" className="w-full bg-input-light dark:bg-input-dark rounded-lg p-3"
                                        value={promptInputValue} onChange={e => setPromptInputValue(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && modalConfig.onConfirm?.(promptInputValue)}
                                    />
                                )}
                                <div className="flex justify-end gap-3 pt-4">
                                    {modalConfig.type !== 'alert' && (
                                        <button onClick={modalConfig.onCancel} className="px-4 py-2 font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Cancel</button>
                                    )}
                                    <button onClick={() => modalConfig.onConfirm?.(promptInputValue)} className="px-6 py-2 bg-primary text-white rounded-lg font-bold hover:bg-yellow-600">
                                        Confirm
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isBakeMode && (
                <BakeMode
                    results={results}
                    onClose={() => setIsBakeMode(false)}
                    unitSystem={unitSystem}
                />
            )}
        </div>
    );
}
