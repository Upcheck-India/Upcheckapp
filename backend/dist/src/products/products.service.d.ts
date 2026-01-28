import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
export declare class ProductsService {
    private productsRepository;
    constructor(productsRepository: Repository<Product>);
    create(createDto: CreateProductDto): Promise<Product>;
    findAll(category?: string): Promise<Product[]>;
    findOne(id: string): Promise<Product | null>;
    update(id: string, updateDto: UpdateProductDto): Promise<Product | null>;
    remove(id: string): Promise<import("typeorm").DeleteResult>;
    updateStock(id: string, quantity: number): Promise<Product | null>;
}
