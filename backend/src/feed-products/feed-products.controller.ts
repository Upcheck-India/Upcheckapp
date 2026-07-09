import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { FeedProductsService } from './feed-products.service';
import { CreateFeedProductDto } from './dto/create-feed-product.dto';
import { UpdateFeedProductDto } from './dto/update-feed-product.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles.enum';

// Shared feed-product catalog: reads open to all, writes admin-only so one
// farmer cannot mutate/wipe reference data used by every tenant.
@Controller('feed-products')
export class FeedProductsController {
  constructor(private readonly feedProductsService: FeedProductsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
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
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() updateDto: UpdateFeedProductDto) {
    return this.feedProductsService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.feedProductsService.remove(id);
  }
}
