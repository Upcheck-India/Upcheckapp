import { Product } from '../services/mockProductService';

export type RootStackParamList = {
    Login: undefined;
    Register: undefined;
    OtpVerification: { email: string };
    Main: undefined;
    MineralCalculator: undefined;
    ShrimpCalculator: undefined;
    FarmManagement: undefined;
    PondManagement: { farmId: string, farmName: string };
    ProductDetail: { product: Product };
};
