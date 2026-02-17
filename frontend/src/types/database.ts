export interface Profile {
    id: string;
    email: string | null;
    username: string | null;
    fullName: string | null;
    website: string | null;
    avatarUrl: string | null;
    phoneNumber: string | null;
    languagePreference: string;
    createdAt: string;
}

export interface Farm {
    id: string;
    userId: string;
    farmCode: string;
    name: string;
    areaHectares: number | null;
    address: string | null;
    longitude: number | null;
    latitude: number | null;
    waterSourceType: 'tidal' | 'river' | 'borehole' | 'reservoir' | 'recycled' | null;
    qrCodeUrl: string | null;
    privacySetting: 'private' | 'public' | 'shared';
    boundary?: { latitude: number, longitude: number }[];
    createdAt: string;
    updatedAt: string;
}

export interface Pond {
    id: string;
    farmId: string;
    pondCode: string | null;
    name: string;
    displayName: string | null;
    geometryType: 'rectangular' | 'circular' | 'irregular' | 'raceway';
    constructionType: 'earthen' | 'lined' | 'cage' | 'biofloc_ras';
    lengthM: number | null;
    widthM: number | null;
    diameterM: number | null;
    depthM: number;
    channelCount: number | null;
    calculatedAreaM2: number;
    overrideAreaM2: number | null;
    gpsLat: number | null;
    gpsLng: number | null;
    boundary?: { latitude: number, longitude: number }[];
    status: 'fallow' | 'active' | 'harvesting' | 'archived';
    activeCycleId: string | null;
    activeCycle?: Crop;
    archivedAt: string | null;
    createdAt: string;
    updatedAt: string;
    farm?: Farm;
}

export interface PondDimensionHistory {
    id: string;
    pondId: string;
    changedByUserId: string;
    lengthMBefore: number | null;
    widthMBefore: number | null;
    diameterMBefore: number | null;
    depthMBefore: number | null;
    calculatedAreaM2Before: number | null;
    overrideAreaM2Before: number | null;
    changeReason: string | null;
    changedAt: string;
}

export interface Crop {
    id: string;
    pondId: string;
    farmId: string | null;
    name: string;
    cropCode: string | null;
    totalSeed: number | null;
    seedType: string | null;
    stockingDate: string | null;
    initialAgeDays: number;
    preparationDays: number;
    totalFeedingTrays: number;
    hatcheryId: string | null;
    speciesId: string | null;
    broodstockId: string | null;
    speciesType: string | null;
    stockingDensity: number | null;
    stockingCount: number | null;
    feedPriceRpPerKg: number | null;
    carryingCapacityKgM2: number;
    targetCultivationDays: number;
    targetSize: number | null;
    targetSrPercent: number;
    srPredictionMethod: string;
    doc: number;
    isActive: boolean;
    expectedHarvestDate: string | null;
    actualHarvestDate: string | null;
    harvestWeightKg: number | null;
    status: 'active' | 'completed' | 'cancelled';
    createdAt: string;
    updatedAt: string;
}

export interface InventoryItem {
    id: string;
    farmId: string;
    name: string;
    category: 'feed' | 'medicine' | 'chemical' | 'equipment' | 'other';
    quantity: number;
    unit: string;
    unitPrice?: number;
    reorderLevel?: number;
    supplier?: string;
    expiryDate?: string;
    createdAt: string;
    updatedAt: string;
}

export interface FeedRecord {
    id: string;
    pondId: string;
    pond?: Pond;
    cropId: string | null;
    crop?: Crop;
    recordedAt: string;
    feedType: string;
    feedBrand: string | null;
    quantityKg: number;
    feedingTime: string | null;
    feedingMethod: string | null;
    waterTemperature: number | null;
    notes: string | null;
    inventoryItemId: string | null;
    inventoryItem?: InventoryItem;
}

export interface SamplingData {
    id: string;
    pondId: string;
    pond?: Pond;
    cropId: string | null;
    crop?: Crop;
    samplingDate: string;
    mbwG: number | null;
    totalSamples: number | null;
    stdDeviation: number | null;
    biomassEstimationKg: number | null;
    srEstimationPercent: number | null;
    notes: string | null;
    photoUrls: string[] | null;
    createdAt: string;
}

export interface Harvest {
    id: string;
    cropId: string;
    crop?: Crop;
    harvestDate: string;
    weightKg: number;
    count: number | null;
    averageSize: number | null;
    salePriceTotal: number | null;
    buyerName: string | null;
    harvestType: 'partial' | 'full';
    status: 'pending' | 'sold' | 'discarded';
    notes: string | null;
    createdAt: string;
}

export enum ExpenseCategory {
    FEED = 'Feed',
    PROBIOTICS = 'Chemicals/Probiotics',
    SEED = 'Seed (Fry)',
    LABOR = 'Labor',
    ENERGY = 'Energy (Fuel/Electricity)',
    MAINTENANCE = 'Maintenance',
    OTHER = 'Other'
}

export interface Expense {
    id: string;
    cropId: string | null;
    pondId: string;
    date: string;
    category: ExpenseCategory;
    amount: number;
    description: string | null;
    createdAt: string;
}
