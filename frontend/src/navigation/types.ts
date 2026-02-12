import { Product } from '../services/mockProductService';

export type RootStackParamList = {
    Login: undefined;
    Main: undefined;
    MineralCalculator: undefined;
    ShrimpCalculator: undefined;
    FarmManagement: undefined;
    PondManagement: { farmId: string, farmName: string };
    Simulation: undefined;
    HarvestPlanning: undefined;
    ProductDetail: { product: Product };
    // New Feature Routes
    CalculatorsMenu: undefined;
    CultivationPerformance: undefined;
    FreeAmmonia: undefined;
    ProductDosage: undefined;
    DataEntryMenu: undefined;
    ChemicalEntry: undefined;
    PlanktonEntry: undefined;
    MicrobiologyEntry: undefined;
    MortalityEntry: undefined;
    DiseaseLibrary: undefined;
    DiseaseDetail: { disease: any };
    DiseaseRecord: undefined;
};
