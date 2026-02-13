import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './supabase/supabase.module';
import { ProfilesModule } from './profiles/profiles.module';
import { FarmsModule } from './farms/farms.module';
import { AuthModule } from './auth/auth.module';
import { PondsModule } from './ponds/ponds.module';
import { CropsModule } from './crops/crops.module';
import { WaterQualityModule } from './water-quality/water-quality.module';
import { FeedRecordsModule } from './feed-records/feed-records.module';
import { ShrimpCalculationsModule } from './shrimp-calculations/shrimp-calculations.module';
import { TransactionsModule } from './transactions/transactions.module';
import { InventoryModule } from './inventory/inventory.module';
import { NewsModule } from './news/news.module';
import { AlertsModule } from './alerts/alerts.module';
import { ProductsModule } from './products/products.module';
import { SimulationsModule } from './simulations/simulations.module';
import { HarvestPlansModule } from './harvest-plans/harvest-plans.module';
import { ChemicalModule } from './chemical/chemical.module';
import { PlanktonModule } from './plankton/plankton.module';
import { MicrobiologyModule } from './microbiology/microbiology.module';
import { MortalityModule } from './mortality/mortality.module';
import { DiseaseModule } from './disease/disease.module';
import { ReferenceModule } from './reference/reference.module';
import { SamplingModule } from './sampling/sampling.module';
import { TreatmentsModule } from './treatments/treatments.module';
import { HarvestsModule } from './harvests/harvests.module';
import { FeedProductsModule } from './feed-products/feed-products.module';
import { FeedingTrayChecksModule } from './feeding-tray-checks/feeding-tray-checks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 60,
    }]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
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
          url: configService.get<string>('DATABASE_URL'),
          ssl: { rejectUnauthorized: false },
        };
      },
      inject: [ConfigService],
    }),
    SupabaseModule,
    ProfilesModule,
    FarmsModule,
    AuthModule,
    PondsModule,
    CropsModule,
    WaterQualityModule,
    FeedRecordsModule,
    ShrimpCalculationsModule,
    TransactionsModule,
    InventoryModule,
    NewsModule,
    AlertsModule,
    ProductsModule,
    SimulationsModule,
    HarvestPlansModule,
    ChemicalModule,
    PlanktonModule,
    MicrobiologyModule,
    MortalityModule,
    DiseaseModule,
    ReferenceModule,
    SamplingModule,
    TreatmentsModule,
    HarvestsModule,
    FeedProductsModule,
    FeedingTrayChecksModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
