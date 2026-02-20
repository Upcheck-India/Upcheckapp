import { Product, Order } from '../services/mockProductService';

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
    Settings: undefined;
    MineralCalculator: undefined;
    ShrimpCalculator: undefined;
    FarmManagement: undefined;
    PondManagement: { farmId: string, farmName: string };
    PondDetail: { pondId: string, pondName: string };
    CycleManagement: { pondId: string, pondName: string };
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
    FeedEntry: { pondId?: string, pondName?: string };
    SamplingEntry: { pondId?: string, pondName?: string };
    ChemicalEntry: undefined;
    PlanktonEntry: undefined;
    MicrobiologyEntry: undefined;
    MortalityEntry: undefined;

    // ─── Disease ─────────────────────────────────────────────
    DiseaseLibrary: undefined;
    DiseaseDetail: { disease: any };
    DiseaseRecord: undefined;

    // ─── Harvest ─────────────────────────────────────────────
    HarvestEntry: { cropId: string, pondId: string, pondName: string, cycleName: string };
    HarvestHistory: { cropId: string, pondName: string, cycleName: string };

    // ─── Finance ─────────────────────────────────────────────
    ExpenseEntry: { cropId?: string, pondId: string, pondName: string, cycleName?: string };

    // ─── Inventory ───────────────────────────────────────
    Inventory: { farmId?: string, farmName?: string };

    // ─── Public Profile ───────────────────────────────────
    PublicProfile: { username: string };

    // ─── EShop ───────────────────────────────────────────
    Cart: undefined;
    Checkout: undefined;
    Orders: undefined;
    OrderDetail: { order: Order };
};
