import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: true, // TODO: Disable in production
      }),
      inject: [ConfigService],
    }),
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
