import { Product } from '../services/mockProductService';

export type RootStackParamList = {
    Login: undefined;
    Register: undefined;
    OtpVerification: { email?: string; phone?: string };
    Main: undefined;
    MineralCalculator: undefined;
    ShrimpCalculator: undefined;
    FarmManagement: undefined;
    PondManagement: { farmId: string, farmName: string };
    Simulation: undefined;
    HarvestPlanning: undefined;
    ProductDetail: { product: Product };
};
