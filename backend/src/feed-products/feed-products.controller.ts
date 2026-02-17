import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { FeedProductsService } from './feed-products.service';
import { CreateFeedProductDto } from './dto/create-feed-product.dto';
import { UpdateFeedProductDto } from './dto/update-feed-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('feed-products')
@UseGuards(JwtAuthGuard)
export class FeedProductsController {
    constructor(private readonly feedProductsService: FeedProductsService) { }

    @Post()
    create(@Body() createDto: CreateFeedProductDto) {
        return this.feedProductsService.create(createDto);
    }

    @Get()
    findAll() {
        return this.feedProductsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.feedProductsService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: UpdateFeedProductDto) {
        return this.feedProductsService.update(id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.feedProductsService.remove(id);
    }
}
