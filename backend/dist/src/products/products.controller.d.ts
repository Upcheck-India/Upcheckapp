import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    create(createDto: CreateProductDto): Promise<import("./product.entity").Product>;
    findAll(category?: string): Promise<import("./product.entity").Product[]>;
    findOne(id: string): Promise<import("./product.entity").Product | null>;
    update(id: string, updateDto: UpdateProductDto): Promise<import("./product.entity").Product | null>;
    updateStock(id: string, quantity: number): Promise<import("./product.entity").Product | null>;
    remove(id: string): Promise<import("typeorm").DeleteResult>;
}
