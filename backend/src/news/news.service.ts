import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NewsArticle } from './news-article.entity';
import { CreateNewsArticleDto } from './dto/create-news-article.dto';
import { UpdateNewsArticleDto } from './dto/update-news-article.dto';

@Injectable()
export class NewsService {
    constructor(
        @InjectRepository(NewsArticle)
        private articlesRepository: Repository<NewsArticle>,
    ) { }

    create(createDto: CreateNewsArticleDto) {
        const article = this.articlesRepository.create(createDto);
        return this.articlesRepository.save(article);
    }

    findAll(category?: string) {
        const where: any = { isActive: true };
        if (category) where.category = category;
        return this.articlesRepository.find({
            where,
            order: { publishedAt: 'DESC' },
        });
    }

    findOne(id: string) {
        return this.articlesRepository.findOneBy({ id });
    }

    async update(id: string, updateDto: UpdateNewsArticleDto) {
        await this.articlesRepository.update(id, updateDto);
        return this.findOne(id);
    }

    remove(id: string) {
        return this.articlesRepository.delete(id);
    }
}
