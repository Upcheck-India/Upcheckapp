import { create } from 'zustand';

interface PondSummary {
    id: string;
    name: string;
    shape: 'square' | 'circle';
    areaM2: number;
    status: 'idle' | 'active' | 'harvested';
}

interface CycleSummary {
    id: string;
    stockingDate: string;
    initialAgeDays: number;
    totalSeed: number;
    species: string;
    feedPricePerKg?: number;
    targetSurvivalRate?: number;
    targetSizeG?: number;
    status: 'active' | 'completed' | 'aborted';
}

interface FarmSummary {
    id: string;
    name: string;
    location?: string;
}

interface ActiveFarmState {
    selectedFarm: FarmSummary | null;
    selectedPond: PondSummary | null;
    activeCycle: CycleSummary | null;
    currentDOC: number | null;

    setSelectedFarm: (farm: FarmSummary | null) => void;
    setSelectedPond: (pond: PondSummary | null) => void;
    setActiveCycle: (cycle: CycleSummary | null) => void;
    updateCurrentDOC: () => void;
    clearPondContext: () => void;
    clearAll: () => void;
}

const computeDOC = (stockingDate: string, initialAgeDays: number): number => {
    const stocking = new Date(stockingDate);
    const today = new Date();
    const daysSinceStocking = Math.floor(
        (today.getTime() - stocking.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSinceStocking + initialAgeDays;
};

export const useActiveFarmStore = create<ActiveFarmState>()((set, get) => ({
    selectedFarm: null,
    selectedPond: null,
    activeCycle: null,
    currentDOC: null,

    setSelectedFarm: (farm) => set({ selectedFarm: farm }),

    setSelectedPond: (pond) => set({ selectedPond: pond }),

    setActiveCycle: (cycle) => {
        const doc = cycle
            ? computeDOC(cycle.stockingDate, cycle.initialAgeDays)
            : null;
        set({ activeCycle: cycle, currentDOC: doc });
    },

    updateCurrentDOC: () => {
        const { activeCycle } = get();
        if (!activeCycle) return;
        set({ currentDOC: computeDOC(activeCycle.stockingDate, activeCycle.initialAgeDays) });
    },

    clearPondContext: () =>
        set({ selectedPond: null, activeCycle: null, currentDOC: null }),

    clearAll: () =>
        set({ selectedFarm: null, selectedPond: null, activeCycle: null, currentDOC: null }),
}));
