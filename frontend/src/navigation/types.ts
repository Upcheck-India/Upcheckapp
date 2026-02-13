import { Product } from '../services/mockProductService';

export type RootStackParamList = {
    // ─── Auth Screens ────────────────────────────────────────
    Login: undefined;
    Register: undefined;
    PhoneLogin: undefined;
    TwoFALogin: { tempToken: string };
    TwoFASetup: undefined;
    ForgotPassword: undefined;
    ResetPassword: { token?: string, refreshToken?: string };
    ChangePassword: undefined;
    SessionManagement: undefined;

    // ─── Main App ────────────────────────────────────────────
    Main: undefined;
    MineralCalculator: undefined;
    ShrimpCalculator: undefined;
    FarmManagement: undefined;
    PondManagement: { farmId: string, farmName: string };
    Simulation: undefined;
    HarvestPlanning: undefined;
    ProductDetail: { product: Product };

    // ─── Calculators ─────────────────────────────────────────
    CalculatorsMenu: undefined;
    CultivationPerformance: undefined;
    FreeAmmonia: undefined;
    ProductDosage: undefined;

    // ─── Data Entry ──────────────────────────────────────────
    DataEntryMenu: undefined;
    ChemicalEntry: undefined;
    PlanktonEntry: undefined;
    MicrobiologyEntry: undefined;
    MortalityEntry: undefined;

    // ─── Disease ─────────────────────────────────────────────
    DiseaseLibrary: undefined;
    DiseaseDetail: { disease: any };
    DiseaseRecord: undefined;
};
