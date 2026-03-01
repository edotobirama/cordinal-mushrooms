export const STANDARD_MATERIALS = [
    // Substrates
    "Coco Coir",
    "Vermiculite",
    "Gypsum",
    "Hardwood Fuel Pellets",
    "Soy Hull Pellets",
    "Wheat Bran",

    // Grains
    "Rye Grain",
    "Millet",
    "Oats",
    "Sorghum",
    "Wheat",
    "Corn",

    // Agar / Lab Supplies
    "Agar Agar",
    "Malt Extract",
    "Yeast Extract",
    "Peptone",
    "Dextrose",
    "Potatoes",
    "Honey",
    "Light Malt Extract",
    "Magnesium Sulphate",
    "Vitamin B1",
    "Vitamin B12",
    "Egg",
    "Parafilm",
    "Scalpel Blades",

    // Cleaning / Sterilization
    "Isopropyl Alcohol 70%",
    "Bleach",
    "Hydrogen Peroxide",
    "Nitrile Gloves",
    "Face Masks",

    // Packaging
    "Unicorn Bags 14A",
    "Unicorn Bags 3T",
    "Unicorn Bags 10T",
    "Filter Patches",
    "Impulse Sealer Elements"
] as const;

export const INCUBATION_PERIODS: Record<string, number> = {
    "Liquid Culture": 21,
    "Basal Medium": 20, // Assuming similar to LC
    "Base Culture": 14, // Standard PDA
};

export type StandardMaterial = typeof STANDARD_MATERIALS[number];
