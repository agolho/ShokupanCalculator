export const CM_TO_INCH = 0.393701;
export const INCH_TO_CM = 2.54;
export const GRAM_TO_OZ = 0.035274;
export const OZ_TO_GRAM = 28.3495;
export const LITERS_TO_CU_IN = 61.0237;

// Length
export const toImperialLength = (cm: number): number => {
    return cm * CM_TO_INCH;
};

export const toMetricLength = (inch: number): number => {
    return inch * INCH_TO_CM;
};

// Weight
export const toImperialWeight = (g: number): number => {
    return g * GRAM_TO_OZ;
};

export const toMetricWeight = (oz: number): number => {
    return oz * OZ_TO_GRAM;
};
