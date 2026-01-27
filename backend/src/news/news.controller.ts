import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { NewsService } from './news.service';
import { CreateNewsArticleDto } from './dto/create-news-article.dto';
import { UpdateNewsArticleDto } from './dto/update-news-article.dto';

@Controller('news')
export class NewsController {
    constructor(private readonly newsService: NewsService) { }

    @Post()
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
    update(@Param('id') id: string, @Body() updateDto: UpdateNewsArticleDto) {
        return this.newsService.update(id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.newsService.remove(id);
    }
}
