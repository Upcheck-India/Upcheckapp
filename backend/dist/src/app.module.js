"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const profiles_module_1 = require("./profiles/profiles.module");
const farms_module_1 = require("./farms/farms.module");
const auth_module_1 = require("./auth/auth.module");
const ponds_module_1 = require("./ponds/ponds.module");
const crops_module_1 = require("./crops/crops.module");
const water_quality_module_1 = require("./water-quality/water-quality.module");
const feed_records_module_1 = require("./feed-records/feed-records.module");
const shrimp_calculations_module_1 = require("./shrimp-calculations/shrimp-calculations.module");
const transactions_module_1 = require("./transactions/transactions.module");
const inventory_module_1 = require("./inventory/inventory.module");
const news_module_1 = require("./news/news.module");
const alerts_module_1 = require("./alerts/alerts.module");
const products_module_1 = require("./products/products.module");
const simulations_module_1 = require("./simulations/simulations.module");
const harvest_plans_module_1 = require("./harvest-plans/harvest-plans.module");
const chemical_module_1 = require("./chemical/chemical.module");
const plankton_module_1 = require("./plankton/plankton.module");
const microbiology_module_1 = require("./microbiology/microbiology.module");
const mortality_module_1 = require("./mortality/mortality.module");
const disease_module_1 = require("./disease/disease.module");
const reference_module_1 = require("./reference/reference.module");
const sampling_module_1 = require("./sampling/sampling.module");
const treatments_module_1 = require("./treatments/treatments.module");
const harvests_module_1 = require("./harvests/harvests.module");
const feed_products_module_1 = require("./feed-products/feed-products.module");
const feeding_tray_checks_module_1 = require("./feeding-tray-checks/feeding-tray-checks.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => {
                    const type = configService.get('DB_TYPE') || 'postgres';
                    const common = {
                        autoLoadEntities: true,
                        synchronize: true,
                    };
                    if (type === 'sqlite') {
                        return {
                            ...common,
                            type: 'sqlite',
                            database: configService.get('DB_NAME') || ':memory:',
                            dropSchema: true,
                        };
                    }
                    return {
                        ...common,
                        type: 'postgres',
                        url: configService.get('DATABASE_URL'),
                    };
                },
                inject: [config_1.ConfigService],
            }),
            profiles_module_1.ProfilesModule,
            farms_module_1.FarmsModule,
            auth_module_1.AuthModule,
            ponds_module_1.PondsModule,
            crops_module_1.CropsModule,
            water_quality_module_1.WaterQualityModule,
            feed_records_module_1.FeedRecordsModule,
            shrimp_calculations_module_1.ShrimpCalculationsModule,
            transactions_module_1.TransactionsModule,
            inventory_module_1.InventoryModule,
            news_module_1.NewsModule,
            alerts_module_1.AlertsModule,
            products_module_1.ProductsModule,
            simulations_module_1.SimulationsModule,
            harvest_plans_module_1.HarvestPlansModule,
            chemical_module_1.ChemicalModule,
            plankton_module_1.PlanktonModule,
            microbiology_module_1.MicrobiologyModule,
            mortality_module_1.MortalityModule,
            disease_module_1.DiseaseModule,
            reference_module_1.ReferenceModule,
            sampling_module_1.SamplingModule,
            treatments_module_1.TreatmentsModule,
            harvests_module_1.HarvestsModule,
            feed_products_module_1.FeedProductsModule,
            feeding_tray_checks_module_1.FeedingTrayChecksModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map