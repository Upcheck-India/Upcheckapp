import { Repository } from 'typeorm';
import { NewsArticle } from './news-article.entity';
import { CreateNewsArticleDto } from './dto/create-news-article.dto';
import { UpdateNewsArticleDto } from './dto/update-news-article.dto';
export declare class NewsService {
    private articlesRepository;
    constructor(articlesRepository: Repository<NewsArticle>);
    create(createDto: CreateNewsArticleDto): Promise<NewsArticle>;
    findAll(category?: string): Promise<NewsArticle[]>;
    findOne(id: string): Promise<NewsArticle | null>;
    update(id: string, updateDto: UpdateNewsArticleDto): Promise<NewsArticle | null>;
    remove(id: string): Promise<import("typeorm").DeleteResult>;
}
