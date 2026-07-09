import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NewsService } from './news.service';
import { CreateNewsArticleDto } from './dto/create-news-article.dto';
import { UpdateNewsArticleDto } from './dto/update-news-article.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles.enum';

// News is operator-published content shown to every tenant — reads open,
// writes admin-only. RolesGuard no-ops on the read routes (no @Roles metadata).
@Controller('news')
@UseGuards(RolesGuard)
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN)
  create(@Body() createDto: CreateNewsArticleDto) {
    return this.newsService.create(createDto);
  }

  @Get()
  findAll(@Query('category') category?: string) {
    return this.newsService.findAll(category);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.newsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() updateDto: UpdateNewsArticleDto) {
    return this.newsService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.newsService.remove(id);
  }
}
