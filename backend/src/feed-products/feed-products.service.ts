import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeedProduct } from './feed-product.entity';
import { CreateFeedProductDto } from './dto/create-feed-product.dto';
import { UpdateFeedProductDto } from './dto/update-feed-product.dto';

@Injectable()
export class FeedProductsService {
  constructor(
    @InjectRepository(FeedProduct)
    private productsRepository: Repository<FeedProduct>,
  ) {}

  create(createDto: CreateFeedProductDto) {
    const record = this.productsRepository.create(createDto);
    return this.productsRepository.save(record);
  }

  findAll() {
    return this.productsRepository.find({
      order: { brand: 'ASC', code: 'ASC' },
    });
  }

  findOne(id: string) {
    return this.productsRepository.findOneBy({ id });
  }

  async update(id: string, updateDto: UpdateFeedProductDto) {
    await this.productsRepository.update(id, updateDto);
    return this.findOne(id);
  }

  remove(id: string) {
    return this.productsRepository.delete(id);
  }
}
