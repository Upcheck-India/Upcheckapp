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

export const computeDOC = (stockingDate: string, initialAgeDays: number): number => {
    // Parse 'YYYY-MM-DD' as a LOCAL calendar day, not UTC. `new Date('2026-07-09')`
    // is UTC midnight; subtracting a local `now` and flooring drops a whole day for
    // positive-offset zones like IST (+5:30). Diff local-midnight to local-midnight
    // instead — same convention as utils/localDate.ts. (round, not floor, so a DST
    // hour never shifts the day count.)
    const [y, m, d] = stockingDate.split('-').map(Number);
    const stocking = new Date(y, (m ?? 1) - 1, d ?? 1);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const daysSinceStocking = Math.round(
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
