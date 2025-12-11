import { Preset, Ingredient } from '../lib/types';

export const DEFAULT_INGREDIENTS: Ingredient[] = [
    { id: 'sugar', name: 'Sugar', percent: 6, isLiquid: false, type: 'simple' },
    { id: 'butter', name: 'Butter', percent: 5, isLiquid: false, type: 'simple' },
    { id: 'salt', name: 'Salt', percent: 1.7, isLiquid: false, type: 'simple' },
    { id: 'yeast', name: 'Yeast', percent: 0.6, isLiquid: false, type: 'simple' },
    {
        id: 'yudane',
        name: 'Yudane',
        type: 'preferment',
        percent: 20,
        isLiquid: false,
        composition: { flour: 1, water: 2 },
    },
    { id: 'milk', name: 'Milk', percent: 10, isLiquid: true, type: 'simple' },
];

export const BUILT_IN_PRESETS: Preset[] = [
    {
        name: 'Standard Shokupan',
        description: 'Classic soft Japanese milk bread',
        pan: { x: 20, y: 10, z: 10 },
        settings: { grPerLiter: 286, density: 1.0, hydration: 70 },
        ingredients: DEFAULT_INGREDIENTS
    },
    {
        name: 'Premium Shokupan',
        description: 'Richer, fluffier, higher fat content',
        pan: { x: 20, y: 10, z: 10 },
        settings: { grPerLiter: 280, density: 1.01, hydration: 70 },
        ingredients: [
            { id: 'sugar', name: 'Sugar', percent: 6, isLiquid: false, type: 'simple' },
            { id: 'butter', name: 'Butter', percent: 6, isLiquid: false, type: 'simple' },
            { id: 'salt', name: 'Salt', percent: 1.7, isLiquid: false, type: 'simple' },
            { id: 'yeast', name: 'Instant Yeast', percent: 0.8, isLiquid: false, type: 'simple' },
            { id: 'milk', name: 'Milk', percent: 30, isLiquid: true, type: 'simple' },
            {
                id: 'yudane',
                name: 'Yudane',
                type: 'preferment',
                percent: 20,
                isLiquid: false,
                composition: { flour: 1, water: 2 },
            },
        ]
    },
    {
        name: 'Lean Bread',
        description: 'Simple flour, water, salt, yeast',
        pan: { x: 20, y: 10, z: 10 },
        settings: { grPerLiter: 290, density: 1.0, hydration: 68 },
        ingredients: [
            { id: 'salt', name: 'Salt', percent: 2, isLiquid: false, type: 'simple' },
            { id: 'yeast', name: 'Yeast', percent: 0.5, isLiquid: false, type: 'simple' },
        ]
    },
    {
        name: 'Brioche',
        description: 'Rich, egg and butter heavy bread',
        pan: { x: 20, y: 10, z: 10 },
        settings: { grPerLiter: 260, density: 1.05, hydration: 60 },
        ingredients: [
            { id: 'sugar', name: 'Sugar', percent: 15, isLiquid: false, type: 'simple' },
            { id: 'butter', name: 'Butter', percent: 30, isLiquid: false, type: 'simple' },
            { id: 'salt', name: 'Salt', percent: 1.8, isLiquid: false, type: 'simple' },
            { id: 'yeast', name: 'Instant Yeast', percent: 1.0, isLiquid: false, type: 'simple' },
            { id: 'eggs', name: 'Eggs', percent: 30, isLiquid: true, type: 'simple' },
            { id: 'milk', name: 'Milk', percent: 20, isLiquid: true, type: 'simple' },
        ]
    }
];
