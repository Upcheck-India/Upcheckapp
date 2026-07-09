import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
  ) {}

  create(createDto: CreateProductDto) {
    const product = this.productsRepository.create(createDto);
    return this.productsRepository.save(product);
  }

  findAll(category?: string) {
    const where: any = { isActive: true };
    if (category) where.category = category;
    return this.productsRepository.find({ where });
  }

  findOne(id: string) {
    return this.productsRepository.findOneBy({ id });
  }

  async update(id: string, updateDto: UpdateProductDto) {
    await this.productsRepository.update(id, updateDto);
    return this.findOne(id);
  }

  remove(id: string) {
    return this.productsRepository.delete(id);
  }

  async updateStock(id: string, quantity: number) {
    await this.productsRepository.update(id, { stock: quantity });
    return this.findOne(id);
  }
}
