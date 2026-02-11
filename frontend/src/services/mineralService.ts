export interface WaterParams {
    salinity: number;
    calcium: number;
    magnesium: number;
    potassium: number;
    sodium: number;
    phosphorus: number;
    // C and N are input but less critical for basic mineral balancing in this MVP
    carbon?: number;
    nitrogen?: number;
}

export interface Chemical {
    id: string;
    name: string;
    formula: string;
    targetElement: 'calcium' | 'magnesium' | 'potassium' | 'alkalinity'; // Simplified
    composition: number; // % of target element in compound
}

// Mock Reference Data (simplified for MVP)
// Optimal values at 1 ppt salinity (linear scaling approximation)
const OPTIMAL_RATIOS = {
    vannamei: {
        calcium: 11.6, // mg/L per ppt
        magnesium: 39.1, // mg/L per ppt
        potassium: 10.7, // mg/L per ppt
    },
    monodon: {
        calcium: 12.0, // slightly different requirements
        magnesium: 40.0,
        potassium: 11.0,
    }
};

export const AVAILABLE_CHEMICALS: Chemical[] = [
    { id: 'caco3', name: 'Calcium Carbonate', formula: 'CaCO3', targetElement: 'calcium', composition: 0.40 },
    { id: 'caoh2', name: 'Calcium Hydroxide', formula: 'Ca(OH)2', targetElement: 'calcium', composition: 0.54 },
    { id: 'dolomite', name: 'Dolomite', formula: 'CaMg(CO3)2', targetElement: 'magnesium', composition: 0.13 }, // Also Ca
    { id: 'kcl', name: 'Potassium Chloride', formula: 'KCl', targetElement: 'potassium', composition: 0.52 },
    { id: 'mgco3', name: 'Magnesium Carbonate', formula: 'MgCO3', targetElement: 'magnesium', composition: 0.28 },
    { id: 'mgo', name: 'Magnesium Oxide', formula: 'MgO', targetElement: 'magnesium', composition: 0.60 },
    { id: 'mgso4', name: 'Epsom Salt', formula: 'MgSO4.7H2O', targetElement: 'magnesium', composition: 0.09 },
    { id: 'mgcl2', name: 'Magnesium Chloride', formula: 'MgCl2.6H2O', targetElement: 'magnesium', composition: 0.12 },
    { id: 'quicklime', name: 'Quicklime', formula: 'CaO', targetElement: 'calcium', composition: 0.71 },
];

export const MineralService = {
    calculateDosage(
        species: 'vannamei' | 'monodon',
        params: WaterParams,
        selectedChemicalIds: string[],
        pondVolumeM3: number // Needed for total dosage in kg
    ) {
        const ratios = OPTIMAL_RATIOS[species];
        const targetCa = ratios.calcium * params.salinity;
        const targetMg = ratios.magnesium * params.salinity;
        const targetK = ratios.potassium * params.salinity;

        const deficits = {
            calcium: Math.max(0, targetCa - params.calcium),
            magnesium: Math.max(0, targetMg - params.magnesium),
            potassium: Math.max(0, targetK - params.potassium),
            alkalinity: 0, // Not calculated in MVP
        };

        const recommendations: { chemical: Chemical; amountKg: number }[] = [];

        // Simple Greedy matching for MVP
        selectedChemicalIds.forEach(chemId => {
            const chem = AVAILABLE_CHEMICALS.find(c => c.id === chemId);
            if (!chem) return;

            const targetDeficit = deficits[chem.targetElement];
            if (targetDeficit > 0) {
                // Calculate amount needed to fill 100% of the deficit with this chemical
                // Formula: (Deficit mg/L * Volume m3) / (Composition * 1000) = kg
                // Note: This naive approach assumes one chemical per element. 
                // A real solver would distribute across multiple selected chemicals.

                const amountKg = (targetDeficit * pondVolumeM3) / (chem.composition * 1000);

                recommendations.push({
                    chemical: chem,
                    amountKg: parseFloat(amountKg.toFixed(2))
                });
            }
        });

        return {
            targets: { calcium: targetCa, magnesium: targetMg, potassium: targetK },
            deficits,
            recommendations
        };
    }
};
