export type PanDimensions = {
    x: number; // width cm
    y: number; // height cm
    z: number; // length cm
    directLiters: number;
};

export type GlobalSettings = {
    grPerLiter: number;
    density: number;
    hydration: number; // percentage
};

export type IngredientType = 'simple' | 'preferment';

export type Composition = {
    flour: number;
    water: number;
};

export type Breakdown = {
    flour: number;
    water: number;
};

export type Ingredient = {
    id: string;
    name: string;
    percent: number;
    isLiquid: boolean;
    type?: IngredientType;
    composition?: Composition;
    // Calculated properties
    weight?: number;
    currentWeight?: number;
    breakdown?: Breakdown;
};

export type CalculatorState = {
    pan: PanDimensions;
    settings: GlobalSettings;
    ingredients: Ingredient[];
};

export type CalculationResult = {
    mainFlour: number;
    mainWater: number;
    totalFlour: number;
    totalWater: number;
    actualHydration: number;
    totalDough: number;
    ingredients: Ingredient[];
    panVolume: number;
};

export type Preset = {
    name: string;
    description?: string;
    pan: { x: number; y: number; z: number };
    settings: GlobalSettings;
    ingredients: Ingredient[];
};
