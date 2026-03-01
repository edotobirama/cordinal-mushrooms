
import { StandardMaterial } from "./constants";

export interface Ingredient {
    material: StandardMaterial;
    amount: number; // Amount per UNIT (Liter for cultures)
    unit: string;
}

export const RECIPES: Record<string, Ingredient[]> = {
    // PDA MEDIUM (Base Culture)
    "Base Culture": [
        { material: "Potatoes", amount: 200, unit: "g" },
        { material: "Agar Agar", amount: 20, unit: "g" },
        { material: "Magnesium Sulphate", amount: 0.5, unit: "g" },
        { material: "Dextrose", amount: 20, unit: "g" }
    ],

    // BASAL MEDIUM
    "Basal Medium": [
        { material: "Potatoes", amount: 200, unit: "g" },
        { material: "Magnesium Sulphate", amount: 0.5, unit: "g" },
        { material: "Dextrose", amount: 30, unit: "g" },
        { material: "Peptone", amount: 10, unit: "g" },
        { material: "Yeast Extract", amount: 1, unit: "g" },
        { material: "Vitamin B1", amount: 0.1, unit: "g" },
        { material: "Vitamin B12", amount: 0.1, unit: "g" },
        { material: "Egg", amount: 1, unit: "unit" }
    ],

    // LIQUID MEDIUM (LC) - Same as Basal but NO EGG
    "Liquid Culture": [
        { material: "Potatoes", amount: 200, unit: "g" },
        { material: "Magnesium Sulphate", amount: 0.5, unit: "g" },
        { material: "Dextrose", amount: 30, unit: "g" },
        { material: "Peptone", amount: 10, unit: "g" },
        { material: "Yeast Extract", amount: 1, unit: "g" },
        { material: "Vitamin B1", amount: 0.1, unit: "g" },
        { material: "Vitamin B12", amount: 0.1, unit: "g" }
    ]
};
