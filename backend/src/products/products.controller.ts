import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    @Post()
    create(@Body() createDto: CreateProductDto) {
        return this.productsService.create(createDto);
    }

    @Get()
    findAll(@Query('category') category?: string) {
        return this.productsService.findAll(category);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.productsService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: UpdateProductDto) {
        return this.productsService.update(id, updateDto);
    }

    @Patch(':id/stock')
    updateStock(@Param('id') id: string, @Body('quantity') quantity: number) {
        return this.productsService.updateStock(id, quantity);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.productsService.remove(id);
    }
}
