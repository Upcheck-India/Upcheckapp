import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedProductsService } from './feed-products.service';
import { FeedProductsController } from './feed-products.controller';
import { FeedProduct } from './feed-product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FeedProduct])],
  controllers: [FeedProductsController],
  providers: [FeedProductsService],
  exports: [FeedProductsService],
})
export class FeedProductsModule {}
